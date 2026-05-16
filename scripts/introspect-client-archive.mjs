/**
 * Introspect the Jobber GraphQL API to find the exact clientArchive mutation signature.
 * Run with: node scripts/introspect-client-archive.mjs
 */
import { createRequire } from 'module';
import { config } from 'dotenv';
import { readFileSync } from 'fs';

config({ path: '.env' });

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) { console.error('DATABASE_URL not set'); process.exit(1); }

// Read the token directly from the DB via mysql2
const mysql = (await import('mysql2/promise')).default;
const conn = await mysql.createConnection(DB_URL);
const [rows] = await conn.query('SELECT accessToken FROM jobber_tokens LIMIT 1');
await conn.end();

if (!rows.length) { console.error('No Jobber token found'); process.exit(1); }
const token = rows[0].accessToken;
console.log('Token found, running introspection...');

const JOBBER_API_URL = 'https://api.getjobber.com/api/graphql';
const API_VERSION = '2025-01-20';

const introspectQuery = `
  query IntrospectClientArchive {
    __type(name: "Mutation") {
      fields {
        name
        args {
          name
          type { name kind ofType { name kind ofType { name kind } } }
        }
      }
    }
  }
`;

const res = await fetch(JOBBER_API_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'X-JOBBER-GRAPHQL-VERSION': API_VERSION,
  },
  body: JSON.stringify({ query: introspectQuery }),
});

const data = await res.json();
const fields = data?.data?.__type?.fields ?? [];
const archiveField = fields.find(f => f.name === 'clientArchive');

if (!archiveField) {
  console.log('clientArchive mutation NOT found in schema.');
  console.log('Available mutations containing "client":', fields.filter(f => f.name.toLowerCase().includes('client')).map(f => f.name));
} else {
  console.log('clientArchive mutation args:');
  console.log(JSON.stringify(archiveField.args, null, 2));
}
