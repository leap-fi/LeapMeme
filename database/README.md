# Database

MySQL  schema 与版本化迁移。

## 迁移文件

```
database/migrations/
├── 000001_init.up.sql
└── 000001_init.down.sql
```

库名默认：`leap_backend`

## 与后端的关系

- 后端启动时若 `RUN_MIGRATIONS=true`，会读取 `MIGRATIONS_PATH` 指向的目录（默认 `../database/migrations`，相对于 `backend/` 工作目录）
- Docker 构建时会把本目录复制进 backend 镜像内的 `migrations/`

## 手动迁移（可选）

```bash
migrate -path database/migrations \
  -database "mysql://root:password@tcp(127.0.0.1:13306)/leap_backend?multiStatements=true" up
```

需安装 [golang-migrate](https://github.com/golang-migrate/migrate) CLI。
