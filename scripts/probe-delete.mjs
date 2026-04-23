/**
 * Probe Jobber GraphQL for quoteDelete mutation.
 * Reads token from DB and introspects the schema.
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const JOBBER_API_URL = "https://api.getjobber.com/api/graphql";

async function getToken() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  const [rows] = await conn.execute("SELECT accessToken FROM jobber_tokens ORDER BY id DESC LIMIT 1");
  await conn.end();
  return rows[0]?.accessToken;
}

async function introspect(token) {
  const query = `
    query {
      __type(name: "Mutation") {
        fields(includeDeprecated: true) {
          name
          isDeprecated
          deprecationReason
        }
      }
    }
  `;
  const res = await fetch(JOBBER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "X-JOBBER-GRAPHQL-VERSION": "2025-01-20",
    },
    body: JSON.stringify({ query }),
  });
  const data = await res.json();
  if (data.errors) {
    console.error("Errors:", data.errors);
    return;
  }
  const fields = data?.data?.__type?.fields ?? [];
  const quoteFields = fields.filter(f => f.name.toLowerCase().includes("quote"));
  console.log("Quote mutations found:");
  quoteFields.forEach(f => {
    console.log(`  ${f.name}${f.isDeprecated ? " [DEPRECATED]" : ""}`);
  });
}

async function tryMutations(token) {
  // Try quoteDelete with a fake ID to see what error we get (schema vs auth vs not found)
  const fakeId = "Z2lkOi8vSm9iYmVyL1F1b3RlLzE="; // base64 fake
  const mutations = [
    `mutation { quoteDelete(id: "${fakeId}") { id } }`,
    `mutation { quoteDelete(input: { id: "${fakeId}" }) { deletedQuoteId userErrors { message } } }`,
    `mutation { quoteDelete(quoteId: "${fakeId}") { quote { id } userErrors { message } } }`,
  ];

  for (const q of mutations) {
    const res = await fetch(JOBBER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "X-JOBBER-GRAPHQL-VERSION": "2025-01-20",
      },
      body: JSON.stringify({ query: q }),
    });
    const data = await res.json();
    const firstLine = q.split("\n")[0].trim();
    console.log(`\n${firstLine}:`);
    if (data.errors) {
      data.errors.forEach(e => console.log("  ERROR:", e.message));
    } else {
      console.log("  DATA:", JSON.stringify(data.data));
    }
  }
}

try {
  const token = await getToken();
  if (!token) {
    console.error("No Jobber token in DB. Connect Jobber first via /ops.");
    process.exit(1);
  }
  console.log("Token found. Introspecting...\n");
  await introspect(token);
  console.log("\nTrying quoteDelete mutations with fake ID...");
  await tryMutations(token);
} catch (err) {
  console.error("Error:", err.message);
}
