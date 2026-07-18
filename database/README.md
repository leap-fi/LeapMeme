# Database

MySQL schema 与版本化迁移（[golang-migrate](https://github.com/golang-migrate/migrate)）。

库名默认：`leap_backend`。本地 Docker 端口：`13306`。

## 迁移一览

```
database/migrations/
├── 000001_init              # users / options / setups
├── 000002_indexer           # indexer_cursors / tokens / trades
├── 000003_token_meta        # logo / description / 社交字段
├── 000004_token_zap         # tokens.zap_address
├── 000005_kline             # klines
├── 000006_trade_idempotency # trades: chain_id + log_index 幂等
└── 000007_indexer_reorg     # indexer_blocks / trades.block_hash（reorg）
```

每个版本成对提供 `{version}_{name}.up.sql` / `.down.sql`。

## 与后端的关系

- 启动时若 `RUN_MIGRATIONS=true`，读取 `MIGRATIONS_PATH`（相对 `backend/` 工作目录，默认 `../database/migrations`）
- Docker 构建会把本目录复制进镜像内的 `migrations/`（见 `docker-compose.yml` / `backend/Dockerfile`）

## 手动迁移（可选）

```bash
migrate -path database/migrations \
  -database "mysql://root:password@tcp(127.0.0.1:13306)/leap_backend?multiStatements=true" up
```

需安装 [golang-migrate](https://github.com/golang-migrate/migrate) CLI。

## 新增迁移

1. 新增 `00000N_xxx.up.sql` / `.down.sql`（序号递增、勿改已合并的历史文件）
2. 同步 `backend/internal/model/` 中的 GORM 模型（若有）
3. 本地用空库或 `migrate up` 验证后再提交
