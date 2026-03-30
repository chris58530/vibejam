import Database from 'better-sqlite3';
import path from 'path';

const db = new Database('beaverkit.db');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    avatar TEXT,
    credit INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS vibes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author_id INTEGER,
    tags TEXT,
    views INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(author_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vibe_id INTEGER,
    version_number INTEGER,
    code TEXT NOT NULL,
    update_log TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(vibe_id) REFERENCES vibes(id)
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vibe_id INTEGER,
    version_id INTEGER,
    author_id INTEGER,
    content TEXT NOT NULL,
    code_snippet TEXT,
    is_adopted INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(vibe_id) REFERENCES vibes(id),
    FOREIGN KEY(version_id) REFERENCES versions(id),
    FOREIGN KEY(author_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS reactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vibe_id INTEGER,
    user_id INTEGER,
    type TEXT,
    FOREIGN KEY(vibe_id) REFERENCES vibes(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS remixes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_vibe_id INTEGER,
    child_vibe_id INTEGER,
    parent_version_number INTEGER,
    FOREIGN KEY(parent_vibe_id) REFERENCES vibes(id),
    FOREIGN KEY(child_vibe_id) REFERENCES vibes(id)
  );
`);

// Seed a default user if none exists
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
if (userCount.count === 0) {
  const userResult = db.prepare('INSERT INTO users (username, avatar) VALUES (?, ?)').run('VibeCoder', 'https://api.dicebear.com/7.x/avataaars/svg?seed=VibeCoder');
  const userId = userResult.lastInsertRowid;

  // Seed some vibes
  const seedVibes = [
    {
      title: 'Neon Pulse Dashboard',
      tags: 'SaaS, Neon, Dashboard',
      code: `
        <style>
          body { background: #050505; color: #fff; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 40px; border-radius: 24px; backdrop-filter: blur(10px); text-align: center; box-shadow: 0 0 40px rgba(99, 102, 241, 0.2); }
          h1 { font-size: 3rem; margin: 0; background: linear-gradient(to right, #818cf8, #c084fc); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
          .pulse { width: 100px; height: 100px; background: #818cf8; border-radius: 50%; margin: 20px auto; animation: pulse 2s infinite; }
          @keyframes pulse { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(129, 140, 248, 0.7); } 70% { transform: scale(1); box-shadow: 0 0 0 20px rgba(129, 140, 248, 0); } 100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(129, 140, 248, 0); } }
        </style>
        <div class="card">
          <h1>Neon Pulse</h1>
          <div class="pulse"></div>
          <p style="opacity: 0.5">The Bower Prototype V1</p>
        </div>
      `
    },
    {
      title: 'Glassmorphic Login',
      tags: 'UI, Glassmorphism, Login',
      code: `
        <style>
          body { background: linear-gradient(45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab); background-size: 400% 400%; animation: gradient 15s ease infinite; height: 100vh; margin: 0; display: flex; align-items: center; justify-content: center; font-family: sans-serif; }
          @keyframes gradient { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
          .glass { background: rgba(255, 255, 255, 0.2); border-radius: 16px; box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1); backdrop-filter: blur(5px); -webkit-backdrop-filter: blur(5px); border: 1px solid rgba(255, 255, 255, 0.3); padding: 40px; width: 300px; text-align: center; color: white; }
          input { width: 100%; padding: 10px; margin: 10px 0; border-radius: 8px; border: none; background: rgba(255,255,255,0.1); color: white; outline: none; }
          button { width: 100%; padding: 10px; border-radius: 8px; border: none; background: white; color: #e73c7e; font-bold: true; cursor: pointer; margin-top: 10px; }
        </style>
        <div class="glass">
          <h2>Welcome Back</h2>
          <input type="text" placeholder="Username">
          <input type="password" placeholder="Password">
          <button>Sign In</button>
        </div>
      `
    }
  ];

  seedVibes.forEach(v => {
    const vibeResult = db.prepare('INSERT INTO vibes (title, author_id, tags) VALUES (?, ?, ?)').run(v.title, userId, v.tags);
    const vibeId = vibeResult.lastInsertRowid;
    db.prepare('INSERT INTO versions (vibe_id, version_number, code, update_log) VALUES (?, ?, ?, ?)').run(vibeId, 1, v.code, 'Initial seed version');
  });
}

export default db;
