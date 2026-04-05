import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
dotenv.config({ path: '.env.local' });
import { db, initializeDatabase } from './src/lib/dbPostgres.js';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(cors());
  app.use(express.json());

  await initializeDatabase();

  // Access control helper
  async function checkVibeAccess(vibeId: number | string, supabaseId: string | null): Promise<{ allowed: boolean; role: 'owner' | 'collaborator' | 'viewer' | 'none'; vibe: any }> {
    const vibe = await db.get(`
      SELECT v.*, u.supabase_id as owner_supabase_id
      FROM vibes v JOIN users u ON v.author_id = u.id WHERE v.id = $1
    `, [vibeId]);
    if (!vibe) return { allowed: false, role: 'none', vibe: null };
    const visibility = vibe.visibility || 'public';
    if (!supabaseId) {
      return { allowed: visibility === 'public' || visibility === 'unlisted', role: 'viewer', vibe };
    }
    if (vibe.owner_supabase_id === supabaseId) return { allowed: true, role: 'owner', vibe };
    const user = await db.get('SELECT id FROM users WHERE supabase_id = $1', [supabaseId]);
    if (user) {
      const collab = await db.get('SELECT id FROM collaborators WHERE vibe_id = $1 AND user_id = $2', [vibeId, user.id]);
      if (collab) return { allowed: true, role: 'collaborator', vibe };
    }
    return { allowed: visibility === 'public' || visibility === 'unlisted', role: 'viewer', vibe };
  }

  // API Routes

  // Sync GitHub/Supabase user to PostgreSQL users table
  app.post('/api/auth/sync', async (req, res) => {
    const { supabase_id, username, avatar } = req.body;
    if (!supabase_id || !username) {
      return res.status(400).json({ error: 'supabase_id and username are required' });
    }
    try {
      // Try to find by supabase_id first
      let user = await db.get('SELECT * FROM users WHERE supabase_id = $1', [supabase_id]);
      if (!user) {
        // Try to find by username (legacy records without supabase_id)
        user = await db.get('SELECT * FROM users WHERE username = $1', [username]);
        if (user) {
          // Link existing user to supabase_id
          user = await db.get('UPDATE users SET supabase_id = $1, avatar = $2 WHERE id = $3 RETURNING *', [supabase_id, avatar, user.id]);
        } else {
          // Create new user
          user = await db.get(
            'INSERT INTO users (username, avatar, supabase_id) VALUES ($1, $2, $3) RETURNING *',
            [username, avatar, supabase_id]
          );
        }
      }
      res.json(user);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // Get all vibes (public only; or include own + collaborated if supabase_id provided)
  app.get('/api/vibes', async (req, res) => {
    const supabaseId = req.query.supabase_id as string | undefined;
    try {
      let whereClause = `v.visibility = 'public'`;
      const params: (string | number)[] = [];
      if (supabaseId) {
        const user = await db.get('SELECT id FROM users WHERE supabase_id = $1', [supabaseId]);
        if (user) {
          whereClause = `(v.visibility = 'public' OR v.author_id = $1 OR v.id IN (SELECT vibe_id FROM collaborators WHERE user_id = $1))`;
          params.push(user.id);
        }
      }
      const vibes = await db.query(`
        SELECT v.*, u.username as author_name, u.avatar as author_avatar,
        (SELECT code FROM versions WHERE vibe_id = v.id ORDER BY version_number DESC LIMIT 1) as latest_code,
        (SELECT version_number FROM versions WHERE vibe_id = v.id ORDER BY version_number DESC LIMIT 1) as latest_version,
        (SELECT COUNT(*) FROM comments WHERE vibe_id = v.id) as comment_count,
        (SELECT COUNT(*) FROM remixes WHERE parent_vibe_id = v.id) as remix_count
        FROM vibes v
        JOIN users u ON v.author_id = u.id
        WHERE ${whereClause}
        ORDER BY v.created_at DESC
      `, params);
      res.json(vibes);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // Resolve vibe by username + slug (with access control)
  app.get('/api/vibes/by-slug/:username/:slug', async (req, res) => {
    const username = decodeURIComponent(req.params.username);
    const slug = decodeURIComponent(req.params.slug);
    const supabaseId = req.query.supabase_id as string | null || null;
    try {
      const allVibes = await db.query(`
        SELECT v.id, v.title FROM vibes v
        JOIN users u ON v.author_id = u.id WHERE u.username = $1
      `, [username]);
      const toSlug = (title: string) => title.toLowerCase().replace(/[^\w\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]+/g, '-').replace(/^-+|-+$/g, '');
      const found = allVibes.find((v: any) => toSlug(v.title) === slug);
      if (!found) return res.status(404).json({ error: 'Vibe not found' });

      const { allowed, role, vibe } = await checkVibeAccess(found.id, supabaseId);
      if (!allowed) return res.status(403).json({ error: 'Access denied', code: 'PRIVATE_VIBE' });

      const versions = await db.query(`
        SELECT v.*, u.username as author_name, u.avatar as author_avatar
        FROM versions v LEFT JOIN users u ON v.author_id = u.id
        WHERE v.vibe_id = $1 ORDER BY v.version_number DESC
      `, [found.id]);
      const comments = await db.query(`
        SELECT c.*, u.username as author_name, u.avatar as author_avatar
        FROM comments c JOIN users u ON c.author_id = u.id
        WHERE c.vibe_id = $1 ORDER BY c.created_at DESC
      `, [found.id]);
      const collaborators = role === 'owner' ? await db.query(`
        SELECT c.id, c.user_id, u.username, u.avatar, c.created_at
        FROM collaborators c JOIN users u ON c.user_id = u.id WHERE c.vibe_id = $1
      `, [found.id]) : [];
      res.json({ ...vibe, versions, comments, user_role: role, collaborators });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // Get single vibe with versions and comments
  app.get('/api/vibes/:id', async (req, res) => {
    const supabaseId = req.query.supabase_id as string | null || null;
    try {
      const { allowed, role, vibe } = await checkVibeAccess(req.params.id, supabaseId);
      if (!vibe) return res.status(404).json({ error: 'Vibe not found' });
      if (!allowed) return res.status(403).json({ error: 'Access denied', code: 'PRIVATE_VIBE' });

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
      const collaborators = role === 'owner' ? await db.query(`
        SELECT c.id, c.user_id, u.username, u.avatar, c.created_at
        FROM collaborators c JOIN users u ON c.user_id = u.id WHERE c.vibe_id = $1
      `, [req.params.id]) : [];
      const likeCountRow = await db.get(`SELECT COUNT(*) as count FROM reactions WHERE vibe_id = $1 AND type = 'like'`, [req.params.id]);
      let userLiked = false;
      if (supabaseId) {
        const u = await db.get('SELECT id FROM users WHERE supabase_id = $1', [supabaseId]);
        if (u) {
          const liked = await db.get(`SELECT id FROM reactions WHERE vibe_id = $1 AND user_id = $2 AND type = 'like'`, [req.params.id, u.id]);
          userLiked = !!liked;
        }
      }
      res.json({ ...vibe, versions, comments, user_role: role, collaborators, like_count: Number(likeCountRow?.count || 0), user_liked: userLiked });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // Create new vibe
  app.post('/api/vibes', async (req, res) => {
    const { title, tags, code, author_id = 1, parent_vibe_id, parent_version_number, description = '' } = req.body;
    let { visibility = 'public' } = req.body;
    if (!['public', 'unlisted', 'private'].includes(visibility)) visibility = 'public';
    try {
      // Enforce remix visibility rules
      if (parent_vibe_id) {
        const parent = await db.get('SELECT visibility FROM vibes WHERE id = $1', [parent_vibe_id]);
        if (parent?.visibility === 'private') visibility = 'private';
        else if (parent?.visibility === 'unlisted' && visibility === 'public') visibility = 'unlisted';
      }
      const vibe = await db.get(
        'INSERT INTO vibes (title, author_id, tags, visibility, description) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [title, author_id, tags, visibility, description]
      );
      const vibeId = vibe.id;
      await db.run(
        'INSERT INTO versions (vibe_id, version_number, author_id, code, update_log) VALUES ($1, $2, $3, $4, $5)',
        [vibeId, 1, author_id, code, 'Initial version']
      );
      if (parent_vibe_id) {
        await db.run('INSERT INTO remixes (parent_vibe_id, child_vibe_id, parent_version_number) VALUES ($1, $2, $3)', [parent_vibe_id, vibeId, parent_version_number || null]);
      }
      res.json({ id: vibeId });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // Add new version
  app.post('/api/vibes/:id/versions', async (req, res) => {
    const { code, update_log, author_id } = req.body;
    const vibeId = req.params.id;
    try {
      const latest = await db.get('SELECT MAX(version_number) as max_v FROM versions WHERE vibe_id = $1', [vibeId]);
      const nextVersion = (Number(latest?.max_v) || 0) + 1;
      await db.run(
        'INSERT INTO versions (vibe_id, version_number, author_id, code, update_log) VALUES ($1, $2, $3, $4, $5)',
        [vibeId, nextVersion, author_id || null, code, update_log]
      );
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

  // Get direct remix children of a vibe (public/unlisted only)
  app.get('/api/vibes/:id/children', async (req, res) => {
    try {
      const children = await db.query(`
        SELECT v.id, v.title, u.username as author_name, u.avatar as author_avatar,
               v.created_at,
               (SELECT COUNT(*) FROM remixes WHERE parent_vibe_id = v.id) as remix_count
        FROM remixes r
        JOIN vibes v ON r.child_vibe_id = v.id
        JOIN users u ON v.author_id = u.id
        WHERE r.parent_vibe_id = $1 AND (v.visibility = 'public' OR v.visibility = 'unlisted')
        ORDER BY v.created_at ASC
        LIMIT 50
      `, [req.params.id]);
      res.json(children);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // Get ancestry chain from root to current vibe
  app.get('/api/vibes/:id/ancestry', async (req, res) => {
    try {
      const chain = await db.query(`
        WITH RECURSIVE chain AS (
          SELECT v.id, v.title, u.username as author_name, u.avatar as author_avatar,
                 r.parent_vibe_id, 0 as depth
          FROM vibes v
          JOIN users u ON v.author_id = u.id
          LEFT JOIN remixes r ON r.child_vibe_id = v.id
          WHERE v.id = $1
          UNION ALL
          SELECT v.id, v.title, u.username as author_name, u.avatar as author_avatar,
                 rr.parent_vibe_id, chain.depth + 1
          FROM vibes v
          JOIN users u ON v.author_id = u.id
          LEFT JOIN remixes rr ON rr.child_vibe_id = v.id
          JOIN chain ON v.id = chain.parent_vibe_id
          WHERE chain.depth < 20
        )
        SELECT id, title, author_name, author_avatar FROM chain ORDER BY depth DESC
      `, [req.params.id]);
      res.json(chain);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // Toggle like (authenticated)
  app.post('/api/vibes/:id/like', async (req, res) => {
    const { supabase_id } = req.body;
    if (!supabase_id) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const user = await db.get('SELECT id FROM users WHERE supabase_id = $1', [supabase_id]);
      if (!user) return res.status(401).json({ error: 'Unauthorized' });
      const existing = await db.get(`SELECT id FROM reactions WHERE vibe_id = $1 AND user_id = $2 AND type = 'like'`, [req.params.id, user.id]);
      if (existing) {
        await db.run(`DELETE FROM reactions WHERE vibe_id = $1 AND user_id = $2 AND type = 'like'`, [req.params.id, user.id]);
      } else {
        await db.run(`INSERT INTO reactions (vibe_id, user_id, type) VALUES ($1, $2, 'like')`, [req.params.id, user.id]);
      }
      const countRow = await db.get(`SELECT COUNT(*) as count FROM reactions WHERE vibe_id = $1 AND type = 'like'`, [req.params.id]);
      res.json({ liked: !existing, like_count: Number(countRow?.count || 0) });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // Update vibe title (owner only)
  app.patch('/api/vibes/:id/title', async (req, res) => {
    const { supabase_id, title } = req.body;
    if (!supabase_id) return res.status(401).json({ error: 'Unauthorized' });
    if (!title || !title.trim()) return res.status(400).json({ error: 'Title cannot be empty' });
    try {
      const user = await db.get('SELECT id FROM users WHERE supabase_id = $1', [supabase_id]);
      if (!user) return res.status(401).json({ error: 'Unauthorized' });
      const vibe = await db.get('SELECT author_id FROM vibes WHERE id = $1', [req.params.id]);
      if (!vibe) return res.status(404).json({ error: 'Vibe not found' });
      if (vibe.author_id !== user.id) return res.status(403).json({ error: 'Forbidden' });
      await db.run('UPDATE vibes SET title = $1 WHERE id = $2', [title.trim(), req.params.id]);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // Update vibe visibility (owner only)
  app.patch('/api/vibes/:id/visibility', async (req, res) => {
    const { supabase_id, visibility } = req.body;
    if (!supabase_id) return res.status(401).json({ error: 'Unauthorized' });
    if (!['public', 'unlisted', 'private'].includes(visibility)) return res.status(400).json({ error: 'Invalid visibility' });
    try {
      const user = await db.get('SELECT id FROM users WHERE supabase_id = $1', [supabase_id]);
      if (!user) return res.status(401).json({ error: 'Unauthorized' });
      const vibe = await db.get('SELECT author_id FROM vibes WHERE id = $1', [req.params.id]);
      if (!vibe) return res.status(404).json({ error: 'Vibe not found' });
      if (vibe.author_id !== user.id) return res.status(403).json({ error: 'Forbidden' });
      await db.run('UPDATE vibes SET visibility = $1 WHERE id = $2', [visibility, req.params.id]);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // Update vibe description (owner only)
  app.patch('/api/vibes/:id/description', async (req, res) => {
    const { supabase_id, description } = req.body;
    if (!supabase_id) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const user = await db.get('SELECT id FROM users WHERE supabase_id = $1', [supabase_id]);
      if (!user) return res.status(401).json({ error: 'Unauthorized' });
      const vibe = await db.get('SELECT author_id FROM vibes WHERE id = $1', [req.params.id]);
      if (!vibe) return res.status(404).json({ error: 'Vibe not found' });
      if (vibe.author_id !== user.id) return res.status(403).json({ error: 'Forbidden' });
      await db.run('UPDATE vibes SET description = $1 WHERE id = $2', [description || '', req.params.id]);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // Delete vibe (owner only, verified by supabase_id)
  app.delete('/api/vibes/:id', async (req, res) => {
    const { supabase_id } = req.body;
    if (!supabase_id) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const user = await db.get('SELECT id FROM users WHERE supabase_id = $1', [supabase_id]);
      if (!user) return res.status(401).json({ error: 'Unauthorized' });
      const vibe = await db.get('SELECT author_id FROM vibes WHERE id = $1', [req.params.id]);
      if (!vibe) return res.status(404).json({ error: 'Vibe not found' });
      if (vibe.author_id !== user.id) return res.status(403).json({ error: 'Forbidden' });
      await db.run('DELETE FROM comments WHERE vibe_id = $1', [req.params.id]);
      await db.run('DELETE FROM reactions WHERE vibe_id = $1', [req.params.id]);
      await db.run('DELETE FROM remixes WHERE parent_vibe_id = $1 OR child_vibe_id = $1', [req.params.id, req.params.id]);
      await db.run('DELETE FROM versions WHERE vibe_id = $1', [req.params.id]);
      await db.run('DELETE FROM collaborators WHERE vibe_id = $1', [req.params.id]);
      await db.run('DELETE FROM invite_links WHERE vibe_id = $1', [req.params.id]);
      await db.run('DELETE FROM vibes WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ── Collaborator Routes ──────────────────────────────────────────

  // List collaborators
  app.get('/api/vibes/:id/collaborators', async (req, res) => {
    const supabaseId = req.query.supabase_id as string | null || null;
    try {
      const { allowed } = await checkVibeAccess(req.params.id, supabaseId);
      if (!allowed) return res.status(403).json({ error: 'Access denied' });
      const collaborators = await db.query(`
        SELECT c.id, c.user_id, u.username, u.avatar, c.created_at
        FROM collaborators c JOIN users u ON c.user_id = u.id WHERE c.vibe_id = $1
      `, [req.params.id]);
      res.json(collaborators);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // Add collaborator by username (owner only)
  app.post('/api/vibes/:id/collaborators', async (req, res) => {
    const { supabase_id, username } = req.body;
    if (!supabase_id || !username) return res.status(400).json({ error: 'supabase_id and username required' });
    try {
      const owner = await db.get('SELECT id FROM users WHERE supabase_id = $1', [supabase_id]);
      if (!owner) return res.status(401).json({ error: 'Unauthorized' });
      const vibe = await db.get('SELECT author_id FROM vibes WHERE id = $1', [req.params.id]);
      if (!vibe) return res.status(404).json({ error: 'Vibe not found' });
      if (vibe.author_id !== owner.id) return res.status(403).json({ error: 'Forbidden' });
      const target = await db.get('SELECT id FROM users WHERE username = $1', [username]);
      if (!target) return res.status(404).json({ error: 'User not found' });
      if (target.id === owner.id) return res.status(400).json({ error: 'Cannot add owner as collaborator' });
      await db.run('INSERT INTO collaborators (vibe_id, user_id) VALUES ($1, $2) ON CONFLICT (vibe_id, user_id) DO NOTHING', [req.params.id, target.id]);
      const collaborator = await db.get(`
        SELECT c.id, c.user_id, u.username, u.avatar, c.created_at
        FROM collaborators c JOIN users u ON c.user_id = u.id
        WHERE c.vibe_id = $1 AND c.user_id = $2
      `, [req.params.id, target.id]);
      res.json(collaborator);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // Remove collaborator (owner only)
  app.delete('/api/vibes/:id/collaborators/:userId', async (req, res) => {
    const { supabase_id } = req.body;
    if (!supabase_id) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const owner = await db.get('SELECT id FROM users WHERE supabase_id = $1', [supabase_id]);
      if (!owner) return res.status(401).json({ error: 'Unauthorized' });
      const vibe = await db.get('SELECT author_id FROM vibes WHERE id = $1', [req.params.id]);
      if (!vibe) return res.status(404).json({ error: 'Vibe not found' });
      if (vibe.author_id !== owner.id) return res.status(403).json({ error: 'Forbidden' });
      await db.run('DELETE FROM collaborators WHERE vibe_id = $1 AND user_id = $2', [req.params.id, req.params.userId]);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ── Invite Link Routes ──────────────────────────────────────────

  // Create invite link (owner only)
  app.post('/api/vibes/:id/invite-link', async (req, res) => {
    const { supabase_id } = req.body;
    if (!supabase_id) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const owner = await db.get('SELECT id FROM users WHERE supabase_id = $1', [supabase_id]);
      if (!owner) return res.status(401).json({ error: 'Unauthorized' });
      const vibe = await db.get('SELECT author_id FROM vibes WHERE id = $1', [req.params.id]);
      if (!vibe) return res.status(404).json({ error: 'Vibe not found' });
      if (vibe.author_id !== owner.id) return res.status(403).json({ error: 'Forbidden' });
      const token = crypto.randomBytes(16).toString('hex');
      await db.run('INSERT INTO invite_links (vibe_id, token, created_by) VALUES ($1, $2, $3)', [req.params.id, token, owner.id]);
      res.json({ token });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // List invite links for a vibe (owner only)
  app.get('/api/vibes/:id/invite-links', async (req, res) => {
    const supabaseId = req.query.supabase_id as string | null || null;
    if (!supabaseId) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const owner = await db.get('SELECT id FROM users WHERE supabase_id = $1', [supabaseId]);
      if (!owner) return res.status(401).json({ error: 'Unauthorized' });
      const vibe = await db.get('SELECT author_id FROM vibes WHERE id = $1', [req.params.id]);
      if (!vibe) return res.status(404).json({ error: 'Vibe not found' });
      if (vibe.author_id !== owner.id) return res.status(403).json({ error: 'Forbidden' });
      const links = await db.query('SELECT * FROM invite_links WHERE vibe_id = $1 ORDER BY created_at DESC', [req.params.id]);
      res.json(links);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // Revoke invite link (owner only)
  app.delete('/api/vibes/:id/invite-link/:token', async (req, res) => {
    const { supabase_id } = req.body;
    if (!supabase_id) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const owner = await db.get('SELECT id FROM users WHERE supabase_id = $1', [supabase_id]);
      if (!owner) return res.status(401).json({ error: 'Unauthorized' });
      const vibe = await db.get('SELECT author_id FROM vibes WHERE id = $1', [req.params.id]);
      if (!vibe) return res.status(404).json({ error: 'Vibe not found' });
      if (vibe.author_id !== owner.id) return res.status(403).json({ error: 'Forbidden' });
      await db.run('UPDATE invite_links SET revoked = TRUE WHERE vibe_id = $1 AND token = $2', [req.params.id, req.params.token]);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // Resolve invite token (public)
  app.get('/api/invite/:token', async (req, res) => {
    try {
      const link = await db.get(`
        SELECT il.*, v.title as vibe_title, u.username as author_name
        FROM invite_links il
        JOIN vibes v ON il.vibe_id = v.id
        JOIN users u ON v.author_id = u.id
        WHERE il.token = $1
      `, [req.params.token]);
      if (!link || link.revoked) return res.json({ valid: false });
      res.json({ valid: true, vibe_id: link.vibe_id, vibe_title: link.vibe_title, author_name: link.author_name });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // Accept invite (authenticated)
  app.post('/api/invite/:token/accept', async (req, res) => {
    const { supabase_id } = req.body;
    if (!supabase_id) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const link = await db.get('SELECT * FROM invite_links WHERE token = $1', [req.params.token]);
      if (!link || link.revoked) return res.status(400).json({ error: 'Invalid or revoked invite link' });
      const user = await db.get('SELECT id FROM users WHERE supabase_id = $1', [supabase_id]);
      if (!user) return res.status(401).json({ error: 'Unauthorized' });
      const vibe = await db.get('SELECT author_id FROM vibes WHERE id = $1', [link.vibe_id]);
      if (vibe && vibe.author_id === user.id) return res.json({ success: true, already_owner: true, vibe_id: link.vibe_id });
      await db.run('INSERT INTO collaborators (vibe_id, user_id) VALUES ($1, $2) ON CONFLICT (vibe_id, user_id) DO NOTHING', [link.vibe_id, user.id]);
      res.json({ success: true, vibe_id: link.vibe_id });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ── AI Proxy Routes ──────────────────────────────────────────

  // Rate limit tracking (simple in-memory)
  const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
  const RATE_LIMIT = 30; // requests per minute
  const MINIMAX_BASE_URL = (process.env.MINIMAX_BASE_URL || 'https://api.minimax.io').replace(/\/+$/, '');
  const MINIMAX_DEFAULT_MODEL = process.env.MINIMAX_DEFAULT_MODEL || 'MiniMax-M2.5';

  function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);
    if (!entry || now > entry.resetAt) {
      rateLimitMap.set(ip, { count: 1, resetAt: now + 60000 });
      return true;
    }
    if (entry.count >= RATE_LIMIT) return false;
    entry.count++;
    return true;
  }

  function normalizeProvider(value: unknown): string {
    return typeof value === 'string' ? value.trim().toLowerCase() : '';
  }

  function normalizeApiKey(value: unknown): string {
    if (typeof value !== 'string') return '';
    return value
      .replace(/[\s\u200B-\u200D\uFEFF]+/g, '')
      .replace(/^['"`]+|['"`]+$/g, '')
      .trim();
  }

  // Test API Key validity
  app.post('/api/ai/test', async (req, res) => {
    let { provider, apiKey } = req.body;
    provider = normalizeProvider(provider);
    apiKey = normalizeApiKey(apiKey);
    if (!provider || !apiKey) return res.status(400).json({ error: 'provider and apiKey required' });

    try {
      if (provider === 'gemini') {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`);
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          const message = err.error?.message || 'Invalid Gemini API key';
          const hint = /API key not valid/i.test(message)
            ? ' 請確認你使用的是 Google AI Studio 產生的 Gemini API Key，且該 key 可用於 Generative Language API。'
            : '';
          return res.status(401).json({ error: `${message}${hint}` });
        }
        return res.json({ ok: true, provider });
      }
      if (provider === 'openai') {
        const r = await fetch('https://api.openai.com/v1/models', { headers: { Authorization: `Bearer ${apiKey}` } });
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          return res.status(401).json({ error: err.error?.message || 'Invalid OpenAI API key' });
        }
        return res.json({ ok: true, provider });
      }
      if (provider === 'minimax') {
        const r = await fetch(`${MINIMAX_BASE_URL}/v1/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ model: MINIMAX_DEFAULT_MODEL, messages: [{ role: 'user', content: 'hi' }], max_tokens: 8, temperature: 0 }),
        });
        const data = await r.json().catch(() => ({}));
        const embeddedError = data.base_resp?.status_code !== undefined && data.base_resp.status_code !== 0;
        if (!r.ok || embeddedError) {
          return res.status(401).json({ error: data.error?.message || data.base_resp?.status_msg || 'Invalid MiniMax API key' });
        }
        return res.json({ ok: true, provider });
      }
      if (provider === 'replicate') {
        const r = await fetch('https://api.replicate.com/v1/account', {
          headers: { Authorization: `Token ${apiKey}` },
        });
        if (!r.ok) return res.status(401).json({ error: 'Invalid Replicate API key' });
        return res.json({ ok: true, provider });
      }
      if (provider === 'stability') {
        const r = await fetch('https://api.stability.ai/v1/user/account', {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!r.ok) return res.status(401).json({ error: 'Invalid Stability AI API key' });
        return res.json({ ok: true, provider });
      }
      return res.status(400).json({ error: `Unknown provider: ${provider}` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // AI Chat Proxy
  app.post('/api/ai/chat', async (req, res) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(ip)) return res.status(429).json({ error: 'Rate limit exceeded. Try again later.' });

    let { provider, apiKey, messages, model, temperature = 0.7, maxTokens = 2048 } = req.body;
    provider = normalizeProvider(provider);
    apiKey = normalizeApiKey(apiKey);
    if (!provider || !apiKey || !messages) return res.status(400).json({ error: 'provider, apiKey and messages required' });

    try {
      if (provider === 'gemini') {
        const geminiModel = typeof model === 'string' && model.trim() ? model.trim() : 'gemini-2.5-flash';
        const contents = messages
          .filter((m: any) => m.role !== 'system')
          .map((m: any) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
        const systemInstruction = messages.find((m: any) => m.role === 'system');

        const body: any = { contents, generationConfig: { temperature, maxOutputTokens: maxTokens } };
        if (systemInstruction) body.systemInstruction = { parts: [{ text: systemInstruction.content }] };

        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${encodeURIComponent(apiKey)}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
        );
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          const message = err.error?.message || 'Gemini API error';
          const hint = /API key not valid/i.test(message)
            ? ' 請確認你使用的是 Google AI Studio 產生的 Gemini API Key，且該 key 可用於 Generative Language API。'
            : '';
          return res.status(r.status).json({ error: `${message}${hint}` });
        }
        const data = await r.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return res.json({ text, tokensUsed: data.usageMetadata?.totalTokenCount });
      }

      if (provider === 'openai') {
        const r = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ model: model || 'gpt-3.5-turbo', messages, temperature, max_tokens: maxTokens }),
        });
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          return res.status(r.status).json({ error: err.error?.message || 'OpenAI API error' });
        }
        const data = await r.json();
        return res.json({ text: data.choices?.[0]?.message?.content || '', tokensUsed: data.usage?.total_tokens });
      }

      if (provider === 'minimax') {
        const minimaxModel = typeof model === 'string' && model.trim() ? model.trim() : MINIMAX_DEFAULT_MODEL;
        const r = await fetch(`${MINIMAX_BASE_URL}/v1/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ model: minimaxModel, messages, temperature, max_tokens: maxTokens }),
        });
        const data = await r.json().catch(() => ({}));
        const embeddedError = data.base_resp?.status_code !== undefined && data.base_resp.status_code !== 0;
        if (!r.ok || embeddedError) {
          return res.status(r.status).json({ error: data.error?.message || data.base_resp?.status_msg || 'MiniMax API error' });
        }
        const text = data.choices?.[0]?.message?.content || '';
        return res.json({ text, tokensUsed: data.usage?.total_tokens });
      }

      return res.status(400).json({ error: `Provider '${provider}' chat not supported yet` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Helper to escape HTML special chars for OG pages
  function escapeHtml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Shared helper: fetch vibe OG data and send OG-enriched HTML response
  // Returns true if response was sent, false if vibe not found (call next())
  async function sendOgHtml(
    vibeId: string,
    pageUrl: string,
    res: express.Response,
    includeRefresh = false,
  ): Promise<boolean> {
    const vibe = await db.get(`
      SELECT v.title, v.tags, u.username as author_name
      FROM vibes v JOIN users u ON v.author_id = u.id WHERE v.id = $1 AND v.visibility != 'private'
    `, [vibeId]);
    if (!vibe) return false;

    const title = escapeHtml(vibe.title);
    const author = escapeHtml(vibe.author_name);
    const description = escapeHtml(`Interactive code by ${vibe.author_name}${vibe.tags ? ' · ' + vibe.tags : ''}`);
    const safeUrl = escapeHtml(pageUrl);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${title} by ${author} | BeaverKit</title>
  <meta name="description" content="${description}" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${title} by ${author} | BeaverKit" />
  <meta property="og:description" content="${description}" />
  <meta property="og:url" content="${safeUrl}" />
  <meta property="og:site_name" content="BeaverKit" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${title} by ${author} | BeaverKit" />
  <meta name="twitter:description" content="${description}" />${includeRefresh ? `\n  <meta http-equiv="refresh" content="0;url=${safeUrl}" />` : ''}
</head>
<body><a href="${safeUrl}">${title}</a></body>
</html>`);
    return true;
  }

  // OG meta endpoint – serves OG-enriched HTML for social bots (also used by Vercel conditional rewrite)
  app.get('/api/og/vibe/:id', async (req, res) => {
    try {
      const vibeId = req.params.id;
      const pageUrl = `${req.protocol}://${req.get('host')}/p/${vibeId}`;
      const sent = await sendOgHtml(vibeId, pageUrl, res, true);
      if (!sent) res.status(404).send('Not found');
    } catch (err: any) { res.status(500).send('Error'); }
  });

  // Bot detection for /p/:id – serve OG-enriched HTML to social crawlers in development
  // Note: in production, Vercel's conditional rewrite in vercel.json handles this
  // (keep bot UA pattern in sync with vercel.json)
  const BOT_UA_RE = /bot|crawler|spider|facebookexternalhit|twitterbot|linkedinbot|slackbot|discordbot|telegrambot|line|whatsapp/i;
  app.get('/p/:id', async (req, res, next) => {
    const userAgent = req.headers['user-agent'] || '';
    if (!BOT_UA_RE.test(userAgent)) return next();
    try {
      const vibeId = req.params.id;
      const pageUrl = `${req.protocol}://${req.get('host')}/p/${vibeId}`;
      const sent = await sendOgHtml(vibeId, pageUrl, res, false);
      if (!sent) next();
    } catch { next(); }
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
