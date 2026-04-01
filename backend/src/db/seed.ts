/**
 * QueryForge Demo Database Seeder
 * 
 * Generates a compact but realistic ecommerce dataset using Faker.js:
 *   - 30 customers with diverse locations
 *   - 10 categories
 *   - 40 products across categories
 *   - 500 orders spanning last 12 months
 *   - ~1,250 order items
 *   - 200 reviews
 *
 * Run: npx tsx src/db/seed.ts
 */

import { Pool } from 'pg';
import { faker } from '@faker-js/faker';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DEMO_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DEMO_DATABASE_URL is not set in .env');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('neon.tech') || DATABASE_URL.includes('supabase')
    ? { rejectUnauthorized: false }
    : undefined,
});

// ─── Schema DDL ──────────────────────────────────────────────────────────────

const DDL = `
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS customers CASCADE;

CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  city VARCHAR(100),
  state VARCHAR(50),
  country VARCHAR(50) DEFAULT 'US',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  category_id INTEGER REFERENCES categories(id),
  price DECIMAL(10,2) NOT NULL,
  stock INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  total DECIMAL(12,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id),
  product_id INTEGER REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL
);

CREATE TABLE reviews (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  product_id INTEGER REFERENCES products(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_reviews_product_id ON reviews(product_id);
CREATE INDEX idx_reviews_customer_id ON reviews(customer_id);
`;

// ─── US States ───────────────────────────────────────────────────────────────

const US_STATES = [
  'California', 'Texas', 'New York', 'Florida', 'Illinois',
  'Pennsylvania', 'Ohio', 'Georgia', 'Michigan', 'Washington',
];

// ─── Product Categories ──────────────────────────────────────────────────────

const CATEGORIES = [
  { name: 'Electronics', description: 'Gadgets, devices, and electronic accessories' },
  { name: 'Clothing', description: 'Apparel, shoes, and fashion accessories' },
  { name: 'Home & Kitchen', description: 'Furniture, appliances, and kitchen supplies' },
  { name: 'Books', description: 'Physical and digital books across all genres' },
  { name: 'Sports & Outdoors', description: 'Sporting goods and outdoor equipment' },
  { name: 'Beauty & Personal Care', description: 'Skincare, haircare, and cosmetics' },
  { name: 'Toys & Games', description: 'Children toys, board games, and puzzles' },
  { name: 'Health & Wellness', description: 'Supplements, fitness, and health products' },
  { name: 'Office Supplies', description: 'Stationery, desk accessories, and organization' },
  { name: 'Food & Beverages', description: 'Gourmet food, snacks, and drinks' },
];

const ORDER_STATUSES = ['completed', 'completed', 'completed', 'completed', 'shipped', 'processing', 'cancelled'];

// ─── Seed Functions ──────────────────────────────────────────────────────────

async function seedCustomers(count: number): Promise<void> {
  console.log(`  Seeding ${count} customers...`);
  const values: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  for (let j = 0; j < count; j++) {
    const name = faker.person.fullName();
    const email = faker.internet.email({ firstName: name.split(' ')[0], lastName: name.split(' ')[1] || 'user' }).toLowerCase() + j;
    const city = faker.location.city();
    const state = faker.helpers.arrayElement(US_STATES);
    const createdAt = faker.date.past({ years: 2 });

    values.push(`($${paramIdx}, $${paramIdx+1}, $${paramIdx+2}, $${paramIdx+3}, $${paramIdx+4}, $${paramIdx+5})`);
    params.push(name, email, city, state, 'US', createdAt);
    paramIdx += 6;
  }

  await pool.query(
    `INSERT INTO customers (name, email, city, state, country, created_at) VALUES ${values.join(',')}`,
    params
  );
}

async function seedCategories(): Promise<number[]> {
  console.log(`  Seeding ${CATEGORIES.length} categories...`);
  const ids: number[] = [];

  for (const cat of CATEGORIES) {
    const result = await pool.query(
      'INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING id',
      [cat.name, cat.description]
    );
    ids.push(result.rows[0].id);
  }

  return ids;
}

async function seedProducts(count: number, categoryIds: number[]): Promise<void> {
  console.log(`  Seeding ${count} products...`);
  const values: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  for (let j = 0; j < count; j++) {
    const name = faker.commerce.productName();
    const categoryId = faker.helpers.arrayElement(categoryIds);
    const price = parseFloat(faker.commerce.price({ min: 5, max: 999 }));
    const stock = faker.number.int({ min: 0, max: 500 });
    const createdAt = faker.date.past({ years: 1 });

    values.push(`($${paramIdx}, $${paramIdx+1}, $${paramIdx+2}, $${paramIdx+3}, $${paramIdx+4})`);
    params.push(name, categoryId, price, stock, createdAt);
    paramIdx += 5;
  }

  await pool.query(
    `INSERT INTO products (name, category_id, price, stock, created_at) VALUES ${values.join(',')}`,
    params
  );
}

