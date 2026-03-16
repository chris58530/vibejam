import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { db, initializeDatabase } from './src/lib/dbPostgres.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  await initializeDatabase();

  // API Routes

  // Get all vibes
  app.get('/api/vibes', async (req, res) => {
    try {
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

  // Get single vibe with versions and comments
  app.get('/api/vibes/:id', async (req, res) => {
    try {
      const vibe = await db.get(`
        SELECT v.*, u.username as author_name, u.avatar as author_avatar
        FROM vibes v JOIN users u ON v.author_id = u.id WHERE v.id = $1
      `, [req.params.id]);
      if (!vibe) return res.status(404).json({ error: 'Vibe not found' });

      const versions = await db.query('SELECT * FROM versions WHERE vibe_id = $1 ORDER BY version_number DESC', [req.params.id]);
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
      const vibe = await db.get(
        'INSERT INTO vibes (title, author_id, tags) VALUES ($1, $2, $3) RETURNING id',
        [title, author_id, tags]
      );
      const vibeId = vibe.id;
      await db.run('INSERT INTO versions (vibe_id, version_number, code, update_log) VALUES ($1, $2, $3, $4)', [vibeId, 1, code, 'Initial version']);
      if (parent_vibe_id) {
        await db.run('INSERT INTO remixes (parent_vibe_id, child_vibe_id) VALUES ($1, $2)', [parent_vibe_id, vibeId]);
      }
      res.json({ id: vibeId });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // Add new version
  app.post('/api/vibes/:id/versions', async (req, res) => {
    const { code, update_log } = req.body;
    const vibeId = req.params.id;
    try {
      const latest = await db.get('SELECT MAX(version_number) as max_v FROM versions WHERE vibe_id = $1', [vibeId]);
      const nextVersion = (Number(latest?.max_v) || 0) + 1;
      await db.run('INSERT INTO versions (vibe_id, version_number, code, update_log) VALUES ($1, $2, $3, $4)', [vibeId, nextVersion, code, update_log]);
      res.json({ success: true, version: nextVersion });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // Add comment
  app.post('/api/vibes/:id/comments', async (req, res) => {
    const { content, code_snippet, version_id, author_id = 1 } = req.body;
    try {
      await db.run('INSERT INTO comments (vibe_id, version_id, author_id, content, code_snippet) VALUES ($1, $2, $3, $4, $5)', [req.params.id, version_id, author_id, content, code_snippet]);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
