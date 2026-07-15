import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dbPath = path.resolve(__dirname, 'warung.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log('Testing SQLite Database connection and structure...');

try {
  const checkStores = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='stores'").get();
  if (!checkStores) {
    console.error('ERROR: Tables do not exist. Make sure you run db.ts first.');
    process.exit(1);
  }

  console.log('SUCCESS: Tables exist.');

  const stores = db.prepare('SELECT * FROM stores').all();
  console.log('Current Stores in DB:', stores);

  const persons = db.prepare('SELECT * FROM persons').all();
  console.log('Current Staff in DB:', persons);

  const products = db.prepare('SELECT * FROM products LIMIT 3').all();
  console.log('Sample Products in DB:', products);

  const txs = db.prepare('SELECT * FROM transactions').all();
  console.log('Transactions in DB:', txs);

} catch (err) {
  console.error('Database test failed:', err);
} finally {
  db.close();
}
