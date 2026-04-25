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
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 10000,
  max: 1,
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
        display_name TEXT,
        avatar TEXT,
        credit INTEGER DEFAULT 0,
        email TEXT,
        supabase_id TEXT,
        auth_provider TEXT,
        provider_account_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS supabase_id TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_account_id TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS motto TEXT DEFAULT 'Keep it simple, make it vibe. Exploring the intersection between minimal design and raw code.';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;
      UPDATE users SET display_name = username WHERE display_name IS NULL OR btrim(display_name) = '';
      CREATE INDEX IF NOT EXISTS idx_users_supabase_id ON users(supabase_id);
      CREATE INDEX IF NOT EXISTS idx_users_provider_account ON users(auth_provider, provider_account_id);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes
          WHERE schemaname = 'public' AND indexname = 'ux_users_supabase_id'
        ) THEN
          IF EXISTS (
            SELECT supabase_id
            FROM users
            WHERE supabase_id IS NOT NULL AND btrim(supabase_id) <> ''
            GROUP BY supabase_id
            HAVING COUNT(*) > 1
          ) THEN
            RAISE NOTICE 'Skipping ux_users_supabase_id due to duplicate supabase_id values';
          ELSE
            EXECUTE 'CREATE UNIQUE INDEX ux_users_supabase_id ON users(supabase_id) WHERE supabase_id IS NOT NULL';
          END IF;
        END IF;
      END $$;

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
      ALTER TABLE vibes ADD COLUMN IF NOT EXISTS cover_image TEXT;
      ALTER TABLE vibes ADD COLUMN IF NOT EXISTS password_hash TEXT;
      ALTER TABLE vibes ADD COLUMN IF NOT EXISTS allow_remix BOOLEAN DEFAULT TRUE;

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

      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT FALSE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT TRUE;
      UPDATE users SET is_approved = TRUE WHERE is_approved IS NULL;

      CREATE TABLE IF NOT EXISTS assets (
        id             SERIAL PRIMARY KEY,
        owner_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        supabase_path  TEXT NOT NULL,
        public_url     TEXT NOT NULL,
        sha256         TEXT NOT NULL,
        filename       TEXT NOT NULL,
        original_name  TEXT NOT NULL,
        mime_type      TEXT NOT NULL,
        file_size      INTEGER NOT NULL,
        category       TEXT NOT NULL DEFAULT 'other',
        created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(owner_id, sha256)
      );
      CREATE INDEX IF NOT EXISTS idx_assets_owner ON assets(owner_id);

      CREATE TABLE IF NOT EXISTS access_logs (
        id          SERIAL PRIMARY KEY,
        path        TEXT NOT NULL,
        ip          TEXT,
        country     TEXT,
        user_agent  TEXT,
        referer     TEXT,
        supabase_id TEXT,
        username    TEXT,
        is_approved BOOLEAN,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_access_logs_path ON access_logs(path);
      CREATE INDEX IF NOT EXISTS idx_access_logs_created ON access_logs(created_at DESC);
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
  async query(text: string, params?: (string | number | boolean | null)[]) {
    const res = await pool.query(text, params);
    return res.rows;
  },

  async get(text: string, params?: (string | number | boolean | null)[]) {
    const res = await pool.query(text, params);
    return res.rows[0];
  },

  async run(text: string, params?: (string | number | boolean | null)[]) {
    const res = await pool.query(text, params);
    return res;
  }
};

export default db;
