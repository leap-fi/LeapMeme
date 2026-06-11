# 如何添加后端业务模块

实现前先在 `web/lib/apis/` 确认前端契约。

## 0. 对齐前端

- 阅读 `web/lib/apis/...` 与 `types.ts`
- 勿参考 `web/docs/`

## 1. 迁移（若需落库）

在 `database/migrations/` 新增 `{version}_{name}.up.sql` / `.down.sql`

## 2. Model

`backend/internal/model/xxx.go`

## 3. DTO

`backend/internal/dto/xxx.go` — JSON tag 对齐前端

## 4. Service

`backend/internal/service/xxx.go`

## 5. Controller

`backend/internal/controller/xxx.go`

## 6. 路由

`backend/internal/router/router.go` 或拆分文件注册

## 检查清单

- [ ] 已对照 `web/lib/apis/`
- [ ] `database/migrations/` + Model
- [ ] DTO / 响应形态与前端一致
- [ ] 路由权限（按需）
