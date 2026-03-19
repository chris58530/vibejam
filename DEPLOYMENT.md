# VibeJamer 部署指南

## 本地開發（使用 PostgreSQL）

### 1. 安裝依賴
```bash
npm install pg dotenv
```

### 2. 建立 `.env` 檔案
```
DATABASE_URL=postgresql://user:password@localhost:5432/vibejamer
NODE_ENV=development
PORT=3000
```

### 3. 本地 PostgreSQL 設置
```bash
# macOS (brew)
brew install postgresql@15
brew services start postgresql@15

# 或用 Docker
docker run --name vibejamer-db -e POSTGRES_DB=vibejamer -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres:15
```

### 4. 啟動開發服務器
```bash
npm run dev
```

---

## 部署到 Render（免費）

### 1️⃣ 準備 package.json
確保有這些腳本：
```json
{
  "scripts": {
    "dev": "tsx server.ts",
    "build": "vite build",
    "start": "node dist/server.js"  // 確保建立這個
  }
}
```

### 2️⃣ 建立 GitHub 倉庫
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/vibejamer.git
git push -u origin main
```

### 3️⃣ Render 部署步驟

1. 前往 [render.com](https://render.com)，用 GitHub 帳號登入
2. 點擊「New +」 → 「Web Service」
3. 連接你的 GitHub 倉庫

**配置：**
- **Build Command**: `npm install && npm run build`
- **Start Command**: `node dist/server.js`
- **Environment Variables**:
  - `NODE_ENV` = `production`
  - `DATABASE_URL` = `postgresql://...` (Render 會提供)
  - `PORT` = `3000`

### 4️⃣ 建立 PostgreSQL 數據庫（Render）

1. 在 Render 上建立新的「PostgreSQL」
2. 複製 `Internal Database URL`
3. 設置為 `DATABASE_URL` 環境變數

### 5️⃣ 部署
Render 會自動部署每個 Git push

---

## 部署到 Railway（推薦，更簡單）

### 1️⃣ 前往 [railway.app](https://railway.app)
- 用 GitHub 登入
- 點擊「Create New Project」

### 2️⃣ 選擇「Deploy from GitHub repo」
- 連接你的 vibejamer GitHub 倉庫

### 3️⃣ 建立 PostgreSQL 服務
- Railway 會自動添加 `DATABASE_URL`

### 4️⃣ 部署完成！
URL 會自動生成（例如 `https://vibejamer-production.up.railway.app`）

---

## 使用自定義域名

### Render
- Settings → Custom Domain
- 添加你的域名，跟著 DNS 設置指示

### Railway  
- 同樣在 Settings 中設置

---

## 部署檢查清單

- [ ] `.env` 文件不要提交到 git（添加到 `.gitignore`）
- [ ] DATABASE_URL 設置正確
- [ ] `npm run build` 成功運行
- [ ] 試著本地運行 `npm start`
- [ ] 所有環境變數在部署平台上設置正確

---

## 故障排除

### 「Cannot find module」錯誤
確保 `npm install` 運行了，所有依賴在 `package.json` 中

### 數據庫連接失敗
- 檢查 `DATABASE_URL` 是否正確
- 確保防火牆允許連接
- 試著在本地連接測試

### 前端頁面空白
- 檢查 Vite 構建是否成功
- 運行 `npm run build`，檢查是否有錯誤

---

## 下一步：用戶認證

當前使用簡單的用戶名登入。生產環境建議：
- 使用 JWT 令牌
- 添加密碼加密（bcrypt）
- 可考慮使用 Google/GitHub OAuth

詳見 `src/lib/auth.ts` 中的認證實現。
