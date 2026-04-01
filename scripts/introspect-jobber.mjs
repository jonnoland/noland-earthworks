/**
 * Introspect Jobber's RequestCreateInput to find the correct field names.
 * Run with: node scripts/introspect-jobber.mjs
 */
import { createConnection } from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const db = await createConnection(process.env.DATABASE_URL);
const [rows] = await db.execute("SELECT accessToken FROM jobber_tokens ORDER BY id DESC LIMIT 1");
await db.end();

if (!rows.length) {
  console.error("No Jobber tokens found in DB. Please authorize first.");
  process.exit(1);
}

const token = rows[0].access_token;

const introspectQuery = `
  query IntrospectRequestCreateInput {
    __type(name: "RequestCreateInput") {
      name
      inputFields {
        name
        type {
          name
          kind
          ofType {
            name
            kind
          }
        }
        description
      }
    }
  }
`;

const res = await fetch("https://api.getjobber.com/api/graphql", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
    "X-JOBBER-GRAPHQL-VERSION": "2025-01-20",
  },
  body: JSON.stringify({ query: introspectQuery }),
});

const data = await res.json();
console.log("Raw response:", JSON.stringify(data, null, 2).slice(0, 2000));
if (data.errors) {
  console.error("GraphQL errors:", JSON.stringify(data.errors, null, 2));
} else if (!data.data || !data.data.__type) {
  console.error("No __type in response. Full data:", JSON.stringify(data.data, null, 2));
} else {
  console.log("RequestCreateInput fields:");
  for (const field of data.data.__type.inputFields) {
    const typeName = field.type.ofType?.name || field.type.name;
    const required = field.type.kind === "NON_NULL" ? " (required)" : "";
    console.log(`  ${field.name}: ${typeName}${required}`);
    if (field.description) console.log(`    → ${field.description}`);
  }
}
