/**
 * Probe Jobber GraphQL schema for quote delete mutations.
 * Run: node scripts/probe-jobber-delete.mjs
 */
import { readFileSync } from "fs";

// Load env from .env file if present
let token;
try {
  const envFile = readFileSync("/home/ubuntu/noland-earthworks/.env", "utf8");
  const match = envFile.match(/JOBBER_ACCESS_TOKEN=(.+)/);
  if (match) token = match[1].trim();
} catch {}

// Try to get token from DB via a quick query
if (!token) {
  console.log("No JOBBER_ACCESS_TOKEN in .env — will try introspection with stored token via API");
}

// Introspect the mutation type to find quote-related delete mutations
const JOBBER_API_URL = "https://api.getjobber.com/api/graphql";

async function introspect(accessToken) {
  const query = `
    query IntrospectQuoteMutations {
      __type(name: "Mutation") {
        fields(includeDeprecated: true) {
          name
          isDeprecated
          deprecationReason
          args {
            name
            type {
              name
              kind
              ofType { name kind }
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
      "Authorization": `Bearer ${accessToken}`,
      "X-JOBBER-GRAPHQL-VERSION": "2025-01-20",
    },
    body: JSON.stringify({ query }),
  });

  const data = await res.json();
  if (data.errors) {
    console.error("GraphQL errors:", JSON.stringify(data.errors, null, 2));
    return;
  }

  const fields = data?.data?.__type?.fields ?? [];
  const quoteFields = fields.filter(f => f.name.toLowerCase().includes("quote"));
  console.log("Quote-related mutations:");
  for (const f of quoteFields) {
    console.log(`  ${f.name}${f.isDeprecated ? " [DEPRECATED: " + f.deprecationReason + "]" : ""}`);
    for (const arg of f.args) {
      const typeName = arg.type.name ?? arg.type.ofType?.name ?? arg.type.kind;
      console.log(`    arg: ${arg.name}: ${typeName}`);
    }
  }
}

// We need the actual access token from the DB — let's use the tRPC server approach
// Instead, let's just try the mutation directly and see what error we get
async function tryQuoteDelete(accessToken, testId) {
  const mutations = [
    { name: "quoteDelete", query: `mutation { quoteDelete(id: "${testId}") { id } }` },
    { name: "quoteDelete(input)", query: `mutation { quoteDelete(input: { id: "${testId}" }) { deletedQuoteId userErrors { message } } }` },
    { name: "quoteDestroy", query: `mutation { quoteDestroy(id: "${testId}") { id } }` },
  ];

  for (const m of mutations) {
    const res = await fetch(JOBBER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
        "X-JOBBER-GRAPHQL-VERSION": "2025-01-20",
      },
      body: JSON.stringify({ query: m.query }),
    });
    const data = await res.json();
    console.log(`\n${m.name}:`, JSON.stringify(data?.errors ?? data?.data, null, 2));
  }
}

// Read token from the DB connection string approach
// Since we can't easily connect to DB here, let's use the introspection approach with a placeholder
// and rely on the server-side test instead

console.log("This script needs a valid Jobber access token.");
console.log("Run the introspection via the app's /ops page or check jobberRouter.ts for the token.");
console.log("\nBased on Jobber API docs and schema, the likely mutations are:");
console.log("  - quoteDelete (with id or input.id)");
console.log("  - No quoteDelete found previously — but UI shows Delete option");
console.log("\nWill now try to introspect via the running server...");
