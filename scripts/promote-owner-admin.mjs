/**
 * One-time script: promotes the site owner to admin role in the database.
 * Run: node scripts/promote-owner-admin.mjs
 */
import "dotenv/config";
import mysql from "mysql2/promise";

const { DATABASE_URL, OWNER_OPEN_ID } = process.env;

if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}
if (!OWNER_OPEN_ID) {
  console.error("OWNER_OPEN_ID not set");
  process.exit(1);
}

const conn = await mysql.createConnection(DATABASE_URL);

// Check if the user exists
const [rows] = await conn.execute(
  "SELECT id, openId, role FROM users WHERE openId = ?",
  [OWNER_OPEN_ID]
);

if (rows.length === 0) {
  console.log("Owner account not found in DB yet (they haven't logged in). Will insert a placeholder.");
  console.log("Please log in to the site first, then re-run this script.");
} else {
  const user = rows[0];
  console.log(`Found user: id=${user.id}, openId=${user.openId}, current role=${user.role}`);
  if (user.role === "admin") {
    console.log("Already admin — no change needed.");
  } else {
    await conn.execute("UPDATE users SET role = 'admin' WHERE openId = ?", [OWNER_OPEN_ID]);
    console.log("✓ Owner promoted to admin role.");
  }
}

await conn.end();
