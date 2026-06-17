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

## 目录结构

```
contracts/
├── src/              # 业务合约
│   ├── LeapZap.sol
│   ├── LeapBonding.sol
│   ├── LeapRouter.sol
│   ├── LeapToken.sol
│   ├── mocks/        # MockUSDC、MockLT 等
│   └── interfaces/
├── test/             # Forge 单测
├── script/           # 部署脚本（Anvil / 主网）
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
