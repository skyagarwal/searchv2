#!/usr/bin/env node
/*
  Lightweight CDC consumer: reads Debezium events from Redpanda and mirrors into OpenSearch
  - Topics: mangwale.mangwale.items, mangwale.mangwale.stores, mangwale.mangwale.categories
  - Upsert on c,u; delete on d
  - Enrich items with store_location (from stores topic cache) and category_name (from categories cache)
*/

const { Kafka } = require('kafkajs');
const { Client } = require('@opensearch-project/opensearch');
require('dotenv').config();

// Set KAFKA_BROKER=localhost:9092 when running on host; inside docker, use service DNS (e.g., redpanda:9092)
const KAFKA_BROKER = process.env.KAFKA_BROKER || 'localhost:9092';
const GROUP_ID = process.env.CDC_GROUP_ID || 'cdc-osync';
const OS_NODE = process.env.OPENSEARCH_HOST || 'http://localhost:9200';

const kafka = new Kafka({ brokers: [KAFKA_BROKER] });
const consumer = kafka.consumer({ groupId: GROUP_ID });
const os = new Client({ node: OS_NODE, ssl: { rejectUnauthorized: false } });

const TOPICS = {
  items: 'mangwale.migrated_db.items',
  stores: 'mangwale.migrated_db.stores',
  categories: 'mangwale.migrated_db.categories',
};

// In-memory caches for enrichment
const storeCache = new Map(); // store_id -> { lat, lon, name }
const categoryCache = new Map(); // id -> { name }

function decodeBase64Decimal(val) {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    // Check if it looks like base64 (simple heuristic or just try)
    // If it's a plain number string "123.45", parseFloat handles it.
    // If it's "JxA=", parseFloat is NaN.
    const f = parseFloat(val);
    if (!isNaN(f) && val.indexOf('=') === -1) return f;

    try {
      const buf = Buffer.from(val, 'base64');
      if (buf.length === 0) return 0;
      // Simple Big-Endian unsigned integer parsing
      const hex = buf.toString('hex');
      const intVal = parseInt(hex, 16);
      // ASSUMPTION: Debezium default scale for DECIMAL is often 2 for currency
      // If the value is huge, this might be wrong, but for "price" it's likely scale 2.
      return intVal / 100.0;
    } catch (e) {
      return 0;
    }
  }
  return 0;
}

function coerceBoolean(v) {
  if (v === null || v === undefined) return v;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  const s = String(v).toLowerCase();
  if (s === 'true' || s === '1') return true;
  if (s === 'false' || s === '0') return false;
  return v;
}

function toDocFromItem(after) {
  if (!after) return null;
  const doc = { ...after };
  // Normalize fields similar to bulk indexer
  doc.veg = coerceBoolean(doc.veg);
  
  // Fix Base64 decimals
  doc.price = decodeBase64Decimal(doc.price);
  doc.tax = decodeBase64Decimal(doc.tax);
  doc.discount = decodeBase64Decimal(doc.discount);

  // category_ids normalization
  if (doc.category_ids) {
    try {
      const val = typeof doc.category_ids === 'string' ? JSON.parse(doc.category_ids) : doc.category_ids;
      doc.category_ids = Array.isArray(val) ? val.map(String) : [];
    } catch { doc.category_ids = []; }
  }
  // images normalization
  if (doc.images) {
    try {
      const val = typeof doc.images === 'string' ? JSON.parse(doc.images) : doc.images;
      doc.images = Array.isArray(val) ? val : [];
    } catch { doc.images = []; }
  }
  // rating normalization (keep primitive)
  if (doc.rating && typeof doc.rating === 'object') {
    doc.rating = String(doc.rating.overall ?? '');
  }
  // Enrich store location
  if (doc.store_id != null) {
    const s = storeCache.get(doc.store_id);
    if (s && s.lat != null && s.lon != null) {
      doc.store_location = { lat: Number(s.lat), lon: Number(s.lon) };
    }
    // ✨ Enrich store name and delivery_time
    if (s && s.name) doc.store_name = s.name;
    if (s && s.delivery_time) doc.delivery_time = s.delivery_time;
    // ✨ Enrich zone_id
    if (s && s.zone_id) doc.zone_id = s.zone_id;
  }
  // Enrich category name
  if (doc.category_id != null) {
    const c = categoryCache.get(doc.category_id);
    if (c && c.name) doc.category_name = c.name;
  }
  return doc;
}

