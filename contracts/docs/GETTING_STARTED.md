# 入门：工具链与本地链

## 1. 为什么需要本地链？

当前主网使用 Alt Fun 合约 + 真实 USDC（`web/lib/contracts/config.ts` 中 `ALT_FUN_CONTRACTS`）。在主网上：

- 发币（createToken）需要真实 USDC 做 seed
- 买卖消耗真实 USDC / token
- 无法「无限 mint」测试币

**本地开发**使用 **Anvil** 启动一条私有链，部署 **MockUSDC**（可随意 `mint`）和 **自有 Zap/Bonding 等**，前端与 Go indexer 通过 env 指向 `http://127.0.0.1:8545`，即可零成本反复测试。

---

## 2. Foundry 是什么？

[Foundry](https://book.getfoundry.sh/) 是以太坊智能合约开发的**一体化工具链**（Paradigm 维护），小公司常用，比 Hardhat 更轻、测试更快。

| 工具 | 作用 | 类比 |
|------|------|------|
| **forge** | 编译、测试、格式化、部署脚本 | `go test` + `go build` |
| **cast** | 命令行调 RPC、发交易、读合约 | `curl` + 链上调试 |
| **anvil** | 本地以太坊节点（内存链） | 本地 MySQL / 本地 Redis |
| **chisel** | Solidity REPL（可选） | 交互式试代码 |

我们主要用 **forge + anvil + cast**。

---

## 3. Foundry 哪里下载 / 安装？

### 官方渠道

- 文档：https://book.getfoundry.sh/getting-started/installation
- GitHub：https://github.com/foundry-rs/foundry

### 推荐：Windows 上使用 WSL2（Ubuntu）

Foundry 官方安装脚本面向 Linux/macOS。在 Windows 上**最省事**的方式：

1. 安装 [WSL2](https://learn.microsoft.com/zh-cn/windows/wsl/install) + Ubuntu
2. 在 Ubuntu 终端执行：

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

3. 验证：

```bash
forge --version
cast --version
anvil --version
```

### 备选：Windows 原生

- 从 [Foundry Releases](https://github.com/foundry-rs/foundry/releases) 下载对应平台的预编译包（若有）
- 或使用 `cargo install --git https://github.com/foundry-rs/foundry --profile local --locked forge cast anvil`（需安装 [Rust](https://rustup.rs/)）

团队统一用 **WSL2** 可减少环境差异。

### 项目初始化（尚未执行，开发阶段第一天做）

在仓库 `contracts/` 目录：

```bash
cd contracts
forge init --no-commit   # 若目录已有 docs/，可手动建 foundry.toml
forge install OpenZeppelin/openzeppelin-contracts
```

---

## 4. Anvil 是什么？

**Anvil** 是 Foundry 自带的**本地 EVM 区块链节点**。

特点：

- 启动快，数据在内存里，重启即清空（适合测试）
- 默认 RPC：`http://127.0.0.1:8545`
- 默认 chain id：`31337`
- 预置 10 个测试账户，每个有 **10000 ETH**（仅用于 gas，不是 USDC）
- 支持 `anvil --fork-url <RPC>` 从主网/测试网**分叉**状态启动（进阶，第一期可不用）

### 启动示例

```bash
# 全新本地链（推荐第一期）
anvil

# 指定 chain id（与 viem 本地链配置一致）
anvil --chain-id 31337

# 从 HyperEVM 分叉（读主网状态，进阶）
anvil --fork-url https://rpc.hyperliquid.xyz/evm
```

启动后会打印：

- RPC URL
- 私钥列表（仅本地，**切勿用于主网**）
- 账户地址

### 常用 cast 配合 Anvil

```bash
# 查询区块高度
cast block-number --rpc-url http://127.0.0.1:8545

# 给某地址打 ETH（gas）
cast send 0xYourAddress --value 1ether --private-key 0xac0974... --rpc-url http://127.0.0.1:8545

# 调用合约 view 函数
cast call <合约地址> "symbol()(string)" --rpc-url http://127.0.0.1:8545
```

部署 MockUSDC 后，用脚本 `mint` 测试 USDC，而不是用 ETH 当 USDC。

---

## 5. 还需要装什么？

| 软件 | 用途 | 是否必须 |
|------|------|----------|
| Git | 版本管理 | 是 |
| WSL2 + Ubuntu | Windows 下跑 Foundry | 强烈推荐 |
| Node + pnpm | 前端联调 | 是（仓库已有） |
| Go 1.22+ | 后端 indexer 联调 | 是（仓库已有） |
| MetaMask 或 Privy | 钱包连本地链 | 联调时需要 |
| Docker | CI 跑 `forge test` | 可选 |
| VS Code + Solidity 插件 | 语法高亮 | 推荐 |

**不需要**：自己跑 HyperEVM 全节点；本地用 Anvil 即可。

---

## 6. 首次构建（必做）

`lib/` 为第三方依赖，**不提交 git**。克隆仓库后：

```bash
cd contracts
bash scripts/install-deps.sh
forge build
forge test
```

详见 [contracts/README.md](../README.md)。

## 7. 第一天动手清单

- [ ] 安装 Foundry，`forge / cast / anvil` 能跑
- [ ] 执行 `bash scripts/install-deps.sh`，`forge test` 全绿
- [ ] 阅读 [CONTRACTS.md](CONTRACTS.md) 理解五个地址含义
- [ ] 阅读 [WORKFLOW.md](WORKFLOW.md) 了解与 `web/`、`backend/` 联调方式

Anvil 部署与前端联调见 [STATUS.md](STATUS.md) 阶段 1 待办。

---

## 8. 学习资源（合约零基础）

| 资源 | 说明 |
|------|------|
| [Foundry Book](https://book.getfoundry.sh/) | 官方教程，优先看 Testing、Scripts |
| [Solidity Docs](https://docs.soliditylang.org/) | 语言基础 |
| [OpenZeppelin Docs](https://docs.openzeppelin.com/contracts) | ERC20、Ownable、Clones |
| [Ethernaut](https://ethernaut.openzeppelin.com/) | 安全思维（可选） |
| 本仓库 `web/lib/contracts/abis.ts` | **接口契约**：自有合约应对齐哪些函数/事件 |

建议学习顺序：**Solidity 基础 → ERC20 → Foundry 测试 → 读 abis.ts 对照实现**。
