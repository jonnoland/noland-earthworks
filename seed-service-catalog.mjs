/**
 * One-time seed: populates service_catalog with all 10 Noland Earthworks services.
 * Run with: node seed-service-catalog.mjs
 */
import "dotenv/config";
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const services = [
  { serviceType: "Forestry Mulching",   easyAcresPerDay: "2.00", normalAcresPerDay: "1.50", hardAcresPerDay: "0.75", sortOrder: 1 },
  { serviceType: "Land Management",     easyAcresPerDay: "2.00", normalAcresPerDay: "1.50", hardAcresPerDay: "0.75", sortOrder: 2 },
  { serviceType: "Brush/Understory",    easyAcresPerDay: "3.00", normalAcresPerDay: "2.00", hardAcresPerDay: "1.00", sortOrder: 3 },
  { serviceType: "ROW/Trail",           easyAcresPerDay: "1.50", normalAcresPerDay: "1.00", hardAcresPerDay: "0.60", sortOrder: 4 },
  { serviceType: "Trail Cutting",       easyAcresPerDay: "1.00", normalAcresPerDay: "0.75", hardAcresPerDay: "0.50", sortOrder: 5 },
  { serviceType: "Storm Cleanup",       easyAcresPerDay: "1.50", normalAcresPerDay: "1.00", hardAcresPerDay: "0.50", sortOrder: 6 },
  { serviceType: "Post-Clear Seeding",  easyAcresPerDay: "4.00", normalAcresPerDay: "3.00", hardAcresPerDay: "2.00", sortOrder: 7 },
  { serviceType: "Fence Line Clearing", easyAcresPerDay: "2.00", normalAcresPerDay: "1.50", hardAcresPerDay: "0.75", sortOrder: 8 },
  { serviceType: "Mulch Redistribution",easyAcresPerDay: "3.00", normalAcresPerDay: "2.00", hardAcresPerDay: "1.00", sortOrder: 9 },
  { serviceType: "Selective Clearing",  easyAcresPerDay: "1.50", normalAcresPerDay: "1.00", hardAcresPerDay: "0.60", sortOrder: 10 },
];

const conn = await mysql.createConnection(DATABASE_URL);

// Only seed if empty
const [rows] = await conn.query("SELECT COUNT(*) as cnt FROM service_catalog");
const count = rows[0].cnt;

if (count > 0) {
  console.log(`service_catalog already has ${count} rows — skipping seed.`);
  await conn.end();
  process.exit(0);
}

for (const svc of services) {
  await conn.query(
    `INSERT INTO service_catalog (serviceType, easyAcresPerDay, normalAcresPerDay, hardAcresPerDay, sortOrder)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE sortOrder = VALUES(sortOrder)`,
    [svc.serviceType, svc.easyAcresPerDay, svc.normalAcresPerDay, svc.hardAcresPerDay, svc.sortOrder]
  );
  console.log(`  Inserted: ${svc.serviceType}`);
}

console.log(`\nSeeded ${services.length} services into service_catalog.`);
await conn.end();
