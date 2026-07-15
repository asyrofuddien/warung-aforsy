import db from './db';
import crypto from 'crypto';
import { generateSlug } from './slug';

export function hashPIN(pin: string): string {
  return crypto.createHash('sha256').update(pin).digest('hex');
}

export function seed() {
  console.log('Starting database seeding...');

  // Check if store already exists
  const existingStore = db.prepare('SELECT id FROM stores LIMIT 1').get();
  if (existingStore) {
    console.log('Database already has data. Skipping seed.');
    return;
  }

  // 1. Insert Stores
  const insertStore = db.prepare(`
    INSERT INTO stores (name, slug, address, qr_image_url, commission_rate, active)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const store1Result = insertStore.run(
    'Warung Berkah',
    generateSlug('Warung Berkah'),
    'Jl. Jenderal Sudirman No. 45, Jakarta',
    '/images/qr-berkah-demo.png',
    1.0,
    1
  );
  const store1Id = store1Result.lastInsertRowid;

  const store2Result = insertStore.run(
    'Toko Maju Jaya',
    generateSlug('Toko Maju Jaya'),
    'Jl. Malioboro No. 12, Yogyakarta',
    '/images/qr-maju-demo.png',
    2.5,
    1
  );
  const store2Id = store2Result.lastInsertRowid;

  console.log(`Seeded stores: Warung Berkah (ID: ${store1Id}), Toko Maju Jaya (ID: ${store2Id})`);

  // 2. Insert Persons
  const insertPerson = db.prepare(`
    INSERT INTO persons (store_id, name, pin_hash, is_owner)
    VALUES (?, ?, ?, ?)
  `);

  // Warung Berkah Staff
  insertPerson.run(store1Id, 'Budi (Pemilik)', hashPIN('123456'), 1); // Owner
  insertPerson.run(store1Id, 'Siti (Kasir)', hashPIN('654321'), 0);   // Cashier

  // Toko Maju Staff
  insertPerson.run(store2Id, 'Joko (Pemilik)', hashPIN('111111'), 1); // Owner
  insertPerson.run(store2Id, 'Aminah (Kasir)', hashPIN('222222'), 0); // Cashier

  console.log('Seeded staff members for both stores.');

  // 3. Insert Categories per store
  const insertCategory = db.prepare(`
    INSERT INTO categories (store_id, name) VALUES (?, ?)
  `);

  // Warung Berkah categories
  const catPangan1 = insertCategory.run(store1Id, 'Pangan');
  const catMinuman1 = insertCategory.run(store1Id, 'Minuman');
  const catKebersihan1 = insertCategory.run(store1Id, 'Kebersihan');
  const catRokok1 = insertCategory.run(store1Id, 'Rokok');

  // Toko Maju categories
  const catPangan2 = insertCategory.run(store2Id, 'Pangan');
  const catMinuman2 = insertCategory.run(store2Id, 'Minuman');
  const catKebersihan2 = insertCategory.run(store2Id, 'Kebersihan');

  console.log('Seeded categories for both stores.');

  // 4. Insert Products
  const insertProduct = db.prepare(`
    INSERT INTO products (store_id, category_id, name, price, cost_price, barcode, in_stock)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  // Warung Berkah products
  const p1 = insertProduct.run(store1Id, catPangan1.lastInsertRowid, 'Beras Ramos 5kg', 75000, 68000, '8999999002041', 1);
  const p2 = insertProduct.run(store1Id, catPangan1.lastInsertRowid, 'Minyak Goreng Filma 2L', 38000, 34000, '8999999002058', 1);
  const p3 = insertProduct.run(store1Id, catPangan1.lastInsertRowid, 'Mie Instan Indomie Goreng', 3500, 2900, '8990054000011', 1);
  const p4 = insertProduct.run(store1Id, catPangan1.lastInsertRowid, 'Gula Pasir Gulaku 1kg', 18500, 16000, '8992004101012', 1);
  insertProduct.run(store1Id, catMinuman1.lastInsertRowid, 'Teh Celup Sariwangi isi 25', 7500, 6000, '8992002341205', 1);
  insertProduct.run(store1Id, catMinuman1.lastInsertRowid, 'Kopi Kapal Api Mix 10 Pcs', 15000, 13000, '8992007890123', 0);
  insertProduct.run(store1Id, catKebersihan1.lastInsertRowid, 'Sabun Mandi Lifebuoy 100ml', 4500, 3500, '8999999001037', 1);
  insertProduct.run(store1Id, catRokok1.lastInsertRowid, 'Rokok Surya 16', 18000, 16500, '8999999001044', 1);

  // Toko Maju products
  insertProduct.run(store2Id, catPangan2.lastInsertRowid, 'Telur Ayam 1kg', 28000, 25000, '', 1);
  insertProduct.run(store2Id, catPangan2.lastInsertRowid, 'Tepung Terigu Segitiga Biru 1kg', 14500, 12500, '8998888123456', 1);
  insertProduct.run(store2Id, catMinuman2.lastInsertRowid, 'Kecap Manis Bango 550ml', 24000, 21000, '8999999001013', 1);
  insertProduct.run(store2Id, catKebersihan2.lastInsertRowid, 'Sabun Cuci Rinso Liquid 750ml', 21500, 19000, '8999999001020', 1);

  console.log('Seeded products catalog.');

  // 4. Seed some sample transactions for Warung Berkah (store1) to populate history
  const insertTransaction = db.prepare(`
    INSERT INTO transactions (store_id, person_id, timestamp, payment_method, total)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertTransactionItem = db.prepare(`
    INSERT INTO transaction_items (transaction_id, product_id, name_snapshot, price_snapshot, cost_price_snapshot, quantity)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Get employee IDs
  const budi = db.prepare("SELECT id FROM persons WHERE store_id = ? AND name LIKE 'Budi%'").get(store1Id) as { id: number };
  const siti = db.prepare("SELECT id FROM persons WHERE store_id = ? AND name LIKE 'Siti%'").get(store1Id) as { id: number };

  // Transaction 1: cash sale by Siti yesterday
  const t1Date = new Date();
  t1Date.setDate(t1Date.getDate() - 1);
  t1Date.setHours(10, 15, 0, 0);

  const t1Result = insertTransaction.run(
    store1Id,
    siti.id,
    t1Date.toISOString(),
    'cash',
    116500 // 1 Ramos (75k) + 1 Filma (38k) + 1 Gulaku (18.5k) - wait, sum: 75000 + 38000 + 3500 (Indomie) = 116500
  );
  const t1Id = t1Result.lastInsertRowid;

  insertTransactionItem.run(t1Id, p1.lastInsertRowid, 'Beras Ramos 5kg', 75000, 68000, 1);
  insertTransactionItem.run(t1Id, p2.lastInsertRowid, 'Minyak Goreng Filma 2L', 38000, 34000, 1);
  insertTransactionItem.run(t1Id, p3.lastInsertRowid, 'Mie Instan Indomie Goreng', 3500, 2900, 1);

  // Transaction 2: QRIS sale by Budi today
  const t2Date = new Date();
  t2Date.setHours(9, 30, 0, 0);

  const t2Result = insertTransaction.run(
    store1Id,
    budi.id,
    t2Date.toISOString(),
    'qr',
    44000 // 2 Filma (38k x 2? No, 1 Filma 38k + 2 Gulaku (3k)? Total: 2 Indomie (7k) + 2 Gulaku (37k) = 44000)
  );
  const t2Id = t2Result.lastInsertRowid;

  insertTransactionItem.run(t2Id, p3.lastInsertRowid, 'Mie Instan Indomie Goreng', 3500, 2900, 2);
  insertTransactionItem.run(t2Id, p4.lastInsertRowid, 'Gula Pasir Gulaku 1kg', 18500, 16000, 2);

  console.log('Seeded mock transactions.');

  // 5. Seed some commission records for Warung Berkah
  const insertCommission = db.prepare(`
    INSERT INTO commission_records (store_id, period, total_sales, rate_applied, amount_owed, collected)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Last month (June 2026)
  insertCommission.run(
    store1Id,
    '2026-06',
    5420000, // 5.42M IDR sales
    1.0,     // 1%
    54200,   // 54.2k owed
    1        // Collected
  );

  // Current month (July 2026 - uncollected)
  insertCommission.run(
    store1Id,
    '2026-07',
    160500,  // From the two seeded transactions (116500 + 44000 = 160500)
    1.0,
    1605,
    0        // Not collected
  );

  console.log('Seeded commission history. Seeding complete!');
}

// Automatically seed when run directly
if (require.main === module) {
  seed();
}
export default seed;
