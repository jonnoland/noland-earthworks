import { getDb } from "./server/db";

const db = await getDb();
if (db) {
  const [rows] = await (db as any).execute(
    "SELECT name, phone, jobberStatus, createdAt FROM quote_submissions ORDER BY createdAt DESC LIMIT 5"
  );
  console.log("Recent quote submissions:");
  console.log(JSON.stringify(rows, null, 2));
} else {
  console.log("Could not connect to database.");
}
process.exit(0);
