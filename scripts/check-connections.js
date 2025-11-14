/**
 * Script to check and clean up MySQL connections
 * Run: node scripts/check-connections.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkConnections() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    console.log('🔍 Checking MySQL connections...\n');
    
    // Check current connections
    const [connections] = await connection.query(`
      SELECT 
        COUNT(*) as total_connections,
        SUM(CASE WHEN Command != 'Sleep' THEN 1 ELSE 0 END) as active_connections,
        SUM(CASE WHEN Command = 'Sleep' THEN 1 ELSE 0 END) as sleeping_connections
      FROM information_schema.PROCESSLIST
      WHERE db = DATABASE()
    `);
    
    console.log('📊 Connection Statistics:');
    console.log('  Total connections:', connections[0].total_connections);
    console.log('  Active connections:', connections[0].active_connections);
    console.log('  Sleeping connections:', connections[0].sleeping_connections);
    console.log('');
    
    // Show max connections setting
    const [maxConn] = await connection.query("SHOW VARIABLES LIKE 'max_connections'");
    console.log('⚙️  MySQL Settings:');
    console.log('  Max connections:', maxConn[0].Value);
    console.log('');
    
    // List all connections for this database
    const [processlist] = await connection.query(`
      SELECT 
        ID,
        USER,
        HOST,
        DB,
        COMMAND,
        TIME,
        STATE,
        LEFT(INFO, 50) as INFO
      FROM information_schema.PROCESSLIST
      WHERE DB = DATABASE()
      ORDER BY TIME DESC
    `);
    
    if (processlist.length > 0) {
      console.log('🔗 Active Processes:');
      console.table(processlist);
    }
    
    // Check for long-running queries
    const [longQueries] = await connection.query(`
      SELECT 
        ID,
        USER,
        HOST,
        DB,
        COMMAND,
        TIME as SECONDS,
        STATE,
        LEFT(INFO, 100) as QUERY
      FROM information_schema.PROCESSLIST
      WHERE DB = DATABASE()
        AND TIME > 60
        AND COMMAND != 'Sleep'
      ORDER BY TIME DESC
    `);
    
    if (longQueries.length > 0) {
      console.log('\n⚠️  Long-running queries (>60 seconds):');
      console.table(longQueries);
    }
    
    // Optional: Kill sleeping connections older than 5 minutes
    const killOldConnections = process.argv.includes('--kill-old');
    if (killOldConnections) {
      console.log('\n🧹 Killing old sleeping connections...');
      const [oldConnections] = await connection.query(`
        SELECT ID
        FROM information_schema.PROCESSLIST
        WHERE DB = DATABASE()
          AND COMMAND = 'Sleep'
          AND TIME > 300
          AND USER != 'root'
      `);
      
      let killed = 0;
      for (const conn of oldConnections) {
        try {
          await connection.query(`KILL ${conn.ID}`);
          killed++;
        } catch (err) {
          console.error(`Failed to kill connection ${conn.ID}:`, err.message);
        }
      }
      console.log(`✅ Killed ${killed} old connections`);
    }
    
    console.log('\n✅ Connection check complete!');
    console.log('\n💡 Tips:');
    console.log('  - Keep connections below 80% of max_connections');
    console.log('  - Use connection pooling with limits (connectionLimit: 10)');
    console.log('  - Close connections after use');
    console.log('  - Run with --kill-old to clean up sleeping connections');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkConnections();
