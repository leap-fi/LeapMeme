# LEAP

对标 [Alt Fun](https://alt.fun/) 的 Web3 发币平台（Hyperliquid perps 背书）。本仓库为 **多模块单体仓库**：

| 目录 | 说明 |
|------|------|
| `backend/` | Go API 服务（Gin + GORM + MySQL） |
| `web/` | Next.js 前端（已开发完成） |
| `database/` | MySQL 迁移 SQL、数据库相关说明 |
| `contracts/` | 智能合约（预留；现阶段沿用 Alt Fun 同款合约） |
| `docs/` | 仓库级架构与开发约定 |

## 我们在做什么

1. **前端** `web/` 已就绪，链上交互现阶段使用 Alt Fun 同款合约（见 `web/lib/contracts/`）。
2. **后端** 根据 `web/lib/apis/` 反推并实现 API，最终让前端从第三方 API 切到 `backend/`。
3. **当前阶段**：框架可运行；业务 API 尚未开发。

API 契约以 `web/lib/apis/` 为准，**不要参考** `web/docs/`。

## 目录结构

```
leap/
├── backend/           # Go 后端
├── web/               # Next.js 前端
├── database/
│   └── migrations/    # SQL 版本化迁移
├── contracts/         # 自有合约（后续）
├── docs/
├── docker-compose.yml # MySQL + Redis + Backend
└── Makefile
```

## 快速开始（后续开发时）

```bash
# 基础设施
docker compose up -d mysql redis

# 后端
cd backend && cp .env.example .env && go mod tidy && go run .

# 前端
cd web && pnpm install && pnpm dev
```

## 文档

- [AGENTS.md](AGENTS.md) — Agent 速查
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — 架构说明
- [docs/ADD_MODULE.md](docs/ADD_MODULE.md) — 新增后端模块
- [database/README.md](database/README.md) — 数据库与迁移
- [contracts/README.md](contracts/README.md) — 合约模块说明
