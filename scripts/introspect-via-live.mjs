/**
 * Introspect Jobber's RequestCreateInput via the live server endpoint.
 * Run with: node scripts/introspect-via-live.mjs
 */

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

// Call the live server's jobber introspect endpoint
const res = await fetch("https://nolandearthworks.com/api/jobber/introspect", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ query: introspectQuery }),
});

const text = await res.text();
console.log("Status:", res.status);
console.log("Response:", text.slice(0, 3000));
