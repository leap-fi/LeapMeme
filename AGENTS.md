# AGENTS.md — LEAP

## 仓库结构

| 目录 | 职责 |
|------|------|
| `backend/` | Go API：`github.com/leap/backend` |
| `web/` | Next.js 前端，API 契约见 `web/lib/apis/` |
| `database/migrations/` | SQL 迁移（后端 `MIGRATIONS_PATH=../database/migrations`） |
| `contracts/` | 自有合约（Foundry）；开发文档见 `contracts/docs/`；现网链上逻辑在 `web/lib/contracts/` |

产品对标 [Alt Fun](https://alt.fun/)。先反推 API，自有合约最后接入。**暂不开发业务 API。**

## 后端关键路径

| 职责 | 路径 |
|------|------|
| 启动 | `backend/internal/app/bootstrap.go` |
| 路由 | `backend/internal/router/router.go` |
| 鉴权框架 | `backend/internal/middleware/auth.go` |
| 迁移读取 | `backend/internal/model/migrate.go` |

## 规则

- JSON 走 `backend/common/json.go`
- 错误走 `pkg/apperror` + `pkg/response`
- 勿参考 `web/docs/`；以 `web/lib/apis/` TS 类型为准
- Cursor 规则：`***REMOVED***/rules/project.mdc`
