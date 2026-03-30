# CLAUDE.md — AI 助手開發指南

本文件為 AI 程式設計助手提供關於 BeaverKit（The Bower）程式碼庫的結構、開發工作流程和約定規範。

---

## 專案概述

**BeaverKit（The Bower）** 是一個基於瀏覽器的協作程式碼原型平台，支援 AI 輔助程式碼生成。使用者可以建立、分享、改編（Remix）互動式 Web 專案（稱為「Vibes」），並透過多個 AI 提供商獲取程式碼生成支援。

**主要功能：**
- 即時程式碼編輯與沙箱 iframe 預覽
- 多版本控制系統
- Remix（Fork）機制
- 多語言支援（繁體中文 + 英文）
- 多 AI 提供商整合（Gemini、OpenAI、MiniMax 等）
- 使用者認證（Supabase Auth）
- 除錯版面疊加層工具

---

## 技術堆疊

| 層級 | 技術 |
|------|------|
| 前端框架 | React 19 + TypeScript |
| 路由 | React Router v7 |
| 狀態管理 | Zustand 5 |
| 樣式 | Tailwind CSS 3（Material Design 3 主題） |
| 動畫 | Motion 12 |
| 圖示 | Lucide React + Material Symbols |
| 建置工具 | Vite 6 |
| 後端（開發） | Express 4（tsx 熱重載） |
| 後端（生產） | Vercel Serverless Functions |
| 資料庫 | PostgreSQL（pg 驅動） |
| 認證 | Supabase Auth（GitHub OAuth + Email） |
| AI 整合 | @google/genai（Gemini），多提供商支援 |

---

## 目錄結構

```
beaverkit/
├── src/
│   ├── pages/          # 頁面級元件
│   ├── components/     # 可複用 UI 元件
│   ├── lib/            # 業務邏輯與工具函數
│   ├── App.tsx         # 根元件與路由設定
│   ├── main.tsx        # React 掛載入口
│   └── index.css       # 全域樣式與自訂動畫
├── api/
│   └── index.ts        # Vercel Serverless API 端點
├── server.ts           # Express 開發伺服器（兼顧生產）
├── seed.ts             # 資料庫種子資料腳本
├── vite.config.ts      # Vite 建置設定
├── tailwind.config.js  # Tailwind CSS 設定（含 MD3 顏色）
├── tsconfig.json       # TypeScript 設定
├── vercel.json         # Vercel 部署設定
├── DEPLOYMENT.md       # 部署指南（繁體中文）
└── CLAUDE_UI_DESIGN_GUIDE.md  # UI 設計規範（繁體中文）
```

---

## 頁面元件（`src/pages/`）

| 檔案 | 路由 | 功能 |
|------|------|------|
| `Home.tsx` | `/` | 探索頁，展示 Vibe 卡片，支援分類篩選 |
| `Workspace.tsx` | `/workspace` | 主要程式碼編輯器 + 即時預覽工作台 |
| `RemixStudio.tsx` | `/remix/:id` | 基於已有 Vibe 建立 Remix 的介面 |
| `IterationLab.tsx` | `/iteration` | 協作迭代編輯工作台 |
| `VibeDetail.tsx` | `/vibe/:id` | 單一 Vibe 詳情，含版本歷史與留言 |
| `Profile.tsx` | `/profile/:id` | 使用者主頁，展示已儲存／建立的 Vibes |
| `AIChat.tsx` | `/chat` | AI 對話介面，支援模型切換 |
| `Settings.tsx` | `/settings` | 使用者設定與 API 金鑰設定 |

---

## 核心元件（`src/components/`）

| 檔案 | 功能 |
|------|------|
| `AuthModal.tsx` | 認證彈窗（登入／註冊／密碼重設），含社群登入 |
| `Sidebar.tsx` | 左側導覽列，含選單連結 |
| `Navbar.tsx` | 頂部導覽，含搜尋框與使用者選單 |
| `VibeCard.tsx` | Vibe 預覽卡片元件 |
| `BottomTabBar.tsx` | 行動裝置底部標籤列 |
| `ThinkingLoader.tsx` | 帶脈衝動畫的 AI 思考載入指示器 |
| `DebugOverlay.tsx` | 版面除錯工具（網格疊加層、尺寸測量） |
| `Footer.tsx` | 簡單頁尾元件 |

---

## 函式庫與工具（`src/lib/`）

| 檔案 | 功能 |
|------|------|
| `api.ts` | 前端 API 客戶端，封裝所有後端呼叫 |
| `aiService.ts` | 統一 AI 服務層（串流／一般對話），支援多提供商 |
| `aiKeyStore.ts` | Zustand Store，管理 AI 提供商金鑰與用量追蹤 |
| `codeUtils.ts` | 程式碼解析、沙箱建置、iframe 執行工具 |
| `supabase.ts` | Supabase 客戶端初始化與認證方法 |
| `auth.ts` | 認證輔助函數 |
| `dbPostgres.ts` | PostgreSQL 連線池與資料庫 Schema 初始化 |
| `db.ts` | 資料庫抽象層（舊版，基於 pg） |
| `i18n.tsx` | 國際化（英文 + 繁體中文） |
| `crypto.ts` | 本地儲存中 API 金鑰的加密／解密工具 |

---

## 資料庫 Schema

資料庫在 `src/lib/dbPostgres.ts` 中初始化，包含以下資料表：

