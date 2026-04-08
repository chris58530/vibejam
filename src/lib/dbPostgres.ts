import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  family: 4,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 5,
});

// Prevent unhandled 'error' events from crashing the serverless function (502)
pool.on('error', (err) => {
  console.error('Unexpected error on idle pg client:', err.message);
});

// Initialize schema
export async function initializeDatabase() {
  let client;
  try {
    client = await pool.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        avatar TEXT,
        credit INTEGER DEFAULT 0,
        supabase_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE users ADD COLUMN IF NOT EXISTS supabase_id TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS motto TEXT DEFAULT 'Keep it simple, make it vibe. Exploring the intersection between minimal design and raw code.';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;

      CREATE TABLE IF NOT EXISTS vibes (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        author_id INTEGER NOT NULL,
        tags TEXT,
        views INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS versions (
        id SERIAL PRIMARY KEY,
        vibe_id INTEGER NOT NULL,
        version_number INTEGER NOT NULL,
        author_id INTEGER,
        code TEXT NOT NULL,
        update_log TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE versions ADD COLUMN IF NOT EXISTS author_id INTEGER;

      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        vibe_id INTEGER NOT NULL,
        version_id INTEGER,
        author_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        code_snippet TEXT,
        is_adopted INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS reactions (
        id SERIAL PRIMARY KEY,
        vibe_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS remixes (
        id SERIAL PRIMARY KEY,
        parent_vibe_id INTEGER NOT NULL,
        child_vibe_id INTEGER NOT NULL,
        parent_version_number INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE remixes ADD COLUMN IF NOT EXISTS parent_version_number INTEGER;

      ALTER TABLE vibes ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public';
      ALTER TABLE vibes ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';

      CREATE TABLE IF NOT EXISTS collaborators (
        id SERIAL PRIMARY KEY,
        vibe_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(vibe_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS invite_links (
        id SERIAL PRIMARY KEY,
        vibe_id INTEGER NOT NULL,
        token TEXT UNIQUE NOT NULL,
        created_by INTEGER NOT NULL,
        revoked BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS follows (
        id SERIAL PRIMARY KEY,
        follower_id INTEGER NOT NULL,
        following_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(follower_id, following_id)
      );
    `);
    console.log('Database schema initialized');
  } catch (err: any) {
    console.error('Database initialization error (non-fatal):', err.message);
  } finally {
    if (client) client.release();
  }
}

// Database query wrapper
export const db = {
  async query(text: string, params?: (string | number | null)[]) {
    const res = await pool.query(text, params);
    return res.rows;
  },

  async get(text: string, params?: (string | number | null)[]) {
    const res = await pool.query(text, params);
    return res.rows[0];
  },

  async run(text: string, params?: (string | number | null)[]) {
    const res = await pool.query(text, params);
    return res;
  }
};

export default db;
