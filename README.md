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
- **双模式** 支持 Supabase 云端部署或 localStorage 本地运行

## 技术栈

| 层 | 技术 |
| --- | --- |
| 框架 | Next.js 16 (App Router) + TypeScript |
| UI | shadcn/ui + Tailwind CSS v4 |
| 图表 | Recharts |
| 图标 | Lucide React |
| 数据库 | Supabase (PostgreSQL) / localStorage 回退 |
| 认证 | Supabase Auth / 本地 PBKDF2 哈希认证 |
| 加密 | AES-256-GCM (Web Crypto API) |
| PWA | Service Worker + Manifest + Sharp 图标生成 |

---

## 部署教程

### 方案一：Vercel + Supabase（推荐）

#### 1. 创建 Supabase 项目

1. 访问 [supabase.com](https://supabase.com) 注册/登录
2. 点击 **New project** 创建新项目
3. 记下 **Project URL** 和 **anon public key**（在 Settings → API 中）
4. 进入 SQL Editor，复制粘贴 `supabase/migrations/00001_schema.sql` 中的 SQL 并执行
5. 在 **Authentication → Settings** 中确认 Email auth provider 已启用

#### 2. 部署到 Vercel

1. 访问 [vercel.com](https://vercel.com) 登录
2. 点击 **Add New → Project**
3. 导入你的 GitHub 仓库
4. 在环境变量配置中添加：

   | 变量名 | 值 |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | 你的 Supabase 项目 URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 你的 Supabase anon key |
   | `NEXT_PUBLIC_ALLOW_REGISTRATION` | `true`（允许注册，设为 `false` 关闭注册） |

5. 点击 **Deploy** 等待部署完成

#### 3. 配置 PWA 图标（可选）

默认图标为紫色渐变背景的白色票据图案。如需自定义：
- 替换 `public/icon.svg` 为你自己的 512×512 SVG
- 重新部署后 `node scripts/generate-icons.mjs` 会自动生成 PNG 图标

### 方案二：纯本地运行（无需服务器）

```
npm install
npm run dev
```

浏览器打开 `http://localhost:3000` 即可使用。所有数据存储在浏览器 localStorage 中，无需任何外部服务。

> 注意：本地模式下 `.env.local` 中的 Supabase 变量可以保持为 placeholder 值。

### 配置 AI 智能记账

1. 登录后进入 **设置** 页面
2. 填写 AI 配置：

   | 字段 | 说明 |
   | --- | --- |
   | 提供商 | `openai`、`deepseek` 或自定义 |
   | API Key | 你的 API 密钥 |
   | 模型 | 如 `gpt-4o-mini`、`deepseek-chat` |
   | 代理地址 | 可选，使用第三方代理时填写 |

3. 点击 **测试连接** 验证配置
4. 在首页点击 **AI 记账** 按钮，输入自然语言如 "今天午饭花了 35 块" 即可自动解析

### 配置 WebDAV 同步

支持 Nextcloud、ownCloud 等支持 WebDAV 协议的云盘。

1. 进入 **设置 → WebDAV 同步**
2. 填写：

   | 字段 | 说明 |
   | --- | --- |
   | 服务器地址 | 如 `https://example.com/remote.php/dav/files/username` |
   | 用户名 | WebDAV 用户名 |
   | 密码 | WebDAV 密码 |
   | 路径 | 备份文件存放目录，如 `/expense-tracker` |

3. 点击 **测试连接**
4. 点击 **上传同步** 备份数据，**下载恢复** 还原数据

> 密码使用 AES-256-GCM 加密存储，加密密钥由登录密码派生，保存在 sessionStorage 中（关闭标签页即清除）。

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

## 本地存储说明

Supabase 不可用时自动回退到 localStorage，数据键名均以 `expense_tracker_` 为前缀：
- `expense_tracker_transactions` - 交易记录
- `expense_tracker_categories` - 分类
- `expense_tracker_accounts` - 账户
- `expense_tracker_budgets` - 预算
- `expense_tracker_bills` - 账单
- `expense_tracker__users` - 用户（密码经 PBKDF2 哈希）
- `expense_tracker__session` - 会话
- `expense_tracker__webdav_config` - WebDAV 配置（密码加密）

---

## 许可证

MIT