async function upsert(index, id, doc) {
  await os.index({ index, id: String(id), body: doc, refresh: 'true' });
}
async function remove(index, id) {
  try { await os.delete({ index, id: String(id), refresh: 'true' }); } catch (e) {
    if (e?.body?.result === 'not_found') return; throw e;
  }
}

function parseRecord(message) {
  try {
    return JSON.parse(message.value.toString('utf8'));
  } catch (e) {
    return null;
  }
}

async function run() {
  await consumer.connect();
  await consumer.subscribe({ topic: TOPICS.items, fromBeginning: true });
  await consumer.subscribe({ topic: TOPICS.stores, fromBeginning: true });
  await consumer.subscribe({ topic: TOPICS.categories, fromBeginning: true });

  await consumer.run({
    autoCommit: true,
    partitionsConsumedConcurrently: 3,
    eachMessage: async ({ topic, message }) => {
      const evt = parseRecord(message);
      if (!evt || !evt.payload) return;
      const { op, after, before } = evt.payload; // c,u,d,r
  if (topic === TOPICS.stores) {
        if (op === 'd') {
          const id = before?.id ?? before?.store_id;
          if (id != null) {
            storeCache.delete(id);
    await remove('food_stores', id);
    await remove('ecom_stores', id);
          }
          return;
        }
        const s = after || before;
        if (!s) return;
        const id = s.id ?? s.store_id;
    // Cache always; used for both modules
    storeCache.set(id, { 
      lat: s.latitude ?? s.lat, 
      lon: s.longitude ?? s.lon, 
      name: s.name,
      delivery_time: s.delivery_time,
      zone_id: s.zone_id // ✨ ADD zone_id to cache
    });
    // mirror to OS per-module (strip PII)
        const { phone, email, account_no, account_name, ifsc_code, alternative_number, ...rest } = s;
        const doc = { ...rest, location: { lat: Number(s.latitude), lon: Number(s.longitude) } };
        
        // Fix Base64 decimals for stores
        doc.minimum_order = decodeBase64Decimal(doc.minimum_order);
        doc.comission = decodeBase64Decimal(doc.comission);
        doc.tax = decodeBase64Decimal(doc.tax);
        doc.minimum_shipping_charge = decodeBase64Decimal(doc.minimum_shipping_charge);
        doc.maximum_shipping_charge = decodeBase64Decimal(doc.maximum_shipping_charge);
        doc.per_km_shipping_charge = decodeBase64Decimal(doc.per_km_shipping_charge);

    const mod = s.module_id != null ? Number(s.module_id) : undefined;
    if (mod === 4) await upsert('food_stores', id, doc);
    if (mod === 5) await upsert('ecom_stores', id, doc);
        return;
      }
      if (topic === TOPICS.categories) {
        if (op === 'd') {
          const id = before?.id;
      if (id != null) categoryCache.delete(id);
          return;
        }
  const c = after || before;
        if (!c) return;
  const modc = c.module_id != null ? Number(c.module_id) : undefined;
  if (modc !== 4 && modc !== 5) return;
  categoryCache.set(c.id, { name: c.name });
    // mirror per module
    if (modc === 4) await upsert('food_categories', c.id, c);
    if (modc === 5) await upsert('ecom_categories', c.id, c);
        return;
      }
      // items
      if (topic === TOPICS.items) {
        if (op === 'd') {
          const id = before?.id;
      if (id != null) { await remove('food_items', id); await remove('ecom_items', id); }
          return;
        }
        const row = after || before;
        if (!row) return;
  const modi = row.module_id != null ? Number(row.module_id) : undefined;
  if (modi !== 4 && modi !== 5) return;
        const id = row.id;
        const doc = toDocFromItem(row);
    if (modi === 4) await upsert('food_items', id, doc);
    if (modi === 5) await upsert('ecom_items', id, doc);
        return;
      }
    },
  });
}

run().catch(err => {
  console.error('CDC sync failed', err);
  process.exit(1);
});
