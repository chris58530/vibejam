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

// Delete vibe (owner only, verified by supabase_id)
app.delete('/api/vibes/:id', async (req, res) => {
  const { supabase_id } = req.body;
  if (!supabase_id) return res.status(401).json({ error: 'Unauthorized' });
  try {
    await ensureDb();
    const user = await db.get('SELECT id FROM users WHERE supabase_id = $1', [supabase_id]);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const vibe = await db.get('SELECT author_id FROM vibes WHERE id = $1', [req.params.id]);
    if (!vibe) return res.status(404).json({ error: 'Vibe not found' });
    if (vibe.author_id !== user.id) return res.status(403).json({ error: 'Forbidden' });
    await db.run('DELETE FROM comments WHERE vibe_id = $1', [req.params.id]);
    await db.run('DELETE FROM reactions WHERE vibe_id = $1', [req.params.id]);
    await db.run('DELETE FROM remixes WHERE parent_vibe_id = $1 OR child_vibe_id = $1', [req.params.id, req.params.id]);
    await db.run('DELETE FROM versions WHERE vibe_id = $1', [req.params.id]);
    await db.run('DELETE FROM vibes WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ── AI Proxy Routes ──────────────────────────────────────────

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30;
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
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

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
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default app;
