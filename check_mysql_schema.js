const mysql = require('mysql2/promise');

async function checkSchema() {
  try {
    const connection = await mysql.createConnection({
      host: '103.160.107.41',
      user: 'root',
      password: 'test@mangwale2025',
      database: 'migrated_db'
    });

    console.log('Connected to MySQL');

    // Check Column Definition
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'migrated_db' AND TABLE_NAME = 'stores' AND COLUMN_NAME IN ('latitude', 'longitude')
    `);

    console.log('\n--- Column Definitions ---');
    console.table(columns);

    // Check Sample Data to see actual precision
    const [rows] = await connection.query(`
      SELECT latitude, longitude FROM stores LIMIT 5
    `);

    console.log('\n--- Sample Data ---');
    console.table(rows);

    await connection.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkSchema();
