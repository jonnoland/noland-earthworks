/**
 * Direct probe — uses stored token as-is, no refresh.
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const JOBBER_API_URL = "https://api.getjobber.com/api/graphql";

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute("SELECT accessToken, expiresAt FROM jobber_tokens ORDER BY id DESC LIMIT 1");
await conn.end();

const token = rows[0]?.accessToken;
if (!token) { console.error("No token"); process.exit(1); }
console.log("Token expires:", rows[0].expiresAt);

async function gql(query) {
  const res = await fetch(JOBBER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "X-JOBBER-GRAPHQL-VERSION": "2025-01-20",
    },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (text.startsWith("<")) {
    console.error("Got HTML response (status", res.status, ") — token may be blocked by CDN");
    console.error(text.substring(0, 100));
    return null;
  }
  return JSON.parse(text);
}

// Step 1: introspect all quote mutations
console.log("\n--- Quote mutations ---");
const data = await gql(`query { __type(name: "Mutation") { fields(includeDeprecated: true) { name isDeprecated deprecationReason } } }`);
if (data) {
  const fields = data?.data?.__type?.fields ?? [];
  const quoteFields = fields.filter(f => f.name.toLowerCase().includes("quote"));
  quoteFields.forEach(f => {
    console.log(`  ${f.name}${f.isDeprecated ? " [DEPRECATED: " + f.deprecationReason + "]" : ""}`);
  });
}

// Step 2: get quoteDelete args specifically
console.log("\n--- quoteDelete args ---");
const data2 = await gql(`query { __type(name: "Mutation") { fields(includeDeprecated: true) { name args { name type { name kind ofType { name kind ofType { name kind } } } } } } }`);
if (data2) {
  const fields = data2?.data?.__type?.fields ?? [];
  const qd = fields.find(f => f.name === "quoteDelete");
  if (qd) {
    console.log("quoteDelete found!");
    qd.args.forEach(a => {
      const t = a.type;
      const typeName = t.name ?? t.ofType?.name ?? t.ofType?.ofType?.name ?? t.kind;
      console.log(`  arg: ${a.name}: ${typeName} (kind: ${t.kind})`);
    });
    
    // Get the return type
    const qdWithReturn = fields.find(f => f.name === "quoteDelete");
    console.log("  Return:", JSON.stringify(qdWithReturn?.type ?? "unknown"));
  } else {
    console.log("quoteDelete NOT in schema");
    // List all delete mutations
    const deletes = fields.filter(f => f.name.toLowerCase().includes("delete") || f.name.toLowerCase().includes("destroy"));
    console.log("All delete/destroy mutations:");
    deletes.forEach(f => console.log(`  ${f.name}`));
  }
}

// Step 3: if quoteDelete exists, get its return type fields
console.log("\n--- QuoteDeletePayload type ---");
const data3 = await gql(`query { __type(name: "QuoteDeletePayload") { fields { name type { name kind ofType { name } } } } }`);
if (data3?.data?.__type) {
  const fields = data3.data.__type.fields ?? [];
  fields.forEach(f => {
    const t = f.type;
    const typeName = t.name ?? t.ofType?.name ?? t.kind;
    console.log(`  ${f.name}: ${typeName}`);
  });
} else {
  console.log("QuoteDeletePayload type not found");
}
