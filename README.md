# LeapMeme (LEAP)

对标 [Alt Fun](https://alt.fun/) 的 Web3 发币平台，运行于 [HyperEVM](https://hyperliquid.xyz/)（Chain ID `999`）。

本仓库是 **多模块单体仓库**：前端链上交互、后端 API / 链上索引、数据库迁移与自有合约同仓维护。


| 目录                         | 说明                                                 |
| -------------------------- | -------------------------------------------------- |
| `[backend/](backend/)`     | Go API：Gin + GORM + MySQL；链上 Indexer、K 线、Market 查询 |
| `[web/](web/)`             | Next.js 前端（钱包 / 发币 / 交易），API 契约见 `web/lib/apis/`   |
| `[database/](database/)`   | MySQL 版本化迁移                                        |
| `[contracts/](contracts/)` | 自有合约（Foundry）；现网仍可对接 Alt Fun 同款地址                  |
| `[docs/](docs/)`           | 架构与开发约定                                            |


## 当前进度


| 模块                  | 状态                                  |
| ------------------- | ----------------------------------- |
| 前端 `web/`           | 可用；链上逻辑见 `web/lib/contracts/`       |
| 后端 Market / K 线 API | 已实现（对齐 `web/lib/apis/`）             |
| 链上 Indexer          | 已实现（Zap / Bonding 事件 → 落库，支持 reorg） |
| 鉴权 `/auth/*`        | 框架保留，暂不对外暴露                         |
| 自有合约 `contracts/`   | Foundry 工程就绪；现网默认可切 Alt Fun 生产地址    |


API 契约以 `web/lib/apis/` 的 TypeScript 类型与调用为准，**不要参考** `web/docs/`。

## 技术栈

- **前端**：Next.js、Privy、viem / wagmi
- **后端**：Go 1.24、Gin、GORM、golang-migrate、可选 Redis
- **数据**：MySQL 8.4
- **合约**：Foundry（`forge` / `cast` / `anvil`）
- **基础设施**：Docker Compose（MySQL + Redis + 可选 Backend 镜像）



## 仓库结构

```
LeapMeme/
├── backend/                 # Go 后端（module: github.com/leap/backend）
│   ├── internal/
│   │   ├── controller/      # HTTP 入口
│   │   ├── service/         # 业务逻辑
│   │   ├── model/           # GORM / 迁移加载
│   │   ├── indexer/         # 链上事件索引
│   │   ├── kline/           # K 线聚合与 WebSocket
│   │   └── router/          # 路由注册
│   └── .env.example
├── web/                     # Next.js 前端
├── database/migrations/     # SQL 迁移（000001 … 000007）
├── contracts/               # 自有合约 + 本地部署脚本
├── docs/
├── docker-compose.yml
└── Makefile
```



## 快速开始



### 前置要求

- Go 1.24+
- Node.js + [pnpm](https://pnpm.io/)
- Docker（MySQL / Redis）
- （可选）[Foundry](https://book.getfoundry.sh/) — 本地合约联调



### 1. 基础设施

```bash
# 或 make infra-up
docker compose up -d mysql redis
```


| 服务                 | 宿主机端口          |
| ------------------ | -------------- |
| MySQL              | `13306` → 3306 |
| Redis              | `56379` → 6379 |
| Backend（compose 内） | `8080`         |


默认库名：`leap_backend`，root 密码：`password`。

> Windows 下 Compose 默认把数据卷绑到 `D:/cache/docker/leap/`；若路径不适用，请改 `docker-compose.yml` 中的 `volumes`。



### 2. 后端

```bash
cd backend
cp .env.example .env
go mod tidy
go run .
# 或在仓库根目录：make backend-run
```

启动时若 `RUN_MIGRATIONS=true`，会按 `MIGRATIONS_PATH`（默认 `../database/migrations`）自动迁移。

常用环境变量见 `backend/.env.example`：


| 变量                           | 说明                         |
| ---------------------------- | -------------------------- |
| `MYSQL_DSN`                  | MySQL 连接串（本地示例已指向 `13306`） |
| `REDIS_CONN_STRING`          | 可选 Redis                   |
| `INDEXER_ENABLED`            | 是否开启链上索引（默认 `false`）       |
| `CHAIN_RPC_URL` / `CHAIN_ID` | HyperEVM RPC 与链 ID         |
| `ZAP_ADDRESS` 等              | 协议合约地址（默认可填 Alt Fun 生产地址）  |


健康检查：`GET http://127.0.0.1:8080/health`

### 3. 前端

```bash
cd web
cp .env.example .env.development   # 按需填写 Privy / API Base URL
pnpm install
pnpm dev
# 或在仓库根目录：make web-dev
```

将 `NEXT_PUBLIC_MEME_SERVER_BASE_URL` 指向本地后端（例如 `http://127.0.0.1:8080`）即可联调 Market API。

### 4. 一键 Compose 后端（可选）

```bash
docker compose up -d --build
```

会拉起 MySQL、Redis 与 `backend` 服务（端口 `8080`）。

## 主要 API（后端）


| 路径                            | 说明                 |
| ----------------------------- | ------------------ |
| `GET /health` / `GET /ready`  | 探活 / 就绪            |
| `GET /metrics`                | Prometheus 指标      |
| `GET /api/v1/system/info`     | 系统信息               |
| `GET /market/markets`         | Account / 市场列表     |
| `GET /market/token/*`         | Token 列表、详情、成交、持仓等 |
| `GET /market/protocol/config` | 协议经济参数             |
| `GET /market/kline/list`      | K 线查询              |
| `POST /market/kline/backfill` | K 线历史回填            |
| `GET /ws/kline`               | K 线 WebSocket      |


完整契约以 `web/lib/apis/` 为准。

## Makefile

```bash
make infra-up      # 启动 MySQL + Redis
make infra-down    # 停止容器
make backend-run   # 本地运行后端
make backend-test  # go test ./...
make web-dev       # 前端开发服务器
```

## 合约（可选）

现网链上交互可继续使用 Alt Fun 同款地址（见 `web/.env.example` / `backend/.env.example`）。自有合约开发：

```bash
cd contracts
bash scripts/install-deps.sh
forge build && forge test
```

详见 [contracts/README.md](contracts/README.md) 与 [contracts/docs/](contracts/docs/)。

## 开发约定

- 后端分层：Router → Controller → Service → Model
- JSON：`backend/common/json.go`
- 错误：`pkg/apperror` + `pkg/response`
- 新增业务模块步骤：[docs/ADD_MODULE.md](docs/ADD_MODULE.md)


## 文档索引


| 文档                                           | 内容     |
| -------------------------------------------- | ------ |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 架构说明   |
| [docs/ADD_MODULE.md](docs/ADD_MODULE.md)     | 新增后端模块 |
| [database/README.md](database/README.md)     | 数据库与迁移 |
| [contracts/README.md](contracts/README.md)   | 自有合约   |
| [web/README.md](web/README.md)               | 前端说明   |


