# CLAUDE.md — AI 助手开发指南

本文件为 AI 编程助手提供关于 VibeJam（The Bower）代码库的结构、开发工作流和约定规范。

---

## 项目概述

**VibeJam（The Bower）** 是一个基于浏览器的协作代码原型平台，支持 AI 辅助代码生成。用户可以创建、分享、改编（Remix）交互式 Web 项目（称为"Vibes"），并通过多个 AI 提供商获取代码生成支持。

**主要功能：**
- 实时代码编辑与沙箱 iframe 预览
- 多版本控制系统
- Remix（Fork）机制
- 多语言支持（简体/繁体中文 + 英文）
- 多 AI 提供商集成（Gemini、OpenAI、MiniMax 等）
- 用户认证（Supabase Auth）
- 调试布局叠加层工具

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | React 19 + TypeScript |
| 路由 | React Router v7 |
| 状态管理 | Zustand 5 |
| 样式 | Tailwind CSS 3（Material Design 3 主题） |
| 动画 | Motion 12 |
| 图标 | Lucide React + Material Symbols |
| 构建工具 | Vite 6 |
| 后端（开发） | Express 4（tsx 热重载） |
| 后端（生产） | Vercel Serverless Functions |
| 数据库 | PostgreSQL（pg 驱动） |
| 认证 | Supabase Auth（GitHub OAuth + Email） |
| AI 集成 | @google/genai（Gemini），多提供商支持 |

---

## 目录结构

```
vibejam/
├── src/
│   ├── pages/          # 页面级组件
│   ├── components/     # 可复用 UI 组件
│   ├── lib/            # 业务逻辑与工具函数
│   ├── App.tsx         # 根组件与路由配置
│   ├── main.tsx        # React 挂载入口
│   └── index.css       # 全局样式与自定义动画
├── api/
│   └── index.ts        # Vercel Serverless API 端点
├── server.ts           # Express 开发服务器（兼顾生产）
├── seed.ts             # 数据库种子数据脚本
├── vite.config.ts      # Vite 构建配置
├── tailwind.config.js  # Tailwind CSS 配置（含 MD3 颜色）
├── tsconfig.json       # TypeScript 配置
├── vercel.json         # Vercel 部署配置
├── DEPLOYMENT.md       # 部署指南（繁体中文）
└── CLAUDE_UI_DESIGN_GUIDE.md  # UI 设计规范（繁体中文）
```

---

## 页面组件（`src/pages/`）

| 文件 | 路由 | 功能 |
|------|------|------|
| `Home.tsx` | `/` | 发现页，展示 Vibe 卡片，支持分类筛选 |
| `Workspace.tsx` | `/workspace` | 主要代码编辑器 + 实时预览工作台 |
| `RemixStudio.tsx` | `/remix/:id` | 基于已有 Vibe 创建 Remix 的界面 |
| `IterationLab.tsx` | `/iteration` | 协作迭代编辑工作台 |
| `VibeDetail.tsx` | `/vibe/:id` | 单个 Vibe 详情，含版本历史与评论 |
| `Profile.tsx` | `/profile/:id` | 用户主页，展示已保存/创建的 Vibes |
| `AIChat.tsx` | `/chat` | AI 对话界面，支持模型切换 |
| `Settings.tsx` | `/settings` | 用户设置与 API 密钥配置 |

---

## 核心组件（`src/components/`）

| 文件 | 功能 |
|------|------|
| `AuthModal.tsx` | 认证弹窗（登录/注册/密码重置），含社交登录 |
| `Sidebar.tsx` | 左侧导航栏，含菜单链接 |
| `Navbar.tsx` | 顶部导航，含搜索框与用户菜单 |
| `VibeCard.tsx` | Vibe 预览卡片组件 |
| `BottomTabBar.tsx` | 移动端底部标签栏 |
| `ThinkingLoader.tsx` | 带脉冲动画的 AI 思考加载指示器 |
| `DebugOverlay.tsx` | 布局调试工具（网格叠加层、尺寸测量） |
| `Footer.tsx` | 简单页脚组件 |

---

## 库与工具（`src/lib/`）

| 文件 | 功能 |
|------|------|
| `api.ts` | 前端 API 客户端，封装所有后端调用 |
| `aiService.ts` | 统一 AI 服务层（流式/普通对话），支持多提供商 |
| `aiKeyStore.ts` | Zustand Store，管理 AI 提供商密钥与用量追踪 |
| `codeUtils.ts` | 代码解析、沙箱构建、iframe 执行工具 |
| `supabase.ts` | Supabase 客户端初始化与认证方法 |
| `auth.ts` | 认证辅助函数 |
| `dbPostgres.ts` | PostgreSQL 连接池与数据库 Schema 初始化 |
| `db.ts` | 数据库抽象层（旧版，基于 pg） |
| `i18n.tsx` | 国际化（英文 + 繁体中文） |
| `crypto.ts` | 本地存储中 API 密钥的加密/解密工具 |

---

## 数据库 Schema

数据库在 `src/lib/dbPostgres.ts` 中初始化，包含以下表：

