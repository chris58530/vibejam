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
});

// Initialize schema
export async function initializeDatabase() {
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        avatar TEXT,
        credit INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

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
        code TEXT NOT NULL,
        update_log TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Database schema initialized');
  } finally {
    client.release();
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
