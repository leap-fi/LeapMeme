# LEAP 自有合约（Foundry）

链上交互现阶段仍可使用 Alt Fun 生产合约；本目录为 **LEAP 自有合约** 源码、测试与部署脚本。

## 文档

| 文档 | 说明 |
|------|------|
| [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md) | Foundry / Anvil 安装 |
| [docs/CONTRACTS.md](docs/CONTRACTS.md) | 架构、五个地址、Bounce LT |
| [docs/WORKFLOW.md](docs/WORKFLOW.md) | 开发流程与联调 |
| [docs/STATUS.md](docs/STATUS.md) | **已完成 / 待办进度** |

## 环境要求

- [Foundry](https://book.getfoundry.sh/)（`forge` / `cast` / `anvil`）≥ 1.0
- Git Bash 或 WSL（Windows）

## 首次构建（必做）

`lib/` 为第三方依赖，**不提交 git**。克隆仓库后：

```bash
cd contracts
bash scripts/install-deps.sh
forge build
forge test
```

### 依赖说明

| 目录 | 来源 | 用途 |
|------|------|------|
| `lib/forge-std` | [foundry-rs/forge-std](https://github.com/foundry-rs/forge-std) | 测试框架（`Test.sol`、`vm.*`） |
| `lib/openzeppelin-contracts` | [OpenZeppelin/openzeppelin-contracts](https://github.com/OpenZeppelin/openzeppelin-contracts) | ERC20、Clones、SafeERC20 等 |

版本锁定见 `scripts/install-deps.sh`。升级依赖后请本地跑通 `forge test` 再提交。

### 手动安装（与脚本等价）

```bash
cd contracts
forge install foundry-rs/forge-std@v1.9.6 --no-git
forge install OpenZeppelin/openzeppelin-contracts@v5.0.2 --no-git
```

## 日常开发（无需 Anvil）

```bash
cd contracts

# 编译
forge build

# 全量测试
forge test -vvv

# 只跑某个测试
forge test --match-test testCreateToken -vvvv

# 格式化
forge fmt
```

改 `src/*.sol` → `forge test`，内存 EVM 执行，不连链、不花 gas。

## 本地演示（Anvil + 前端 + 后端）

完整链路：发币 → 曲线买卖 → 毕业（迁移到 UniV2 池）→ 毕业后买卖 → 创作者领奖 → K 线实时更新。

```bash
# 终端 1：本地链（chain-id 必须 31337）
anvil --chain-id 31337

# 终端 2：部署全套合约 + mint 测试 USDC + 写 deployments/local.json
cd contracts
forge script script/DeployLocal.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
```

部署脚本会打印 `web/.env.development.local` 与 `backend/.env` 需要的地址片段：

- 前端：取消注释 `web/.env.development` 底部的本地段（或写入 `.env.development.local`），`pnpm dev`
- 后端：取消注释 `backend/.env.example` 的本地段（或写入 `backend/.env`），`go run .`
- 钱包：MetaMask 添加网络 RPC `http://127.0.0.1:8545`、chainId `31337`，导入 Anvil 打印的私钥

毕业阈值本地为 **1000 USDC**（`LeapBonding.GRADUATION_USDC`，与后端 `BondingCurveGraduationTargetUSD` 对齐）。
Anvil 重启会清空链，需重新部署；后端要删 `indexer_cursors`（或重置 DB）再扫。

详细步骤见 [docs/WORKFLOW.md](docs/WORKFLOW.md)。

## 目录结构

```
contracts/
├── src/              # 业务合约
│   ├── LeapZap.sol            # 入口：create/buy/sell(+permit)、收费→CreatorRewards
│   ├── LeapBonding.sol        # 曲线 + 毕业状态机 + UniV2 迁移
│   ├── LeapRouter.sol         # 曲线阶段报价
│   ├── LeapToken.sol          # EIP-1167 clone + EIP-2612 permit
│   ├── LeapCreatorRewards.sol # 手续费累计 + claim
│   ├── external/univ2/        # UniswapV2 Pair/Factory（0.8 移植）
│   ├── mocks/                 # MockUSDC、MockLT、MockBounceFactory、MockGlobalStorage
│   └── interfaces/
├── test/             # Forge 单测
├── script/           # DeployLocal.s.sol 等部署脚本
├── scripts/          # install-deps.sh 等工具脚本
├── deployments/      # 部署地址 JSON（提交 example，local 可忽略）
├── lib/              # git 忽略，见 install-deps.sh
├── out/              # git 忽略，编译产物
└── docs/
```

## 常用命令

```bash
forge build          # 编译
forge test -vvv      # 测试
forge fmt            # 格式化
forge snapshot       # gas 快照（可选）
anvil                # 本地链（前后端联调时用，见 WORKFLOW.md）
```

## 与前端 / 后端

- 前端 ABI 契约：`web/lib/contracts/abis.ts`（勿改逻辑，仅 `.env.development` 换地址）
- 后端 indexer：`backend/internal/indexer/`

本地联调步骤见 [docs/WORKFLOW.md](docs/WORKFLOW.md)。