| 表名 | 说明 |
|------|------|
| `users` | 用户资料，关联 Supabase Auth |
| `vibes` | 主要项目/原型 |
| `versions` | Vibe 的历史版本 |
| `comments` | 代码评审/反馈评论 |
| `reactions` | 点赞/表情反应 |
| `remixes` | Fork 关系 |

---

## 开发工作流

### 环境启动

```bash
# 安装依赖
npm install

# 配置环境变量（参考下方环境变量列表）
cp .env.example .env

# 启动开发服务器（带热重载）
npm run dev
```

开发服务器运行在 `http://localhost:5173`（前端）和 `http://localhost:3000`（API）。

Vite 配置了 `/api/*` 代理到 `localhost:3000`。

### 常用命令

```bash
npm run dev       # 启动开发服务器（tsx server.ts）
npm run build     # 生产构建（Vite）
npm run preview   # 预览生产构建
npm run lint      # TypeScript 类型检查（tsc --noEmit）
npm run clean     # 清除 dist 目录
```

> **注意：** 项目没有自动化测试套件，质量保证依赖 TypeScript 严格类型检查和手动测试。

---

## 环境变量

| 变量名 | 说明 | 必须 |
|--------|------|------|
| `GEMINI_API_KEY` | Google Gemini API 密钥（服务端） | 是 |
| `DATABASE_URL` | PostgreSQL 连接字符串 | 是（生产） |
| `VITE_SUPABASE_URL` | Supabase 项目 URL | 是 |
| `VITE_SUPABASE_ANON_KEY` | Supabase 匿名密钥 | 是 |
| `DISABLE_HMR` | 设为 `true` 禁用 Vite HMR | 否 |

用户 API 密钥在客户端通过 `src/lib/crypto.ts` 加密后存储于 localStorage。

---

## 部署

### Vercel（生产环境，推荐）

- 构建命令：`npm run build`
- 输出目录：`dist`
- API 路由：通过 `vercel.json` 将 `/api/*` 重写到 `api/index.ts`
- Serverless 函数入口：`api/index.ts`

### 本地 / Railway / Render

- 使用 `server.ts` 作为 Express 服务器
- 需要 PostgreSQL 数据库（可本地或云端）
- 详见 `DEPLOYMENT.md`

---

## 代码约定

### TypeScript

- 严格模式（`"strict": true`）
- 目标：ES2022
- JSX 模式：`react-jsx`（无需显式导入 React）
- 路径别名：`@/*` → `src/*`

### 组件结构

- 功能组件 + TypeScript 接口定义 props
- 页面组件放在 `src/pages/`，可复用组件放在 `src/components/`
- 状态管理：局部状态用 `useState`，跨组件用 Zustand Store

### 样式规范

- 使用 Tailwind CSS 工具类
- 主题基于 Material Design 3 暗色调色板，定义在 `tailwind.config.js`
- 自定义动画定义在 `src/index.css`：`thinking-shimmer`、`thinking-float`、`dot-wave`、`glow`
- 默认深色主题，避免硬编码颜色，优先使用 Tailwind 色彩 token

### API 规范

- 所有后端调用通过 `src/lib/api.ts` 中的 API 客户端
- `server.ts` 和 `api/index.ts` 是镜像结构，需同步修改
- REST 风格端点，JSON 请求/响应体

### AI 集成

- 统一通过 `src/lib/aiService.ts` 调用
- 用户 API 密钥通过 `src/lib/aiKeyStore.ts`（Zustand）管理
- 密钥在写入 localStorage 前通过 `src/lib/crypto.ts` 加密
- 各提供商有每日用量限额

### 国际化

- 所有 UI 文字通过 `src/lib/i18n.tsx` 集中管理
- 支持语言：英文（`en`）、繁体中文（`zh`）
- 新增文本必须同时添加两种语言的翻译

---

## 架构要点

### 代码沙箱

`src/lib/codeUtils.ts` 负责在沙箱 iframe 中执行用户代码：
- 解析 HTML/CSS/JS 代码块
- 构建隔离的 iframe 文档
- 拦截控制台输出以供调试

### 双服务器架构

- **开发/简单部署：** `server.ts`（Express，含 Vite 中间件）
- **生产/Vercel：** `api/index.ts`（Serverless Functions）
- 修改 API 逻辑时**必须同步更新两个文件**

### 状态管理

- `aiKeyStore.ts`：AI 提供商密钥与用量追踪（Zustand，持久化）
- 路由状态：React Router v7
- 表单/UI 状态：组件级 `useState`
- 无全局用户状态 Store，通过 Supabase 直接获取会话

---

## 注意事项

- **无自动化测试：** 修改后需手动测试，TypeScript 类型检查是主要质量保障
- **双端 API：** 任何 API 变更必须同时修改 `server.ts` 和 `api/index.ts`
- **密钥安全：** 用户 AI 密钥仅存客户端，服务端密钥通过环境变量传入，切勿提交 `.env` 文件
- **数据库初始化：** Schema 在 `dbPostgres.ts` 中自动执行建表，新增字段需添加迁移逻辑
- **UI 设计规范：** 详见 `CLAUDE_UI_DESIGN_GUIDE.md`，修改 UI 前请阅读
