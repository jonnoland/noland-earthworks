/**
 * Promote a user to admin by email.
 * Usage: node scripts/promote-user.mjs snoland@nolandearthworks.com
 */
import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env") });

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/promote-user.mjs <email>");
  process.exit(1);
}

const conn = await createConnection(process.env.DATABASE_URL);

// Look up the user
const [rows] = await conn.execute(
  "SELECT id, openId, name, email, role FROM users WHERE email = ?",
  [email]
);

if (rows.length === 0) {
  console.log(`No user found with email: ${email}`);
  console.log("The user must log in at least once before their record is created.");
  // List all users so we can see what's there
  const [allUsers] = await conn.execute(
    "SELECT id, openId, name, email, role FROM users ORDER BY id DESC LIMIT 20"
  );
  console.log("\nAll users in database:");
  console.table(allUsers);
} else {
  const user = rows[0];
  console.log("Found user:", user);
  if (user.role === "admin") {
    console.log("User is already admin.");
  } else {
    await conn.execute("UPDATE users SET role = 'admin' WHERE email = ?", [email]);
    console.log(`Promoted ${email} to admin.`);
  }
}

await conn.end();
