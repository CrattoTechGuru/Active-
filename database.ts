import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  // Fail loudly at boot rather than on the first query — a missing DB
  // config should never surface as a mystery 500 to an artist mid-upload.
  throw new Error('DATABASE_URL is not set. Copy backend/.env.example to backend/.env and fill it in.');
}

export const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

pool.on('error', (err) => {
  // Unexpected errors on idle clients — log and let the process supervisor
  // (Docker/Railway/etc.) restart rather than silently limping on.
  // eslint-disable-next-line no-console
  console.error('Unexpected PostgreSQL pool error', err);
});
