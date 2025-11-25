import React, { useEffect, useMemo, useRef, useState } from 'react'

// Module ID mapping based on database
const MODULES = {
  FOOD: { id: 4, name: 'Food', key: 'food' },
  SHOP: { id: 5, name: 'Shop', key: 'ecom' },
  LOCAL_DELIVERY: { id: 3, name: 'Local Delivery', key: 'services' },
  // Add more as needed
} as const

type ModuleKey = 'food' | 'ecom' | 'rooms' | 'services' | 'movies'

// Helper to convert module key to module_id
const getModuleId = (key: ModuleKey): number => {
  switch(key) {
    case 'food': return 4
    case 'ecom': return 5
    case 'services': return 3
    case 'rooms': return 6  // Tiffin's or another module
    case 'movies': return 8  // 24 ???? or another module
    default: return 4
  }
}

type SuggestResp = {
  items: Array<{ id: string; name: string; price?: number | string; store_name?: string }>
  stores: Array<{ id: string; name: string }>
  categories: Array<{ id: string; name: string }>
}

type SearchItem = {
  id: string
  name: string
  title?: string
  price?: number
  veg?: number | boolean
  category_id?: string | number
  category_name?: string
  category?: string
  store_id?: string | number
  store_name?: string
  distance_km?: number
  avg_rating?: number
  base_price?: number
  genre?: string
  cast?: string | string[]
}

type Facets = {
  category_id?: Array<{ value: string | number; count: number; label?: string }>
  brand?: Array<{ value: string; count: number }>
  veg?: Array<{ value: number; count: number }>
  genre?: Array<{ value: string; count: number }>
  category?: Array<{ value: string; count: number }>
}

type SearchResp = {
  items: SearchItem[]
  stores?: Array<{ id: string; name: string; distance_km?: number; rating?: number; category?: string; module?: string; theater_name?: string }>
  facets?: Facets
  meta: { total: number; page: number; size: number }
}

type TrendingItem = { term: string; count: number }

const API = {
  suggest: (moduleId: number, q: string, geo?: { lat?: number; lon?: number }) => {
    const params = new URLSearchParams({ q, module_id: String(moduleId) })
    if (geo?.lat != null) params.append('lat', String(geo.lat))
    if (geo?.lon != null) params.append('lon', String(geo.lon))
    return fetch(`/v2/search/suggest?${params.toString()}`).then(r=>r.json() as Promise<SuggestResp>)
  },
  searchItems: (moduleId: number, params: Record<string, any>) => {
    const allParams = { ...params, module_id: moduleId }
    return fetch(`/v2/search/items?${new URLSearchParams(allParams as any).toString()}`).then(r=>r.json() as Promise<SearchResp>)
  },
  searchStores: (moduleId: number, params: Record<string, any>) => {
    const allParams = { ...params, module_id: moduleId }
    return fetch(`/v2/search/stores?${new URLSearchParams(allParams as any).toString()}`).then(r=>r.json())
  },
  recommendations: (itemId: string, moduleId: number, storeId?: string, limit: number = 5) => {
    const params = new URLSearchParams({ module_id: String(moduleId), limit: String(limit) })
    if (storeId) params.append('store_id', storeId)
    return fetch(`/search/recommendations/${itemId}?${params.toString()}`).then(r=>r.json())
  },
  trending: (moduleId: number, window='7d', time_of_day?: string) =>
    fetch(`/analytics/trending?module_id=${moduleId}&window=${window}${time_of_day?`&time_of_day=${time_of_day}`:''}`).then(r=>r.json() as Promise<TrendingItem[]>),
  asr: async (blob: Blob) => {
    const fd = new FormData()
    fd.append('audio', blob, 'audio.webm')
    const res = await fetch('/search/asr', { method: 'POST', body: fd })
    if (!res.ok) throw new Error('ASR failed')
    return res.json() as Promise<{ transcript?: string; text?: string }>
  },
  agent: async (prompt: string, params: Record<string, any>) => {
    const qs = new URLSearchParams({ q: prompt, ...Object.fromEntries(Object.entries(params).filter(([,v])=> v!=='' && v!=null)) } as any)
    const res = await fetch(`/search/agent?${qs.toString()}`)
    if (!res.ok) throw new Error('Agent failed')
    return res.json() as Promise<{ plan?: any; result?: any }>
  }
}

function useDebounced<T>(value: T, delay=200) {
  const [v, setV] = useState(value)
  useEffect(()=>{ const t=setTimeout(()=>setV(value), delay); return ()=>clearTimeout(t)}, [value, delay])
  return v
}