async function seedOrders(count: number, customerCount: number): Promise<void> {
  console.log(`  Seeding ${count} orders with items...`);

  // Get all product IDs and prices
  const products = await pool.query('SELECT id, price FROM products');
  const productList = products.rows;

  // Build all orders and items in memory first, then batch-insert
  const batchSize = 500;

  for (let i = 0; i < count; i += batchSize) {
    const end = Math.min(i + batchSize, count);

    // Batch-insert orders
    const orderValues: string[] = [];
    const orderParams: unknown[] = [];
    let oPIdx = 1;

    interface PendingItem { quantity: number; unitPrice: number; productId: number }
    const pendingItems: PendingItem[][] = [];

    for (let j = i; j < end; j++) {
      const customerId = faker.number.int({ min: 1, max: customerCount });
      const status = faker.helpers.arrayElement(ORDER_STATUSES);
      const createdAt = faker.date.between({
        from: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        to: new Date(),
      });

      const itemCount = faker.number.int({ min: 1, max: 5 });
      let orderTotal = 0;
      const items: PendingItem[] = [];

      for (let k = 0; k < itemCount; k++) {
        const product = faker.helpers.arrayElement(productList);
        const quantity = faker.number.int({ min: 1, max: 4 });
        const unitPrice = parseFloat(product.price);
        orderTotal += unitPrice * quantity;
        items.push({ productId: product.id, quantity, unitPrice });
      }

      orderValues.push(`($${oPIdx}, $${oPIdx+1}, $${oPIdx+2}, $${oPIdx+3})`);
      orderParams.push(customerId, orderTotal.toFixed(2), status, createdAt);
      oPIdx += 4;
      pendingItems.push(items);
    }

    // Insert orders and get back IDs
    const orderResult = await pool.query(
      `INSERT INTO orders (customer_id, total, status, created_at) VALUES ${orderValues.join(',')} RETURNING id`,
      orderParams
    );
    const orderIds = orderResult.rows.map((r: { id: number }) => r.id);

    // Batch-insert all order items for this batch
    const itemValues: string[] = [];
    const itemParams: unknown[] = [];
    let iPIdx = 1;

    for (let idx = 0; idx < orderIds.length; idx++) {
      const orderId = orderIds[idx];
      for (const item of pendingItems[idx]) {
        itemValues.push(`($${iPIdx}, $${iPIdx+1}, $${iPIdx+2}, $${iPIdx+3})`);
        itemParams.push(orderId, item.productId, item.quantity, item.unitPrice);
        iPIdx += 4;
      }
    }

    if (itemValues.length > 0) {
      await pool.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES ${itemValues.join(',')}`,
        itemParams
      );
    }

    console.log(`    ${Math.min(end, count)}/${count} orders created`);
  }
}

async function seedReviews(count: number, customerCount: number, productCount: number): Promise<void> {
  console.log(`  Seeding ${count} reviews...`);
  const values: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  for (let j = 0; j < count; j++) {
    const customerId = faker.number.int({ min: 1, max: customerCount });
    const productId = faker.number.int({ min: 1, max: productCount });
    const rating = faker.helpers.weightedArrayElement([
      { value: 1, weight: 5 },
      { value: 2, weight: 10 },
      { value: 3, weight: 20 },
      { value: 4, weight: 35 },
      { value: 5, weight: 30 },
    ]);
    const comment = faker.lorem.sentence({ min: 5, max: 20 });
    const createdAt = faker.date.past({ years: 1 });

    values.push(`($${paramIdx}, $${paramIdx+1}, $${paramIdx+2}, $${paramIdx+3}, $${paramIdx+4})`);
    params.push(customerId, productId, rating, comment, createdAt);
    paramIdx += 5;
  }

  await pool.query(
    `INSERT INTO reviews (customer_id, product_id, rating, comment, created_at) VALUES ${values.join(',')}`,
    params
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('🔨 QueryForge Demo Database Seeder');
  console.log('══════════════════════════════════');

  try {
    console.log('\n📋 Creating schema...');
    await pool.query(DDL);

    console.log('\n🌱 Seeding data...');
    const customerCount = 1000;
    const productCount = 200;
    const orderCount = 10500;
    const reviewCount = 2000;

    await seedCustomers(customerCount);
    const categoryIds = await seedCategories();
    await seedProducts(productCount, categoryIds);
    await seedOrders(orderCount, customerCount);
    await seedReviews(reviewCount, customerCount, productCount);

    // Print summary
    console.log('\n📊 Summary:');
    const tables = ['customers', 'categories', 'products', 'orders', 'order_items', 'reviews'];
    for (const table of tables) {
      const result = await pool.query(`SELECT COUNT(*) FROM ${table}`);
      console.log(`  ${table}: ${result.rows[0].count} rows`);
    }

    console.log('\n✅ Demo database seeded successfully!');
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
