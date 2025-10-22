# ChronoWear AI - 智能时尚助手

> 🤖 基于 AI 的个性化时尚推荐系统，帮助用户发现完美搭配
> 
> 注意：本应用为移动端优先（Mobile-first）设计。请以手机尺寸进行体验与测试，所有 UI 位置（如底部提示、导航栏）均针对手机优化。

## 🌟 项目概述

ChronoWear AI 是一个现代化的智能时尚助手应用，结合人工智能技术为用户提供个性化的穿搭建议。项目采用 React + TypeScript + Supabase 技术栈，提供完整的用户管理、时尚趋势分析和个人衣橱管理功能。

## 🚀 核心功能

### 👤 用户管理
- **智能认证系统**: Google OAuth + 邮箱登录
- **用户活动跟踪**: 登录行为分析和用户画像
- **个人资料管理**: 身体数据、风格偏好、尺寸信息

### 🎨 时尚服务
- **AI 每日推荐**: 基于天气、场合、个人偏好的智能搭配
- **趋势分析**: 实时时尚趋势和流行元素追踪
- **搭配保存**: 用户收藏和创建的完整穿搭方案
- **AI 计划**: 中长期穿搭计划和风格提升建议

### 👗 衣橱管理
- **数字衣橱**: 服装和配饰的详细清单管理
- **穿搭日志**: 日常穿搭记录和满意度评分
- **使用分析**: 服装使用频率和搭配建议

## 🛠️ 技术架构

### 前端技术栈
- **React 18** - 现代化用户界面
- **TypeScript** - 类型安全的开发体验
- **Vite** - 快速的构建工具
- **Tailwind CSS** - 实用优先的 CSS 框架

### 后端服务
- **Supabase** - 现代化的 Backend-as-a-Service
- **PostgreSQL** - 企业级关系型数据库
- **Row Level Security** - 数据安全访问控制
- **实时订阅** - 实时数据同步

### 数据库架构 (8表设计)
```
📊 完整数据模型
├── profiles - 用户资料和活动跟踪
├── user_settings - 个性化设置  
├── trends - 时尚趋势管理
├── saved_outfits - 保存的搭配方案
├── todays_picks - AI 每日推荐
├── ai_plans - AI 生成的计划
├── wardrobe_items - 衣橱物品清单
└── outfit_logs - 穿搭记录日志
```

## 🚀 快速开始

### 环境要求
- Node.js 18+ 
- npm 或 yarn
- Supabase 账户

### 安装步骤

1. **克隆仓库**
```bash
git clone https://github.com/laiyinyizao007/chronowear-code.git
cd chronowear-code
```

2. **安装依赖**
```bash
npm install
```

3. **环境配置**
```bash
# 复制环境变量模板
# 配置 Supabase 连接信息
# VITE_SUPABASE_URL=your_supabase_url
# VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. **数据库设置**
```bash
# 在 Supabase Dashboard > SQL Editor 中执行:
# 1. add-activity-fields-to-profiles.sql
# 2. add-table-descriptions-sql.sql
```

5. **启动应用**
```bash
npm run dev
```

访问 http://localhost:5173 开始使用！

## 📋 项目状态

### ✅ 已完成功能
- [x] 完整的 8 表数据库架构
- [x] 用户认证和活动跟踪系统
- [x] 核心业务逻辑实现  
- [x] TypeScript 类型安全
- [x] 实时数据同步
- [x] 响应式设计

### 🔄 开发进度
- **项目完成度**: 95%
- **核心功能**: ✅ 完成
- **数据库集成**: ⚠️ 需执行 2 个 SQL 脚本
- **用户体验**: ✅ 优化完成

### 🚀 即将上线
仅需在 Supabase 中执行最后的数据库脚本即可完全就绪！

## 🧪 测试和验证

### 数据库集成测试
```bash
node test-activity-integration.js
```

### 用户认证测试  
```bash
# 访问测试页面
http://localhost:5173/auth
```

### 功能验证脚本
```bash
node test-database-comprehensive.js
node test-user-activity.js  
```

## 📁 项目结构

```
chronowear-code/
├── src/
│   ├── components/        # React 组件
│   ├── pages/            # 页面组件
│   ├── utils/            # 工具函数
│   ├── integrations/     # 第三方集成
│   └── types/            # TypeScript 类型
├── supabase/             # 数据库配置
├── public/               # 静态资源
├── tests/                # 测试脚本
└── docs/                 # 项目文档
```

## 🔧 开发工具

### SQL 脚本
- `add-activity-fields-to-profiles.sql` - 用户活动跟踪字段
- `add-table-descriptions-sql.sql` - 数据库表描述
- `complete-database-schema.sql` - 完整数据库架构

### 验证脚本  
- `test-activity-integration.js` - 活动跟踪集成测试
- `test-database-comprehensive.js` - 数据库完整性测试
- `setup-completion-checklist.md` - 部署检查清单
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/41d5711a-47c1-494d-9d2e-b4f10dd510aa) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
