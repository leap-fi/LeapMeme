# 如何添加后端业务模块

实现前先在 `web/lib/apis/` 确认前端契约。

## 0. 对齐前端

- 阅读 `web/lib/apis/...` 与 `types.ts`
- 勿参考 `web/docs/`

## 1. 迁移（若需落库）

在 `database/migrations/` 新增 `{version}_{name}.up.sql` / `.down.sql`（序号递增，勿改已合并历史）。

## 2. Model

`backend/internal/model/xxx.go`

## 3. DTO

`backend/internal/dto/xxx.go` — JSON tag 对齐前端；序列化走 `backend/common/json.go`

## 4. Service

`backend/internal/service/xxx.go` — 错误用 `pkg/apperror`，响应形态对齐 `pkg/response`

## 5. Controller

`backend/internal/controller/xxx.go`

## 6. 路由

`backend/internal/router/router.go` 或拆分文件注册

若为链上事件驱动数据（非纯 HTTP 写），同步考虑 `internal/indexer/` 与相关表（见 `database/README.md`）。

## 检查清单

- [ ] 已对照 `web/lib/apis/`
- [ ] `database/migrations/` + Model（如需）
- [ ] DTO / 响应形态与前端一致
- [ ] 路由权限（按需；当前阶段 `/auth/*` 未对外暴露）
