/**
 * Refresh Jobber token and probe quoteDelete mutations.
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const JOBBER_API_URL = "https://api.getjobber.com/api/graphql";
const JOBBER_TOKEN_URL = "https://api.getjobber.com/api/oauth/token";

async function getStoredTokens() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  const [rows] = await conn.execute("SELECT accessToken, refreshToken, expiresAt FROM jobber_tokens ORDER BY id DESC LIMIT 1");
  await conn.end();
  return rows[0];
}

async function refreshToken(refreshToken) {
  const res = await fetch(JOBBER_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.JOBBER_CLIENT_ID,
      client_secret: process.env.JOBBER_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }).toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed: ${res.status} ${text.substring(0, 200)}`);
  }
  return res.json();
}

async function probeSchema(token) {
  // First introspect all quote mutations
  const introspectQuery = `
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
    body: JSON.stringify({ query: introspectQuery }),
  });
  const data = await res.json();
  if (data.errors) {
    console.error("Introspect errors:", data.errors);
    return;
  }
  const fields = data?.data?.__type?.fields ?? [];
  const quoteFields = fields.filter(f => f.name.toLowerCase().includes("quote"));
  console.log("Quote mutations:");
  quoteFields.forEach(f => {
    console.log(`  ${f.name}${f.isDeprecated ? " [DEPRECATED: " + f.deprecationReason + "]" : ""}`);
  });
}

async function probeQuoteDeleteArgs(token) {
  // Get the args for quoteDelete if it exists
  const query = `
    query {
      __type(name: "Mutation") {
        fields(includeDeprecated: true) {
          name
          args {
            name
            type {
              name kind
              ofType { name kind ofType { name kind } }
            }
          }
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
  const fields = data?.data?.__type?.fields ?? [];
  const quoteDelete = fields.find(f => f.name === "quoteDelete");
  if (quoteDelete) {
    console.log("\nquoteDelete args:");
    quoteDelete.args.forEach(a => {
      const t = a.type;
      const typeName = t.name ?? t.ofType?.name ?? t.ofType?.ofType?.name ?? t.kind;
      console.log(`  ${a.name}: ${typeName} (kind: ${t.kind})`);
    });
    
    // Also get the return type
    const returnType = fields.find(f => f.name === "quoteDelete")?.type;
    console.log("  Return type:", JSON.stringify(returnType));
  } else {
    console.log("\nquoteDelete NOT found in schema.");
    
    // Check for any delete-related mutations
    const deleteFields = fields.filter(f => f.name.toLowerCase().includes("delete") || f.name.toLowerCase().includes("destroy") || f.name.toLowerCase().includes("remove"));
    console.log("\nAll delete/destroy/remove mutations:");
    deleteFields.forEach(f => console.log(`  ${f.name}`));
  }
}

try {
  const stored = await getStoredTokens();
  if (!stored) {
    console.error("No tokens in DB");
    process.exit(1);
  }
  
  console.log("Refreshing token...");
  const newTokens = await refreshToken(stored.refreshToken);
  const accessToken = newTokens.access_token;
  console.log("Token refreshed. Probing schema...\n");
  
  await probeSchema(accessToken);
  await probeQuoteDeleteArgs(accessToken);
} catch (err) {
  console.error("Error:", err.message);
}
