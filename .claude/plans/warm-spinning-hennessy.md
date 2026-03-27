# Plan: Vibe 公開/私人可見性 + 協作者邀請系統

## Context

目前所有 Vibe 建立後立刻公開，沒有任何可見性控制或存取權限機制。本次變更加入 GitHub 式的 public/unlisted/private 可見性等級，以及協作者邀請系統（站內 username 邀請 + 連結邀請），讓使用者能控制誰可以看到和編輯他們的作品。

---

## 1. 資料庫 Schema 變更

**檔案：`src/lib/dbPostgres.ts`**

在 `initializeDatabase()` 的現有 SQL 區塊末尾（line 82 之後）加入：

```sql
-- 可見性欄位（預設 public，既有資料不受影響）
ALTER TABLE vibes ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public';

-- 協作者表
CREATE TABLE IF NOT EXISTS collaborators (
  id SERIAL PRIMARY KEY,
  vibe_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(vibe_id, user_id)
);

-- 邀請連結表
CREATE TABLE IF NOT EXISTS invite_links (
  id SERIAL PRIMARY KEY,
  vibe_id INTEGER NOT NULL,
  token TEXT UNIQUE NOT NULL,
  created_by INTEGER NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 2. 存取控制 Helper

**檔案：`server.ts` + `api/index.ts`（兩邊都要加）**

在 API routes 之前定義共用函數：

```typescript
async function checkVibeAccess(vibeId: number | string, supabaseId: string | null) {
  // 查 vibe + owner 的 supabase_id
  // 判斷：owner → allowed | collaborator → allowed | public/unlisted → allowed | private → denied
  // 回傳 { allowed, role: 'owner'|'collaborator'|'viewer'|'none', vibe }
}
```

---

## 3. API 端點變更（server.ts + api/index.ts 同步）

### 3a. 新增 `GET /api/vibes/by-slug/:username/:slug`

**為什麼需要：** 目前 `VibeDetail.tsx` 靠 `getVibes()`（回傳全部）來用 slug 找 vibe。加了可見性過濾後，private/unlisted vibe 不會出現在 `getVibes()` 結果中，所以需要一個 server-side slug 解析端點，搭配存取控制。

- 接受 `?supabase_id=X` query param
- 用 username + slug 找 vibe（JOIN users, 比對 title slug）
- 呼叫 `checkVibeAccess` 判斷權限
- 回傳 vibe detail（含 versions, comments）或 403

### 3b. 修改 `GET /api/vibes`

- 預設只回傳 `visibility = 'public'` 的 vibes
- 加 `?supabase_id=X` 參數：額外包含該使用者自己的 vibes（所有可見性）+ 協作 vibes

### 3c. 修改 `GET /api/vibes/:id`

- 加 `?supabase_id=X` query param
- 用 `checkVibeAccess` 檢查，不允許則回 403 `{ error: 'Access denied', code: 'PRIVATE_VIBE' }`
- 回應中加入 `visibility` 和 `user_role` 欄位

### 3d. 修改 `POST /api/vibes`

- 接受 `visibility` 欄位（預設 `'public'`，驗證值域）
- INSERT 語句加入 visibility
- Remix 規則：查 parent vibe visibility，若 parent 是 private → 強制 child 為 private

### 3e. 修改 `DELETE /api/vibes/:id`

- 刪除時一併清除 `collaborators` 和 `invite_links`

### 3f. 新增 `PATCH /api/vibes/:id/visibility`

- Body: `{ supabase_id, visibility }`
- Owner-only，更新 visibility

### 3g. 新增協作者 CRUD

| 端點 | 方法 | 說明 |
|------|------|------|
| `/api/vibes/:id/collaborators` | GET | 列出協作者 |
| `/api/vibes/:id/collaborators` | POST | Body: `{ supabase_id, username }` — 用 username 新增協作者（owner-only） |
| `/api/vibes/:id/collaborators/:userId` | DELETE | Body: `{ supabase_id }` — 移除協作者（owner-only） |

### 3h. 新增邀請連結 CRUD

| 端點 | 方法 | 說明 |
|------|------|------|
| `/api/vibes/:id/invite-link` | POST | 建立邀請連結，用 `crypto.randomBytes(16).toString('hex')` 產生 token（owner-only） |
| `/api/vibes/:id/invite-link/:token` | DELETE | 撤銷邀請連結（owner-only） |
| `/api/invite/:token` | GET | 解析邀請連結，回傳 vibe 資訊 + 是否有效 |
| `/api/invite/:token/accept` | POST | Body: `{ supabase_id }` — 接受邀請，加入 collaborators |

---

## 4. 前端 API Client 變更

**檔案：`src/lib/api.ts`**

- `Vibe` interface 加 `visibility?` 和 `user_role?` 欄位
- 新增 `Collaborator` 和 `InviteLink` interface
- `createVibe()` 加 `visibility` 參數
- `getVibes(supabaseId?)` — 傳入 supabase_id 以獲取自己的 private vibes
- `getVibe(id, supabaseId?)` — 傳入 supabase_id，處理 403
- 新增方法：`getVibeBySlug(username, slug, supabaseId?)`, `updateVisibility()`, `addCollaborator()`, `removeCollaborator()`, `getCollaborators()`, `createInviteLink()`, `revokeInviteLink()`, `resolveInviteLink()`, `acceptInviteLink()`

---

## 5. 前端頁面變更

### 5a. `src/pages/Workspace.tsx` — 發布時選擇可見性

- 新增 state: `visibility`（預設 `'public'`）
- 在發布按鈕旁加三選一 pill 按鈕：Globe 圖示 Public / Link 圖示 Unlisted / Lock 圖示 Private
- `handlePublish()` 傳入 `visibility`

### 5b. `src/pages/VibeDetail.tsx` — 存取控制 + 協作者管理

- **改用 `getVibeBySlug()`** 取代現在的 `getVibes()` + client-side 過濾（line 28-49）
- 處理 403：顯示「此作品為私人，僅擁有者和協作者可查看」頁面
- 標題旁顯示可見性 badge（globe/link/lock 圖示）
- Owner 看到「管理協作者」區塊：
  - 協作者清單 + 移除按鈕
  - Username 輸入框 + 邀請按鈕
  - 產生邀請連結按鈕 + 複製 + 撤銷
  - 可見性切換下拉選單

### 5c. `src/pages/Home.tsx` — 無需大改

`getVibes()` 後端已過濾，前端不需變更。但需要傳入 `currentUser` prop 以便傳 supabase_id（如果希望首頁也顯示自己的 private vibes，否則可跳過）。

### 5d. `src/pages/Profile.tsx` — 可見性 badge + 自己的 private vibes

- `getVibes()` 呼叫時傳入 supabase_id，讓 owner 能看到自己的 private/unlisted vibes
- VibeCard 上顯示可見性 icon（僅 owner 自己看到）

### 5e. 新增 `src/pages/InviteAccept.tsx` — 邀請接受頁面

- 新路由 `/invite/:token`（加到 `src/App.tsx`）
- 未登入：顯示登入提示
- 已登入：顯示邀請資訊 + 「接受邀請」按鈕
- 接受後導向 vibe detail 頁

### 5f. `src/pages/RemixStudio.tsx` — Remix 可見性規則

- 從 parent vibe 帶入 visibility
- Parent 是 private → visibility 鎖定 private，UI 顯示提示
- 其他情況預設跟隨 parent 但可修改

### 5g. `src/components/VibeCard.tsx` — 可見性 badge

- 非 public 時在卡片角落顯示小 icon（lock / link）

---

## 6. i18n

**檔案：`src/lib/i18n.tsx`**

新增 key（en + zh-TW）：
- `visibility_*` — 可見性相關文字
- `collab_*` — 協作者管理
- `invite_*` — 邀請連結
- `access_denied*` — 存取被拒

---

## 7. 實作順序

| 步驟 | 內容 | 檔案 |
|------|------|------|
| 1 | DB schema（visibility 欄位 + 新表） | `dbPostgres.ts` |
| 2 | `checkVibeAccess` helper + `GET /api/vibes/by-slug` | `server.ts`, `api/index.ts` |
| 3 | 修改既有 API（GET vibes 過濾、GET vibe/:id 權限、POST vibes 接受 visibility、DELETE cascade） | `server.ts`, `api/index.ts` |
| 4 | 新增協作者 + 邀請連結 API 端點 | `server.ts`, `api/index.ts` |
| 5 | 前端 api.ts 更新（types + 新方法） | `api.ts` |
| 6 | i18n 翻譯 key | `i18n.tsx` |
| 7 | Workspace 可見性選擇器 | `Workspace.tsx` |
| 8 | VibeDetail 權限處理 + 協作者管理 UI | `VibeDetail.tsx` |
| 9 | InviteAccept 新頁面 + App.tsx 路由 | `InviteAccept.tsx`, `App.tsx` |
| 10 | Profile + VibeCard 可見性 badge | `Profile.tsx`, `VibeCard.tsx` |
| 11 | RemixStudio 可見性規則 | `RemixStudio.tsx` |

---

## 8. 驗證方式

1. **DB migration**：啟動 dev server，確認 `vibes` 表有 `visibility` 欄位，`collaborators` 和 `invite_links` 表存在
2. **API 過濾**：建立一個 private vibe，確認它不出現在 `GET /api/vibes` 結果中
3. **存取控制**：未授權使用者存取 private vibe 的 detail API，確認回 403
4. **發布流程**：在 Workspace 選擇不同 visibility 發布，確認正確儲存
5. **協作者**：Owner 邀請 username，被邀請者能存取 private vibe
6. **邀請連結**：產生連結 → 另一使用者點連結接受 → 確認成為 collaborator
7. **Remix 規則**：Remix 一個 private vibe，確認 child 被強制為 private
8. **Profile**：Owner 看得到自己的 private vibes，訪客看不到
9. **TypeScript**：`npm run lint` 通過（tsc --noEmit）
