import { db, initializeDatabase } from './dbPostgres';

// Simple auth - in production use proper JWT
export async function generateSessionToken(userId: number): Promise<string> {
  // Simple token: userId_timestamp_random
  return `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export async function createUser(username: string) {
  try {
    // 生成頭像 URL
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`;

    const result = await db.get(
      'INSERT INTO users (username, avatar) VALUES ($1, $2) RETURNING id, username, avatar',
      [username, avatar]
    );

    return result;
  } catch (error: any) {
    if (error.code === '23505') { // unique violation
      throw new Error('Username already exists');
    }
    throw error;
  }
}

export async function getOrCreateUser(username: string) {
  // 試著獲取用戶
  let user = await db.get('SELECT * FROM users WHERE username = $1', [username]);

  if (!user) {
    // 如果不存在就建立新用戶
    user = await createUser(username);
  }

  return user;
}

export async function getUserById(id: number) {
  return db.get('SELECT id, username, avatar, credit FROM users WHERE id = $1', [id]);
}