export default function App() {
  const [module, setModule] = useState<ModuleKey>(()=> (localStorage.getItem('mw_module') as ModuleKey) || 'food')
  const [q, setQ] = useState('')
  const qDeb = useDebounced(q, 250)
  const [history, setHistory] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('mw_history')||'[]') } catch { return [] }
  })
  const [listening, setListening] = useState(false)
  // Voice UX state
  const [voiceState, setVoiceState] = useState<'idle'|'listening'|'processing'|'error'>('idle')
  const [voiceMsg, setVoiceMsg] = useState<string>('')
  const [voiceSeconds, setVoiceSeconds] = useState<number>(0)
  const ariaLiveRef = useRef<HTMLDivElement|null>(null)
  const [trending, setTrending] = useState<string[]>([])
  const [lat, setLat] = useState<number | ''>(()=>{ const v=localStorage.getItem('mw_lat'); return v? Number(v):'' })
  const [lon, setLon] = useState<number | ''>(()=>{ const v=localStorage.getItem('mw_lon'); return v? Number(v):'' })
  const [radius, setRadius] = useState<number>(()=>{ const v=localStorage.getItem('mw_radius'); return v? Number(v):5 })
  const [openNow, setOpenNow] = useState(false)
  const [vegFilter, setVegFilter] = useState<'all' | 'veg' | 'non-veg'>('all')
  const [ratingMin, setRatingMin] = useState<number | ''>('')
  const [priceMin, setPriceMin] = useState<number | ''>('')
  const [priceMax, setPriceMax] = useState<number | ''>('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [brands, setBrands] = useState<string[]>([])
  const [storeId, setStoreId] = useState<string>('')
  const [storeIds, setStoreIds] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<string>('') // distance, price_asc, price_desc, rating, popularity
  const [activeTab, setActiveTab] = useState<'items'|'stores'>('items')

  const [suggest, setSuggest] = useState<SuggestResp | null>(null)
  const [searchResp, setSearchResp] = useState<SearchResp | null>(null)
  const [storesResp, setStoresResp] = useState<any>(null)
  const [recommendations, setRecommendations] = useState<any>(null)
  const [selectedItemForRecs, setSelectedItemForRecs] = useState<string | null>(null)
  const [showSuggest, setShowSuggest] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searchMode, setSearchMode] = useState<'normal'|'agent'>('normal')
  const [agentPlan, setAgentPlan] = useState<any|null>(null)
  const mediaRecorderRef = useRef<any|null>(null)
  const mediaStreamRef = useRef<MediaStream|null>(null)
  const speechRecRef = useRef<any|null>(null)
  const voiceCanceledRef = useRef<boolean>(false)

  // Beep helper
  const playBeep = (freq=880, durationMs=120, type: OscillatorType='sine', volume=0.08) => {
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = type
      o.frequency.value = freq
      g.gain.value = volume
      o.connect(g).connect(ctx.destination)
      o.start()
      setTimeout(()=>{ o.stop(); ctx.close() }, durationMs)
    } catch {}
  }

  const announce = (msg: string) => {
    setVoiceMsg(msg)
    // update aria-live politely
    if (ariaLiveRef.current) ariaLiveRef.current.textContent = msg
  }

  // Listening timer
  useEffect(()=>{
    if (voiceState !== 'listening') { setVoiceSeconds(0); return }
    const t = setInterval(()=> setVoiceSeconds(s=>s+1), 1000)
    return ()=> clearInterval(t)
  }, [voiceState])

  useEffect(()=>{
    return ()=> { voiceCanceledRef.current = true }
  }, [])

  useEffect(()=>{
    if (qDeb.length>=1) {
      API.suggest(getModuleId(module), qDeb, { lat: Number(lat)||undefined, lon: Number(lon)||undefined }).then(setSuggest).catch(()=>{})
    } else setSuggest(null)
  }, [qDeb, module, lat, lon])

  useEffect(()=>{ 
    const prev = localStorage.getItem('mw_module') as ModuleKey | null
    localStorage.setItem('mw_module', module)
    // When switching modules, reset filters that don't apply
    if (prev && prev !== module) {
      // Veg only applies to food/ecom
      if (!(module==='food' || module==='ecom')) setVegFilter('all')
      // Open now only for food
      if (module!=='food') setOpenNow(false)
      // Brand only for ecom
      if (module!=='ecom') setBrands([])
      // Category id is reused but target field differs; clear selection to avoid stale filters
      setCategoryId('')
    }
  }, [module])
  useEffect(()=>{ if(lat!=='' ) localStorage.setItem('mw_lat', String(lat)); else localStorage.removeItem('mw_lat') }, [lat])
  useEffect(()=>{ if(lon!=='' ) localStorage.setItem('mw_lon', String(lon)); else localStorage.removeItem('mw_lon') }, [lon])
  useEffect(()=>{ localStorage.setItem('mw_radius', String(radius)) }, [radius])

  useEffect(()=>{
    if (searchMode!=='normal') return
    const params: Record<string, any> = { q: qDeb, page: 1, size: 20 }
    
    // Enhanced veg/non-veg filtering: only for food & ecom
    if ((module==='food' || module==='ecom') && vegFilter !== 'all') {
      params.veg = vegFilter === 'veg' ? '1' : '0'
    }
    
    if (openNow && module==='food') params.open_now=1
    if (ratingMin!=='') params.rating_min=ratingMin
    if (priceMin!=='') params.price_min=priceMin
    if (priceMax!=='') params.price_max=priceMax
    // Map categories per module
    if (categoryId) {
      if (module==='food' || module==='ecom') params.category_id = categoryId
      else if (module==='services') params.category = categoryId
      else if (module==='movies') params.genre = categoryId
    }
    if (storeId) params.store_id = storeId
    if (storeIds.length > 0) params.store_ids = storeIds.join(',')
    if (sortBy) params.sort = sortBy
  if (lat!=='' && lon!=='') { params.lat=lat; params.lon=lon; params.radius_km=radius }
  if (module==='ecom' && brands.length>0) params.brand = brands.join(',')

    setLoading(true)
    if (activeTab==='items') {
      API.searchItems(getModuleId(module), params).then(d=>{ setSearchResp(d); setLoading(false) }).catch(()=>setLoading(false))
    } else {
      API.searchStores(getModuleId(module), params).then(d=>{ setStoresResp(d); setLoading(false) }).catch(()=>setLoading(false))
    }
  }, [qDeb, module, vegFilter, openNow, ratingMin, priceMin, priceMax, categoryId, lat, lon, radius, activeTab, searchMode, storeId, storeIds, sortBy])

  const onSelectSuggestion = (text: string) => {
  setQ(text); setShowSuggest(false); setSearchMode('normal'); setAgentPlan(null)
    setHistory((h: string[])=>{
      const nh = [text, ...h.filter((x: string)=>x!==text)].slice(0,8)
      localStorage.setItem('mw_history', JSON.stringify(nh))
      return nh
    })
  }

  const removeHistory = (text: string) => setHistory((h: string[])=>{
    const nh = h.filter((x: string)=>x!==text); localStorage.setItem('mw_history', JSON.stringify(nh)); return nh
  })
  const clearHistory = () => { setHistory([]); localStorage.removeItem('mw_history') }

  const facetCategories = (searchResp?.facets?.category_id || []).map(fc => ({ key: String(fc.value), name: fc.label, doc_count: fc.count }))
  const facetBrands = (module==='ecom' ? (searchResp?.facets?.brand || []) : [])
  const facetVeg = (searchResp?.facets?.veg || [])
  const facetGenres = (module==='movies' ? (searchResp?.facets?.genre || []) : [])
  const facetServiceCategories = (module==='services' ? (searchResp?.facets?.category || []) : [])

  return (
    <div className="container">
      <div className="header">
        <div className="header-inner">
          <div className="back">⌫</div>
          <div className="segmented">
            <div className={"seg "+(module==='food'?'active':'')} onClick={()=>setModule('food')}>Food</div>
            <div className={"seg "+(module==='ecom'?'active':'')} onClick={()=>setModule('ecom')}>Shop</div>
            <div className={"seg "+(module==='rooms'?'active':'')} onClick={()=>setModule('rooms')}>Rooms</div>
            <div className={"seg "+(module==='services'?'active':'')} onClick={()=>setModule('services')}>Services</div>
            <div className={"seg "+(module==='movies'?'active':'')} onClick={()=>setModule('movies')}>Movies</div>
          </div>
          <div className="searchbar suggest-box">
            <span>🔎</span>
            <input placeholder={
              module==='food' ? 'Search your desired foods or restaurants' :
              module==='ecom' ? 'Search your desired items or stores' :
              module==='rooms' ? 'Search rooms or hotels' :
              module==='services' ? 'Search services (spa, repair...)' :
              'Search movies or theatres'
            } value={q} onChange={e=>{ setQ(e.target.value); setSearchMode('normal'); setAgentPlan(null) }} onFocus={()=>setShowSuggest(true)} />
            {q && <div className="search-clear" onClick={()=>setQ('')}>×</div>}
            <div className={"icon-btn "+(listening?'rec pulse':'')} onClick={async()=>{
              // Try server ASR first; fallback to browser SpeechRecognition
              voiceCanceledRef.current = false
              const runAgent = async (transcript: string)=>{
                if (voiceCanceledRef.current) return
                setQ(transcript)
                const params: Record<string, any> = {}
                if (lat!=='' && lon!=='') { params.lat=lat; params.lon=lon; params.radius_km=radius }
                if (vegFilter !== 'all') params.veg = vegFilter === 'veg' ? '1' : '0'
                if (openNow && module==='food') params.open_now=1
                if (ratingMin!=='') params.rating_min=ratingMin
                if (priceMin!=='') params.price_min=priceMin
                if (priceMax!=='') params.price_max=priceMax
                if (categoryId) params.category_id=categoryId
                try {
                  setLoading(true)
                  const resp = await API.agent(transcript, params)
                  setAgentPlan(resp.plan||null)
                  setSearchMode('agent')
                  if (resp?.plan?.module && ['food','ecom','rooms','services','movies'].includes(resp.plan.module)) setModule(resp.plan.module)
                  if (resp?.result?.items) { setActiveTab('items'); setSearchResp(resp.result); setLoading(false) }
                  else if (resp?.result?.stores) { setActiveTab('stores'); setStoresResp(resp.result); setLoading(false) }
                  else { setLoading(false); setSearchMode('normal') }
                } catch {
                  setSearchMode('normal')
                  setAgentPlan(null)
                }
              }

              const useBrowserSR = async ()=>{
                const SR: any = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
                if (!SR) { alert('Speech recognition not supported.'); return }
                const rec = new SR(); rec.lang='en-IN'; rec.interimResults=false; rec.maxAlternatives=1
                setListening(true)
                setVoiceState('listening'); announce('Now speak')
                playBeep(900, 100, 'sine')
                rec.onresult = (e: any)=>{ if (voiceCanceledRef.current) { speechRecRef.current = null; return } const text = e.results?.[0]?.[0]?.transcript || ''; setListening(false); setVoiceState('processing'); announce('Processing…'); if (text) runAgent(text); setVoiceState('idle'); announce(''); speechRecRef.current = null }
                rec.onerror = ()=> { if (voiceCanceledRef.current) { speechRecRef.current = null; return } setListening(false); setVoiceState('error'); announce("Didn't catch that. Try again."); setTimeout(()=>{ setVoiceState('idle'); announce('') }, 1200); speechRecRef.current = null }
                rec.onend = ()=> { setListening(false); if (voiceState==='listening') { setVoiceState('idle'); announce('') }; speechRecRef.current = null }
                speechRecRef.current = rec
                rec.start()
              }

              try {
                const hasMedia = !!(navigator.mediaDevices && (window as any).MediaRecorder)
                if (!hasMedia) return await useBrowserSR()
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
                mediaStreamRef.current = stream
                const chunks: BlobPart[] = []
                const mime = (window as any).MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm'
                const mr = new (window as any).MediaRecorder(stream, { mimeType: mime })
                mediaRecorderRef.current = mr
                setListening(true)
                setVoiceState('listening'); announce('Now speak')
                playBeep(900, 100, 'sine')
                mr.ondataavailable = (e: any)=>{ if (e.data && e.data.size>0) chunks.push(e.data) }
                mr.onstop = async ()=>{
                  setListening(false)
                  setVoiceState('processing'); announce('Processing…')
                  try {
                    if (voiceCanceledRef.current) return
                    const blob = new Blob(chunks, { type: 'audio/webm' })
                    const { transcript, text } = await API.asr(blob)
                    if (voiceCanceledRef.current) return
                    const t = transcript || text || ''
                    if (t) { playBeep(600, 80, 'square'); await runAgent(t) }
                    else { if (voiceCanceledRef.current) return; setVoiceState('error'); announce("Didn't catch that. Try again."); setTimeout(()=>{ setVoiceState('idle'); announce('') }, 1200); await useBrowserSR() }
                  } catch {
                    if (!voiceCanceledRef.current) { setVoiceState('error'); announce('Network error. Trying device recognition…'); setTimeout(()=>{ setVoiceState('idle'); announce('') }, 800); await useBrowserSR() }
                  } finally {
                    stream.getTracks().forEach(t=>t.stop())
                    mediaStreamRef.current = null
                    mediaRecorderRef.current = null
                  }
                }
                mr.start()
                setTimeout(()=>{ if (mr.state==='recording') mr.stop() }, 4000)
              } catch {
                setVoiceState('error'); announce('Mic permission denied or unavailable.'); setTimeout(()=>{ setVoiceState('idle'); announce('') }, 1200)
                await useBrowserSR()
              }
            }}>🎤</div>
          </div>
        </div>
      </div>

      <div className="panel" style={{marginTop:12}}>
        {agentPlan && (
          <div className="toolbar" style={{marginBottom:8}}>
            <span className="meta">Agent plan: {agentPlan?.module} • {agentPlan?.target || 'items'}{agentPlan?.filters? ' • '+Object.entries(agentPlan.filters).map(([k,v])=>`${k}:${v}`).join(', '):''}</span>
            <button className="secondary" onClick={()=>{ setAgentPlan(null); setSearchMode('normal') }}>Clear</button>
          </div>
        )}
        <div className="toolbar">
          <button className="secondary" onClick={()=>{
            if (!('geolocation' in navigator)) { alert('Geolocation not supported'); return }
            navigator.geolocation.getCurrentPosition(pos=>{
              setLat(Number(pos.coords.latitude.toFixed(5)))
              setLon(Number(pos.coords.longitude.toFixed(5)))
            }, err=>{ alert('Location error: '+err.message) })
          }}>Use my location</button>
          <span className="warn">Set location to boost nearby results</span>
        </div>
        <div className="row" style={{marginTop:8}}>
          <label>Module</label>
          <select value={module} onChange={e=>setModule(e.target.value as ModuleKey)}>
            <option value="food">Food</option>
            <option value="ecom">E-com</option>
            <option value="rooms">Rooms</option>
            <option value="services">Services</option>
            <option value="movies">Movies</option>
          </select>

          <div style={{flex:1}} className="suggest-box">
            {/* placeholder input present in header */}
      {showSuggest && (
              <div className="suggest-list" onMouseDown={e=>e.preventDefault()}>
        {history.length>0 && (
                  <div className="group">
                    <div className="meta" style={{display:'flex', justifyContent:'space-between'}}>
                      <span>Your Last Search</span>
                      <a style={{cursor:'pointer'}} onClick={clearHistory}>Clear All</a>
                    </div>
                    {history.map(h=> (
                      <div className="item" key={'h-'+h} style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <span onClick={()=>onSelectSuggestion(h)}>{h}</span>
                        <a style={{cursor:'pointer'}} onClick={()=>removeHistory(h)}>×</a>
                      </div>
                    ))}
                  </div>
                )}
                {(suggest?.items && suggest.items.length>0) && (
                  <div className="group">
                    <div className="meta">Items</div>
          {suggest!.items.slice(0,6).map(it=> (
                      <div className="item" key={'i-'+it.id} onClick={()=>onSelectSuggestion(it.name)}>{it.name}</div>
                    ))}
                  </div>
                )}
                {(suggest?.stores && suggest.stores.length>0) && (
                  <div className="group">
                    <div className="meta">Stores</div>
          {suggest!.stores.slice(0,6).map(st=> (
                      <div className="item" key={'s-'+st.id} onClick={()=>onSelectSuggestion(st.name)}>{st.name}</div>
                    ))}
                  </div>
                )}
                {(suggest?.categories && suggest.categories.length>0) && (
                  <div className="group">
                    <div className="meta">Categories</div>
          {suggest!.categories.slice(0,6).map(c=> (
                      <div className="item" key={'c-'+c.id} onClick={()=>onSelectSuggestion(c.name)}>{c.name}</div>
                    ))}
                  </div>
                )}
        {qDeb && (!suggest || ((suggest.items?.length||0)+(suggest.stores?.length||0)+(suggest.categories?.length||0)===0)) && (
          <div className="group"><div className="meta">No suggestions available</div></div>
        )}
              </div>
            )}
          </div>

          <button className="secondary" onClick={()=>setShowSuggest(s=>!s)}>{showSuggest? 'Hide suggestions' : 'Show suggestions'}</button>
        </div>

        <div className="chips" style={{marginTop:8}}>
          {(module==='food' || module==='ecom') && (
            <>
              <div className={"chip "+(vegFilter==='all'?'active':'')} onClick={()=>setVegFilter('all')}>All</div>
              <div className={"chip "+(vegFilter==='veg'?'active':'')} onClick={()=>setVegFilter('veg')}>🟢 Veg</div>
              <div className={"chip "+(vegFilter==='non-veg'?'active':'')} onClick={()=>setVegFilter('non-veg')}>🔴 Non-Veg</div>
            </>
          )}
          {module==='food' && <div className={"chip "+(openNow?'active':'')} onClick={()=>setOpenNow(v=>!v)}>Open now</div>}
          {(module==='food' || module==='ecom') && (
            <div className={"chip "+(ratingMin===4?'active':'')} onClick={()=>setRatingMin(ratingMin===4?'':4)}>⭐ 4.0+</div>
          )}
          {(module==='food' || module==='ecom' || module==='services') && (
            <>
              <div className={"chip "+(priceMax===100?'active':'')} onClick={()=>{ setPriceMin(''); setPriceMax(priceMax===100?'':100) }}>Under ₹100</div>
              <div className={"chip "+(priceMin===100 && priceMax===300?'active':'')} onClick={()=>{ setPriceMin(100); setPriceMax(300) }}>₹100–₹300</div>
              <div className={"chip "+(priceMin===300 && priceMax===''?'active':'')} onClick={()=>{ setPriceMin(300); setPriceMax('') }}>₹300+</div>
            </>
          )}
          {!(module==='movies' && activeTab==='items') && (
            <>
              <div className={"chip "+(radius===2?'active':'')} onClick={()=>setRadius(2)}>2 km</div>
              <div className={"chip "+(radius===5?'active':'')} onClick={()=>setRadius(5)}>5 km</div>
              <div className={"chip "+(radius===10?'active':'')} onClick={()=>setRadius(10)}>10 km</div>
            </>
          )}
        </div>

        <div className="row" style={{marginTop:8}}>
          <div>
            <label>Latitude</label><br />
          {/* Voice overlay and ARIA live region */}
          <div aria-live="polite" aria-atomic="true" ref={ariaLiveRef} style={{position:'absolute', width:1, height:1, overflow:'hidden', clip:'rect(1px, 1px, 1px, 1px)'}}></div>
          {voiceState !== 'idle' && (
            <div className="voice-overlay" role="dialog" aria-modal="true" aria-label="Voice input">
              <div className="voice-card">
                <div className={"mic-circle "+(voiceState==='listening'?'active':'')}>🎤</div>
                <div style={{fontSize:18, fontWeight:600, marginTop:8}}>
                  {voiceState==='listening' ? 'Now speak' : voiceState==='processing' ? 'Processing…' : "Didn't catch that"}
                </div>
                <div className="meta" style={{marginTop:4}}>
                  {voiceState==='listening' ? `Listening${voiceSeconds>0? ' • '+voiceSeconds+'s':''}` : voiceState==='processing' ? 'Turning speech into text' : 'Please try again'}
                </div>
                <div className="voice-actions">
                  {voiceState==='listening' ? <span className="hint">We’ll stop automatically in ~4s</span> : <span className="hint">You can close this and type instead</span>}
                  <button className="secondary" onClick={()=>{ 
                    voiceCanceledRef.current = true
                    try { if (mediaRecorderRef.current && mediaRecorderRef.current.state==='recording') mediaRecorderRef.current.stop() } catch {}
                    try { if (speechRecRef.current) speechRecRef.current.stop() } catch {}
                    try { mediaStreamRef.current?.getTracks().forEach(t=>t.stop()) } catch {}
                    mediaRecorderRef.current = null; mediaStreamRef.current = null; speechRecRef.current = null
                    setListening(false); setVoiceState('idle'); announce(''); 
                  }}>Close</button>
                </div>
              </div>
            </div>
          )}

            <input type="text" inputMode="decimal" placeholder="e.g. 22.7196" value={lat} onChange={e=>setLat((e.target.value as any) as number|'' )} />
          </div>
          <div>
            <label>Longitude</label><br />
            <input type="text" inputMode="decimal" placeholder="e.g. 75.8577" value={lon} onChange={e=>setLon((e.target.value as any) as number|'' )} />
          </div>
          <div>
            <label>Radius (km)</label><br />
            <input type="range" min={1} max={20} value={radius} onChange={e=>setRadius(Number(e.target.value))} />
            <div className="meta">{radius} km</div>
          </div>
          {(module==='food' || module==='ecom') && (
            <div>
              <label>Veg/Non-Veg</label><br />
              <select value={vegFilter} onChange={e=>setVegFilter(e.target.value as 'all'|'veg'|'non-veg')}>
                <option value="all">All</option>
                <option value="veg">Veg Only</option>
                <option value="non-veg">Non-Veg Only</option>
              </select>
            </div>
          )}
          {module==='food' && (
            <div>
              <label>Open now</label><br />
              <input type="checkbox" checked={openNow} onChange={e=>setOpenNow(e.target.checked)} />
            </div>
          )}
          <div>
            <label>Rating min</label><br />
            <input type="number" min={0} max={5} step={0.1} value={ratingMin} onChange={e=>setRatingMin(e.target.value===''?'':Number(e.target.value))} />
          </div>
          <div>
            <label>Price min</label><br />
            <input type="number" min={0} step={1} value={priceMin} onChange={e=>setPriceMin(e.target.value===''?'':Number(e.target.value))} />
          </div>
          <div>
            <label>Price max</label><br />
            <input type="number" min={0} step={1} value={priceMax} onChange={e=>setPriceMax(e.target.value===''?'':Number(e.target.value))} />
          </div>
          <div>
            <label>Sort By</label><br />
            <select value={sortBy} onChange={e=>setSortBy(e.target.value)}>
              <option value="">Default</option>
              {lat!=='' && lon!=='' && <option value="distance">Distance (Nearest)</option>}
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating">Rating (Highest)</option>
              <option value="popularity">Popularity</option>
            </select>
          </div>
        </div>

        {/* Enhanced Veg/Non-Veg Facets from Search Results */}
        {(module==='food' || module==='ecom') && facetVeg.length > 0 && (
          <div style={{marginTop:8}}>
            <div className="meta">Dietary Options</div>
            <div className="chips">
              {facetVeg.map((f:any)=> (
                <div key={f.value} className={"chip "+(vegFilter===(f.value===1?'veg':'non-veg')?'active':'')} onClick={()=>setVegFilter(f.value===1?'veg':'non-veg')}>
                  {f.value === 1 ? '🟢 Veg' : '🔴 Non-Veg'} <span className="meta" style={{marginLeft:4}}>({f.count})</span>
                </div>
              ))}
              {vegFilter !== 'all' && <button className="secondary" onClick={()=>setVegFilter('all')}>Show All</button>}
            </div>
          </div>
        )}

        {/* Store Filtering */}
        {(module==='food' || module==='ecom') && suggest?.stores && suggest.stores.length > 0 && (
          <div style={{marginTop:8}}>
            <div className="meta">Filter by Store</div>
            <div className="row" style={{marginTop:6}}>
              <div style={{flex:1}}>
                <label>Single Store</label><br />
                <select value={storeId} onChange={e=>setStoreId(e.target.value)}>
                  <option value="">All Stores</option>
                  {suggest.stores.map(st => (
                    <option key={st.id} value={st.id}>{st.name}</option>
                  ))}
                </select>
              </div>
              {storeId && <button className="secondary" onClick={()=>setStoreId('')}>Clear</button>}
            </div>
            <div className="chips">
              {suggest.stores.slice(0,6).map(st => {
                const active = storeIds.includes(st.id)
                return (
                  <div key={st.id} className={"chip "+(storeId===st.id || active?'active':'')} onClick={()=>{
                    if (storeId === st.id) {
                      setStoreId('')
                    } else if (active) {
                      setStoreIds(prev => prev.filter(id => id !== st.id))
                    } else {
                      setStoreIds(prev => [...prev, st.id])
                      setStoreId('') // Clear single selection when multi-selecting
                    }
                  }}>
                    {st.name}
                  </div>
                )
              })}
              {storeIds.length > 0 && <button className="secondary" onClick={()=>setStoreIds([])}>Clear Multi</button>}
            </div>
          </div>
        )}

        {(module==='food' || module==='ecom') && (
          <div style={{marginTop:8}}>
            <div className="meta">Popular Categories</div>
            <div className="chips">
              {(facetCategories.length>0 ? facetCategories.slice(0,8) : [
                { key:'chinese', name:'Chinese', doc_count:0 },
                { key:'sweets', name:'Sweets', doc_count:0 },
                { key:'starters', name:'Starters', doc_count:0 },
                { key:'rolls', name:'Rolls', doc_count:0 },
                { key:'desserts', name:'Desserts', doc_count:0 },
                { key:'chaat', name:'Chaat', doc_count:0 },
                { key:'dairy', name:'Dairy product', doc_count:0 },
                { key:'frozen', name:'Frozen Foods', doc_count:0 },
                { key:'ready-to-eat', name:'Ready to Eat', doc_count:0 },
              ]).map((fc:any)=> (
                <div key={fc.key} className={"chip "+(String(categoryId)===String(fc.key)?'active':'')} onClick={()=>setCategoryId(String(fc.key))}>
                  {fc.name || fc.key}{fc.doc_count? <span className="meta" style={{marginLeft:4}}>({fc.doc_count})</span>: null}
                </div>
              ))}
              {categoryId && <button className="secondary" onClick={()=>setCategoryId('')}>Clear</button>}
            </div>
          </div>
        )}

        {/* Service Categories for Services Module */}
        {module==='services' && facetServiceCategories.length > 0 && (
          <div style={{marginTop:8}}>
            <div className="meta">Service Categories</div>
            <div className="row" style={{marginTop:6}}>
              <div>
                <label>Choose category</label><br />
                <select value={categoryId} onChange={e=>setCategoryId(e.target.value)}>
                  <option value="">All</option>
                  {facetServiceCategories.map((c:any)=> (
                    <option key={c.value} value={String(c.value)}>{c.value} ({c.count})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="chips">
              {facetServiceCategories.slice(0,8).map((c:any)=> (
                <div key={c.value} className={"chip "+(categoryId===String(c.value)?'active':'')} onClick={()=>setCategoryId(String(c.value))}>
                  {c.value} <span className="meta" style={{marginLeft:4}}>({c.count})</span>
                </div>
              ))}
              {categoryId && <button className="secondary" onClick={()=>setCategoryId('')}>Clear</button>}
            </div>
          </div>
        )}

        {/* Movie Genres for Movies Module */}
        {module==='movies' && facetGenres.length > 0 && (
          <div style={{marginTop:8}}>
            <div className="meta">Movie Genres</div>
            <div className="row" style={{marginTop:6}}>
              <div>
                <label>Choose genre</label><br />
                <select value={categoryId} onChange={e=>setCategoryId(e.target.value)}>
                  <option value="">All</option>
                  {facetGenres.map((g:any)=> (
                    <option key={g.value} value={String(g.value)}>{g.value} ({g.count})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="chips">
              {facetGenres.slice(0,8).map((g:any)=> (
                <div key={g.value} className={"chip "+(categoryId===String(g.value)?'active':'')} onClick={()=>setCategoryId(String(g.value))}>
                  {g.value} <span className="meta" style={{marginLeft:4}}>({g.count})</span>
                </div>
              ))}
              {categoryId && <button className="secondary" onClick={()=>setCategoryId('')}>Clear</button>}
            </div>
          </div>
        )}

        {module==='ecom' && (
          <div style={{marginTop:8}}>
            <div className="meta">Popular Brands</div>
            <div className="chips">
              {facetBrands.slice(0,12).map((b:any)=> {
                const active = brands.includes(b.value)
                return (
                  <div key={b.value} className={"chip "+(active?'active':'')} onClick={()=>{
                    setBrands(prev => active ? prev.filter(x=>x!==b.value) : [...prev, b.value])
                  }}>
                    {b.value} {b.count? <span className="meta" style={{marginLeft:4}}>({b.count})</span> : null}
                  </div>
                )
              })}
              {brands.length>0 && <button className="secondary" onClick={()=>setBrands([])}>Clear</button>}
            </div>
          </div>
        )}

        <div className="tabs">
          <div className={'tab '+(activeTab==='items'?'active':'')} onClick={()=>setActiveTab('items')}>Items</div>
          <div className={'tab '+(activeTab==='stores'?'active':'')} onClick={()=>setActiveTab('stores')}>Stores</div>
        </div>

        {activeTab==='items' ? (
          <div className="results">
            {loading && Array.from({length:6}).map((_,i)=>(
              <div className="card" key={'sk-i-'+i}>
                <div className="skeleton line" style={{width:'70%'}}></div>
                <div className="skeleton line" style={{width:'40%'}}></div>
                <div className="skeleton line" style={{width:'30%'}}></div>
              </div>
            ))}

            {/* Render Stores Section if available (Swiggy/Zomato style) */}
            {!loading && searchResp?.stores && searchResp.stores.length > 0 && (
              <div style={{marginBottom: 16}}>
                <div className="meta" style={{marginBottom: 8, fontWeight: 600, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.5px'}}>
                  {module === 'food' ? 'Restaurants' : 'Stores'}
                </div>
                <div style={{display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none'}}>
                  {searchResp.stores.map(st => (
                    <div className="card" key={'top-store-'+st.id} style={{minWidth: 220, maxWidth: 220, flexShrink: 0, border: '1px solid var(--primary)', background: '#f0f7ff'}}>
                      <div style={{fontWeight:600, fontSize: 15}}>{st.name || st.theater_name}</div>
                      <div style={{marginTop:6}}>
                        {st.distance_km!=null && <span className="pill" style={{background: 'white'}}>{Number(st.distance_km).toFixed(1)} km</span>}
                        {st.rating!=null && <span className="pill" style={{background: 'white'}}>⭐ {Number(st.rating).toFixed(1)}</span>}
                      </div>
                      <div className="meta" style={{marginTop: 4}}>{st.category || st.module}</div>
                    </div>
                  ))}
                </div>
                <div className="meta" style={{marginTop: 12, marginBottom: 8, fontWeight: 600, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.5px'}}>
                  {module === 'food' ? 'Dishes' : 'Items'}
                </div>
              </div>
            )}

            {!loading && searchResp?.items?.map(it=> (
              <div className="card" key={it.id}>
                <div style={{fontWeight:600}}>{it.name || (it as any).title}</div>
                <div className="meta">
                  {it.store_name && <span>🏪 {it.store_name} • </span>}
                  {it.category_name || it.category || it.genre} 
                  {(it.veg === 1 || it.veg === true) && ' • 🟢 Veg'}
                  {(it.veg === 0 || it.veg === false) && ' • 🔴 Non-Veg'}
                </div>
                <div style={{marginTop:6}}>
                  {it.avg_rating!=null && <span className="pill">⭐ {Number(it.avg_rating).toFixed(1)}</span>}
                  {it.distance_km!=null && <span className="pill">{Number(it.distance_km).toFixed(1)} km</span>}
                  {it.price!=null && <span className="pill">₹{it.price}</span>}
                  {it.base_price!=null && <span className="pill">₹{it.base_price}</span>}
                  {module==='ecom' && (it as any).brand && <span className="pill">{(it as any).brand}</span>}
                  {module==='movies' && it.cast && <span className="pill">{Array.isArray(it.cast)? it.cast.slice(0,2).join(', ') : it.cast}</span>}
                </div>
                {(module==='food' || module==='ecom') && (
                  <div style={{marginTop:8}}>
                    <button className="secondary" style={{fontSize:12, padding:'4px 8px'}} onClick={()=>{
                      setSelectedItemForRecs(it.id)
                      API.recommendations(it.id, getModuleId(module), it.store_id ? String(it.store_id) : undefined, 5)
                        .then(data => setRecommendations(data))
                        .catch(() => setRecommendations(null))
                    }}>
                      💡 Frequently Bought Together
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="results">
            {loading && Array.from({length:6}).map((_,i)=>(
              <div className="card" key={'sk-s-'+i}>
                <div className="skeleton line" style={{width:'60%'}}></div>
                <div className="skeleton line" style={{width:'40%'}}></div>
              </div>
            ))}
            {!loading && storesResp?.stores?.map((st:any)=> (
              <div className="card" key={st.id}>
                <div style={{fontWeight:600}}>{st.name || st.theater_name}</div>
                <div style={{marginTop:6}}>
                  {st.distance_km!=null && <span className="pill">{Number(st.distance_km).toFixed(1)} km</span>}
                  {st.rating!=null && <span className="pill">⭐ {Number(st.rating).toFixed(1)}</span>}
                </div>
                <div className="meta">{st.category || st.module}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recommendations Panel */}
      {recommendations && selectedItemForRecs && (
        <div className="panel" style={{marginTop:12, background:'#fffbea', borderLeft:'3px solid #ff9800'}}>
          <div className="row" style={{alignItems:'center', marginBottom:8}}>
            <div style={{flex:1}}>
              <div style={{fontWeight:600, fontSize:16}}>💡 Frequently Bought Together</div>
              <div className="meta" style={{fontSize:12}}>
                {recommendations.item_name && `with ${recommendations.item_name}`}
                {recommendations.store_id && ` (Same Store)`}
              </div>
            </div>
            <button className="secondary" onClick={()=>{ setRecommendations(null); setSelectedItemForRecs(null) }}>✕</button>
          </div>
          {recommendations.recommendations && recommendations.recommendations.length > 0 ? (
            <div className="results" style={{marginTop:8}}>
              {recommendations.recommendations.map((rec: any) => (
                <div className="card" key={rec.item_id} style={{background:'white'}}>
                  <div style={{fontWeight:600}}>{rec.item_name}</div>
                  <div className="meta">
                    {rec.store_name && `🏪 ${rec.store_name}`}
                  </div>
                  <div style={{marginTop:6}}>
                    {rec.price && <span className="pill">₹{rec.price}</span>}
                    {rec.times_together && <span className="pill">🔗 Bought together {rec.times_together}× times</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="meta" style={{padding:'12px 0', textAlign:'center'}}>
              No recommendations available for this item
            </div>
          )}
        </div>
      )}

      <div className="panel" style={{marginTop:12}}>
        <div className="row">
          <div>
            <label>Trending window</label><br />
            <select id="window">
              <option value="7d">7d</option>
              <option value="24h">24h</option>
              <option value="30d">30d</option>
            </select>
          </div>
          <div>
            <label>Time of day</label><br />
            <select id="tod">
              <option value="">All</option>
              <option value="morning">Morning</option>
              <option value="afternoon">Afternoon</option>
              <option value="evening">Evening</option>
              <option value="night">Night</option>
            </select>
          </div>
          <button className="secondary" onClick={async()=>{
            const windowSel = (document.getElementById('window') as HTMLSelectElement).value
            const tod = (document.getElementById('tod') as HTMLSelectElement).value
            const data: any = await API.trending(getModuleId(module), windowSel, tod || undefined)
            const rows = Array.isArray(data?.rows) ? data.rows : []
            setTrending(rows.map((d:any)=> d.q ).slice(0,10))
          }}>Load trending</button>
        </div>
        {trending.length>0 && (
          <div style={{marginTop:8}}>
            <div className="meta">Trending</div>
            <div className="chips">
              {trending.map(t => (
                <div key={t} className="chip" onClick={()=>onSelectSuggestion(t)}>{t}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
