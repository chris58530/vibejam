import { createServer as createViteServer } from 'vite';
import path from 'path';
import express from 'express';
import app, { BOT_UA_RE, ensureDb, sendOgHtml } from './api/index.js';

async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;

  await ensureDb().catch((err: any) => console.error('DB init error (non-fatal):', err.message));

  // Bot detection for /p/:id – serve OG-enriched HTML to social crawlers in development
  // Note: in production, Vercel's conditional rewrite in vercel.json handles this
  // (keep bot UA pattern in sync with vercel.json)
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
