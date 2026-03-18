import express from 'express';
import cors from 'cors';
import { db, initializeDatabase } from '../src/lib/dbPostgres.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

let initialized = false;
async function ensureDb() {
  if (!initialized) {
    await initializeDatabase();
    initialized = true;
  }
}

// Sync GitHub/Supabase user to PostgreSQL users table
app.post('/api/auth/sync', async (req, res) => {
  const { supabase_id, username, avatar } = req.body;
  if (!supabase_id || !username) {
    return res.status(400).json({ error: 'supabase_id and username are required' });
  }
  try {
    await ensureDb();
    let user = await db.get('SELECT * FROM users WHERE supabase_id = $1', [supabase_id]);
    if (!user) {
      user = await db.get('SELECT * FROM users WHERE username = $1', [username]);
      if (user) {
        user = await db.get('UPDATE users SET supabase_id = $1, avatar = $2 WHERE id = $3 RETURNING *', [supabase_id, avatar, user.id]);
      } else {
        user = await db.get(
          'INSERT INTO users (username, avatar, supabase_id) VALUES ($1, $2, $3) RETURNING *',
          [username, avatar, supabase_id]
        );
      }
    }
    res.json(user);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Get user profile
app.get('/api/users/:username', async (req, res) => {
  const username = decodeURIComponent(req.params.username);
  try {
    await ensureDb();
    const user = await db.get('SELECT * FROM users WHERE username = $1', [username]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Update user profile
app.put('/api/users/:username', async (req, res) => {
  const username = decodeURIComponent(req.params.username);
  const { motto } = req.body;
  try {
    await ensureDb();
    const user = await db.get('UPDATE users SET motto = $1 WHERE username = $2 RETURNING *', [motto, username]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Get all vibes
app.get('/api/vibes', async (req, res) => {
  try {
    await ensureDb();
    const vibes = await db.query(`
      SELECT v.*, u.username as author_name, u.avatar as author_avatar,
      (SELECT code FROM versions WHERE vibe_id = v.id ORDER BY version_number DESC LIMIT 1) as latest_code,
      (SELECT version_number FROM versions WHERE vibe_id = v.id ORDER BY version_number DESC LIMIT 1) as latest_version,
      (SELECT COUNT(*) FROM comments WHERE vibe_id = v.id) as comment_count,
      (SELECT COUNT(*) FROM remixes WHERE parent_vibe_id = v.id) as remix_count
      FROM vibes v
      JOIN users u ON v.author_id = u.id
      ORDER BY v.created_at DESC
    `);
    res.json(vibes);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Get single vibe
app.get('/api/vibes/:id', async (req, res) => {
  try {
    await ensureDb();
    const vibe = await db.get(`
      SELECT v.*, u.username as author_name, u.avatar as author_avatar
      FROM vibes v JOIN users u ON v.author_id = u.id WHERE v.id = $1
    `, [req.params.id]);
    if (!vibe) return res.status(404).json({ error: 'Vibe not found' });

    const versions = await db.query(`
      SELECT v.*, u.username as author_name, u.avatar as author_avatar
      FROM versions v LEFT JOIN users u ON v.author_id = u.id
      WHERE v.vibe_id = $1 ORDER BY v.version_number DESC
    `, [req.params.id]);
    const comments = await db.query(`
      SELECT c.*, u.username as author_name, u.avatar as author_avatar
      FROM comments c JOIN users u ON c.author_id = u.id
      WHERE c.vibe_id = $1 ORDER BY c.created_at DESC
    `, [req.params.id]);

    res.json({ ...vibe, versions, comments });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Create new vibe
app.post('/api/vibes', async (req, res) => {
  const { title, tags, code, author_id = 1, parent_vibe_id } = req.body;
  try {
    await ensureDb();
    const vibe = await db.get(
      'INSERT INTO vibes (title, author_id, tags) VALUES ($1, $2, $3) RETURNING id',
      [title, author_id, tags]
    );
    const vibeId = vibe.id;
    await db.run('INSERT INTO versions (vibe_id, version_number, author_id, code, update_log) VALUES ($1, $2, $3, $4, $5)', [vibeId, 1, author_id, code, 'Initial version']);
    if (parent_vibe_id) {
      await db.run('INSERT INTO remixes (parent_vibe_id, child_vibe_id) VALUES ($1, $2)', [parent_vibe_id, vibeId]);
    }
    res.json({ id: vibeId });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Add new version
app.post('/api/vibes/:id/versions', async (req, res) => {
  const { code, update_log, author_id } = req.body;
  const vibeId = req.params.id;
  try {
    await ensureDb();
    const latest = await db.get('SELECT MAX(version_number) as max_v FROM versions WHERE vibe_id = $1', [vibeId]);
    const nextVersion = (Number(latest?.max_v) || 0) + 1;
    await db.run('INSERT INTO versions (vibe_id, version_number, author_id, code, update_log) VALUES ($1, $2, $3, $4, $5)', [vibeId, nextVersion, author_id, code, update_log]);
    res.json({ success: true, version: nextVersion });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Add comment
app.post('/api/vibes/:id/comments', async (req, res) => {
  const { content, code_snippet, version_id, author_id = 1 } = req.body;
  try {
    await ensureDb();
    await db.run('INSERT INTO comments (vibe_id, version_id, author_id, content, code_snippet) VALUES ($1, $2, $3, $4, $5)', [req.params.id, version_id, author_id, content, code_snippet]);
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default app;
