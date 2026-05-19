# 账小记 - 个人记账工具

一个功能完整的个人记账 Web 应用，支持 AI 智能记账、多账户管理、预算规划、账单提醒和数据报表。

## 功能特性

- **记账管理** 收入/支出记录，支持搜索、筛选、日期范围查询
- **多账户管理** 支持银行卡、微信、支付宝、现金、信用卡等多种账户类型
- **分类管理** 自定义收入和支出分类，支持图标和颜色
- **预算规划** 按分类设置月度预算，实时跟踪进度
- **账单提醒** 周期性账单管理，逾期/已付状态标记
- **数据报表** 趋势图、分类占比图、排名统计（3/6/12 个月）
- **AI 智能记账** 自然语言输入自动解析（支持 OpenAI / DeepSeek / 自定义代理）
- **WebDAV 同步** 数据备份到自建云盘（Nextcloud、ownCloud 等），自动保留最近 10 份
- **CSV 导出** 一键导出交易数据
- **PWA 支持** 可安装到手机桌面（iOS/Android/Windows），支持离线访问
- **深色模式** 跟随系统或手动切换

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Next.js 16 (App Router) + TypeScript |
| UI | shadcn/ui + Tailwind CSS v4 |
| 图表 | Recharts |
| 图标 | Lucide React |
| 数据库 | Supabase (PostgreSQL) |
| 认证 | Supabase Auth |
| 加密 | AES-256-GCM (Web Crypto API) |
| PWA | Service Worker + Manifest + Sharp 图标生成 |

---

## 部署教程

### 方式：Vercel + Supabase（推荐）

#### 1. 创建 Supabase 项目

1. 访问 [supabase.com](https://supabase.com) 注册/登录
2. 点击 **New project** 创建新项目
3. 记下 **Project URL** 和 **anon public key**（在 Settings → API 中）
4. 进入 SQL Editor，复制粘贴 `supabase/migrations/00001_schema.sql` 并执行
5. 再执行 `supabase/migrations/00002_add_webdav_columns.sql`
6. 在 **Authentication → Settings** 中确认 Email auth provider 已启用

#### 2. 部署到 Vercel

1. 访问 [vercel.com](https://vercel.com) 登录
2. 点击 **Add New → Project**
3. 导入你的 GitHub 仓库
4. 在环境变量配置中添加：

   | 变量名 | 值 |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | 你的 Supabase 项目 URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 你的 Supabase anon key |
   | `NEXT_PUBLIC_ALLOW_REGISTRATION` | `true`（允许注册，设为 `false` 关闭注册） |
   | `AI_API_KEY` | 可选，全局 AI API Key，用户未自行配置时使用 |

5. 点击 **Deploy** 等待部署完成

> 注意：Vercel 部署时 `src/middleware.ts` 会被自动应用。

#### 3. 配置 PWA 图标（可选）

默认图标为紫色渐变背景的白色票据图案。如需自定义：
- 替换 `public/icon.svg` 为你自己的 512×512 SVG
- 重新部署后 `node scripts/generate-icons.mjs` 会自动生成 PNG 图标

### 本地运行

```bash
npm install
npm run dev
```

浏览器打开 `http://localhost:3000` 即可使用。

> 需要将 `.env.local` 中的 Supabase 变量替换为真实值，否则应用无法连接数据库。

### 配置 AI 智能记账

1. 登录后进入 **设置** 页面
2. 填写 AI 配置：

   | 字段 | 说明 |
   |---|---|
   | 提供商 | `openai`、`deepseek` 或自定义 |
   | API Key | 你的 API 密钥 |
   | 模型 | 如 `gpt-4o-mini`、`deepseek-chat` |
   | 代理地址 | 可选，使用第三方代理时填写 |

3. 点击 **测试连接** 验证配置
4. 在首页点击 **AI 记账** 按钮，输入自然语言如"今天午饭花了 35 块"即可自动解析

> API Key 使用 AES-256-GCM 加密后存入 Supabase `user_settings` 表，加密密钥由登录密码通过 PBKDF2 派生，仅在当前浏览器 sessionStorage 中缓存（关闭标签页即清除）。

### 配置 WebDAV 同步

支持 Nextcloud、ownCloud 等支持 WebDAV 协议的云盘。

1. 进入 **设置 → WebDAV 同步**
2. 填写：

   | 字段 | 说明 |
   |---|---|
   | 服务器地址 | 如 `https://example.com/remote.php/dav/files/username` |
   | 用户名 | WebDAV 用户名 |
   | 密码 | WebDAV 密码 |
   | 路径 | 备份文件存放目录，如 `/expense-tracker` |

3. 点击 **测试连接**
4. 点击 **上传同步** 备份数据，**下载恢复** 还原数据
5. 开启 **自动同步** 可按指定间隔自动备份

> 密码使用 AES-256-GCM 加密后存入 Supabase，要求使用 HTTPS 连接，HTTP（非 localhost）会被拦截。

### 注册控制

设置环境变量控制注册开关：

```
NEXT_PUBLIC_ALLOW_REGISTRATION=false   # 关闭注册
NEXT_PUBLIC_ALLOW_REGISTRATION=true    # 开启注册（默认）
```

关闭后注册按钮隐藏，API 调用也会被拒绝。

### 构建命令

```bash
npm run build    # 生产构建（自动生成 PWA 图标）
npm run dev      # 开发服务器
npm run start    # 启动生产服务器
```

---

## 安全说明

- 所有用户数据存放于 Supabase，依靠 Row Level Security 隔离
- AI API Key 和 WebDAV 密码使用 AES-256-GCM 加密后存入数据库
- 加密密钥由用户登录密码通过 PBKDF2（10 万次迭代）派生
- 密钥仅在当前浏览器 sessionStorage 中存活，关闭标签页即清除
- 密码修改时自动用新密钥重新加密已存密钥
- 根目录 `middleware.ts` 保护所有页面和 API 路由，需登录方可访问
- API 路由内二次验证用户 session，未登录返回 401

---

## 许可

MIT
