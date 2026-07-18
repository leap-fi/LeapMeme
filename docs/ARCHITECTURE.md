# 架构说明

## 仓库组成

```
LeapMeme/
├── backend/     Go HTTP API + 链上 Indexer + K 线
├── web/         Next.js 前端（钱包 / 发币 / 交易）
├── database/    MySQL 版本化迁移
├── contracts/   自有合约（Foundry）；现网可切 Alt Fun 同款地址
└── docs/        本文件等仓库级文档
```

| 层 | 职责 |
|----|------|
| `web/` | UI、钱包签名、链上写操作（create / buy / sell） |
| `backend/` | HTTP 读模型、事件索引落库、K 线聚合、协议参数同步 |
| `contracts/` | 自有协议实现；本地 Anvil 联调见 `contracts/README.md` |
| `database/` | Schema 真相源（`migrations/`） |

链上写路径现阶段由前端直接调合约；后端通过 Indexer 消费事件构建查询侧数据。

## 后端分层

```
HTTP / WS
    → middleware（CORS、限流、日志、metrics …）
    → controller
    → service
    → model → MySQL
         ↑
    indexer / job / kline   （后台：扫块、任务、K 线引擎）
```

代码位于 `backend/internal/`，模块路径 `github.com/leap/backend`。

| 包 | 职责 |
|----|------|
| `router` | 路由注册 |
| `controller` / `service` / `dto` / `model` | 标准业务分层 |
| `indexer` | Zap / Bonding 等事件 → tokens / trades，支持 reorg |
| `kline` | 成交聚合 K 线 + `GET /ws/kline` |
| `job` | 定时任务（`ENABLE_JOBS`） |
| `middleware` | 鉴权框架等（`/auth/*` 暂未对外暴露） |

## 数据流（简化）

```
链上事件 ──Indexer──► MySQL（tokens / trades / klines / cursors）
                              │
前端 /market/*  ◄── HTTP/WS ──┘
前端 ──tx──► 合约（Zap 等）
```

## 数据库

- Schema：`database/migrations/`（见 [database/README.md](../database/README.md)）
- 后端通过 `MIGRATIONS_PATH` 加载（本地默认 `../database/migrations`）
- `RUN_MIGRATIONS=true` 时启动自动迁移

## 对齐前端

实现或变更 API 前阅读 `web/lib/apis/` 对应模块的类型与 fetch 调用，**勿以** `web/docs/` 为准。

## 扩展

- 新路由：`backend/internal/router/`
- 新表：`database/migrations/` + `backend/internal/model/`
- 步骤见 [ADD_MODULE.md](ADD_MODULE.md)
