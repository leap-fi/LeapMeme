# Web（Next.js 前端）

LEAP 发币平台前端：钱包登录、发币、曲线买卖、行情与 K 线展示。

对标 [Alt Fun](https://alt.fun/)，链上写操作走合约；读模型可对接本仓库 `backend/` 的 `/market/*` API。

## 技术栈

- Next.js（App Router）
- Privy（钱包 / 登录）
- viem / wagmi、Radix UI

## 快速开始

```bash
cd web
cp .env.example .env.development   # 填写 Privy App ID、API Base URL 等
pnpm install
pnpm dev
```

常用脚本：

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 开发服务器 |
| `pnpm build` / `pnpm start` | 生产构建与启动 |
| `pnpm lint` | ESLint |

## 环境变量

见 [`.env.example`](.env.example)。要点：

| 变量 | 说明 |
|------|------|
| `NEXT_PUBLIC_PRIVY_APP_ID` | [Privy Dashboard](https://dashboard.privy.io) App ID |
| `NEXT_PUBLIC_MEME_SERVER_BASE_URL` | 后端 Base URL（协议配置、行情等） |
| `NEXT_PUBLIC_*_ADDRESS` | Zap / Bonding / Router / USDC 等合约地址 |
| `NEXT_PUBLIC_PROTOCOL_*` | 协议经济参数 fallback（API 不可用时） |

本地联调后端时，将 `NEXT_PUBLIC_MEME_SERVER_BASE_URL` 设为 `http://127.0.0.1:8080`。

Anvil + 自有合约联调：取消注释 `.env.example` / `.env.development` 中的本地段，或写入 `.env.development.local`（不提交）。详见 [`contracts/README.md`](../contracts/README.md)。

## 关键目录

```
web/
├── app/                 # Next.js 页面与路由
├── components/          # UI 组件
├── lib/
│   ├── apis/            # ★ API 契约与 fetch（后端对齐以此为准）
│   │   ├── account/
│   │   ├── bounce/
│   │   └── meme-server/
│   ├── contracts/       # ABI、地址、报价、链配置等
│   └── …
├── hooks/
├── contexts/
└── .env.example
```

**约定**：后端实现以 `lib/apis/` 的 TypeScript 类型与实际调用为准；**不要参考** `web/docs/`。

## 链上合约

- 现网（HyperEVM）默认使用 Alt Fun 同款生产地址，见 `.env.example`
- ABI / 地址封装：`lib/contracts/`
- 自有合约源码与本地部署：仓库根目录 [`contracts/`](../contracts/)

| 合约 | 生产地址（alt.fun） |
|------|---------------------|
| Zap | `0x693f12e9e6b35b34458793546065e8b08e0299d6` |
| Router | `0x70c7eC6f85B960379b7ee60Af72E0f419d915878` |
| Bonding | `0xb68811BcC0e4FcD825aA49F9453b065ddF752FcB` |
| USDC | `0xb88339CB7199b77E23DB6E890353E22632Ba630f` |
| CreatorRewards | `0xb4894380282533A86cb241145fac54AaAc995F18` |

## 更多

- 仓库总览：[根 README](../README.md)
- 架构：[docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md)
- 合约联调：[contracts/docs/WORKFLOW.md](../contracts/docs/WORKFLOW.md)
