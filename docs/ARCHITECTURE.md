# 架构说明

## 仓库组成

```
leap/
├── backend/     Go HTTP API
├── web/         Next.js 前端（Alt Fun 同款流程）
├── database/    MySQL 迁移与说明
├── contracts/   自有合约（预留）
└── docs/        本文件等仓库级文档
```

后端职责：承接前端 HTTP API、链下持久化与聚合。链上交互现阶段由 `web/` + Alt Fun 同款合约完成。

## 后端分层

```
HTTP Request
    → middleware
    → controller
    → service
    → model → MySQL
```

代码位于 `backend/internal/`，模块路径 `github.com/leap/backend`。

## 数据库

- Schema：`database/migrations/`
- 后端通过 `MIGRATIONS_PATH` 加载（本地默认 `../database/migrations`）

## 对齐前端

实现 API 前阅读 `web/lib/apis/` 对应模块的类型与 fetch 调用，**勿以** `web/docs/` 为准。

## 扩展

- 新路由：`backend/internal/router/`
- 新表：`database/migrations/` + `backend/internal/model/`
- 步骤见 [ADD_MODULE.md](ADD_MODULE.md)