| 資料表名稱 | 說明 |
|------------|------|
| `users` | 使用者資料，關聯 Supabase Auth |
| `vibes` | 主要專案／原型 |
| `versions` | Vibe 的歷史版本 |
| `comments` | 程式碼評審／回饋留言 |
| `reactions` | 按讚／表情反應 |
| `remixes` | Fork 關係 |

---

## 開發工作流程

### 環境啟動

```bash
# 安裝相依套件
npm install

# 設定環境變數（參考下方環境變數列表）
cp .env.example .env

# 啟動開發伺服器（帶熱重載）
npm run dev
```

開發伺服器運行在 `http://localhost:5173`（前端）和 `http://localhost:3000`（API）。

Vite 設定了 `/api/*` 代理到 `localhost:3000`。

### 常用指令

```bash
npm run dev       # 啟動開發伺服器（tsx server.ts）
npm run build     # 生產建置（Vite）
npm run preview   # 預覽生產建置
npm run lint      # TypeScript 型別檢查（tsc --noEmit）
npm run clean     # 清除 dist 目錄
```

> **注意：** 專案沒有自動化測試套件，品質保證依賴 TypeScript 嚴格型別檢查和手動測試。

---

## 環境變數

| 變數名稱 | 說明 | 必填 |
|----------|------|------|
| `GEMINI_API_KEY` | Google Gemini API 金鑰（伺服器端） | 是 |
| `DATABASE_URL` | PostgreSQL 連線字串 | 是（生產） |
| `VITE_SUPABASE_URL` | Supabase 專案 URL | 是 |
| `VITE_SUPABASE_ANON_KEY` | Supabase 匿名金鑰 | 是 |
| `DISABLE_HMR` | 設為 `true` 停用 Vite HMR | 否 |

使用者 API 金鑰在客戶端透過 `src/lib/crypto.ts` 加密後儲存於 localStorage。

---

## 部署

### Vercel（生產環境，推薦）

- 建置指令：`npm run build`
- 輸出目錄：`dist`
- API 路由：透過 `vercel.json` 將 `/api/*` 重寫到 `api/index.ts`
- Serverless 函數入口：`api/index.ts`

### 本地開發

- 使用 `server.ts` 作為 Express 伺服器
- 需要 PostgreSQL 資料庫（可本地或雲端）
- 詳見 `DEPLOYMENT.md`

---

## 程式碼約定

### TypeScript

- 嚴格模式（`"strict": true`）
- 目標：ES2022
- JSX 模式：`react-jsx`（無需顯式匯入 React）
- 路徑別名：`@/*` → `src/*`

### 元件結構

- 函數式元件 + TypeScript 介面定義 props
- 頁面元件放在 `src/pages/`，可複用元件放在 `src/components/`
- 狀態管理：區域狀態用 `useState`，跨元件用 Zustand Store

### 樣式規範

- 使用 Tailwind CSS 工具類別
- 主題基於 Material Design 3 暗色調色盤，定義在 `tailwind.config.js`
- 自訂動畫定義在 `src/index.css`：`thinking-shimmer`、`thinking-float`、`dot-wave`、`glow`
- 預設深色主題，避免硬編碼顏色，優先使用 Tailwind 色彩 token

### API 規範

- 所有後端呼叫透過 `src/lib/api.ts` 中的 API 客戶端
- `server.ts` 和 `api/index.ts` 是鏡像結構，需同步修改
- REST 風格端點，JSON 請求／回應主體

### AI 整合

- 統一透過 `src/lib/aiService.ts` 呼叫
- 使用者 API 金鑰透過 `src/lib/aiKeyStore.ts`（Zustand）管理
- 金鑰在寫入 localStorage 前透過 `src/lib/crypto.ts` 加密
- 各提供商有每日用量限額

### 國際化

- 所有 UI 文字透過 `src/lib/i18n.tsx` 集中管理
- 支援語言：英文（`en`）、繁體中文（`zh`）
- 新增文字必須同時加入兩種語言的翻譯

---

## 架構要點

### 程式碼沙箱

`src/lib/codeUtils.ts` 負責在沙箱 iframe 中執行使用者程式碼：
- 解析 HTML／CSS／JS 程式碼區塊
- 建置隔離的 iframe 文件
- 攔截主控台輸出以供除錯

### 雙伺服器架構

- **開發／簡單部署：** `server.ts`（Express，含 Vite 中介軟體）
- **生產／Vercel：** `api/index.ts`（Serverless Functions）
- 修改 API 邏輯時**必須同步更新兩個檔案**

### 狀態管理

- `aiKeyStore.ts`：AI 提供商金鑰與用量追蹤（Zustand，持久化）
- 路由狀態：React Router v7
- 表單／UI 狀態：元件級 `useState`
- 無全域使用者狀態 Store，透過 Supabase 直接取得會話

---

## 注意事項

- **無自動化測試：** 修改後需手動測試，TypeScript 型別檢查是主要品質保障
- **雙端 API：** 任何 API 變更必須同時修改 `server.ts` 和 `api/index.ts`
- **金鑰安全：** 使用者 AI 金鑰僅存客戶端，伺服器端金鑰透過環境變數傳入，切勿提交 `.env` 檔案
- **資料庫初始化：** Schema 在 `dbPostgres.ts` 中自動執行建表，新增欄位需加入遷移邏輯
- **UI 設計規範：** 詳見 `CLAUDE_UI_DESIGN_GUIDE.md`，修改 UI 前請先閱讀
