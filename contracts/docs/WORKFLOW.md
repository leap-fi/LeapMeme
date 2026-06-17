# 开发流程与联调规范

本文描述从零开始合约开发、与 LEAP 前端/后端协作、到部署的**标准流程**。适合「前端 + Go 扫块」背景、第一次做合约的同学按步骤执行。

---

## 1. 总览

```
┌─────────────┐     deploy      ┌──────────────┐
│  contracts/ │ ──────────────► │ Anvil 本地链  │
│  forge test │                 │ :8545        │
└──────┬──────┘                 └──────┬───────┘
       │                               │
       │ deployments/local.json        │ RPC
       ▼                               ▼
┌─────────────┐                 ┌──────────────┐
│ web/        │ ◄── env 地址 ──►│ backend/     │
│ viem 调合约  │                 │ indexer 扫块  │
└─────────────┘                 └──────────────┘
```

---

## 2. 日常开发循环（推荐）

### 2.1 写合约

1. 在 `contracts/src/` 新增或修改 `.sol`
2. 优先用 OpenZeppelin：`ERC20`、`Ownable`、`ReentrancyGuard`、`Clones`
3. 对照 `web/lib/contracts/abis.ts` 检查函数签名、事件名、参数类型

### 2.2 写测试（forge test）

```bash
cd contracts
forge test -vvv          # 详细日志
forge test --match-test testCreateToken -vvvv
```

**习惯：每个对外函数至少一个 happy path + 一个 revert case。**

示例测试场景：

- `testCreateToken_minSeed` — seed 低于 `MIN_SEED_USDC` 应 revert
- `testBuy_sell_roundtrip` — 买卖后余额变化合理
- `testTokenCreated_event` — 检查 `TokenCreated` topic 与 indexed 参数

### 2.3 本地部署

```bash
# 终端 1
anvil --chain-id 31337

# 终端 2
cd contracts
forge script script/DeployLocal.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
```

脚本应：

1. 部署 MockUSDC、Bonding、Router、Zap、MockLT 等
2. 写入 `deployments/local.json`
3. 给测试账户 `mint` USDC（例如 100_000 USDC）

### 2.4 前端联调

`web/.env.development.local`（不提交 git）示例：

```env
NEXT_PUBLIC_ZAP_ADDRESS=0x...
NEXT_PUBLIC_BONDING_ADDRESS=0x...
NEXT_PUBLIC_ROUTER_ADDRESS=0x...
NEXT_PUBLIC_USDC_ADDRESS=0x...
# 本地链 RPC 需在 chain/client 中配置 localAnvil（开发时添加）
```

钱包：

- MetaMask 添加网络：RPC `http://127.0.0.1:8545`，chain id `31337`
- 导入 Anvil 打印的私钥（仅本地）
- 或用 Privy 配置自定义链（按团队钱包方案）

验证路径：

1. `/create` 发币
2. token 页买卖
3. 浏览器控制台无 revert

### 2.5 后端 indexer 联调

`backend/.env`：

```env
INDEXER_ENABLED=true
CHAIN_RPC_URL=http://127.0.0.1:8545
CHAIN_ID=31337
ZAP_ADDRESS=0x...          # 与 deployments 一致
USDC_ADDRESS=0x...
INDEXER_START_BLOCK=       # 留空则从当前块开始
RUN_MIGRATIONS=true
```

启动 `go run .`，观察：

- `indexer_cursors` 游标推进
- `tokens` / `trades` 表有数据
- `GET /market/trade/latest` 有返回

若自有合约事件与 Alt Fun 不一致，改 `backend/internal/indexer/abi.go` 与 `scanner.go`。

### 2.6 提交前检查

```bash
cd contracts
forge fmt
forge test
# 可选：forge coverage
```

PR 描述中注明：是否改 ABI、是否需同步 web/backend env 示例。

---

## 3. Git 与分支建议

| 类型 | 路径 | 说明 |
|------|------|------|
| 合约源码 | `contracts/src/` | 进 git |
| 部署地址 | `contracts/deployments/local.json` | 可 gitignore；`local.example.json` 进 git |
| 私钥 | 任何地方 | **禁止**提交；Anvil 默认私钥仅本地 |
| 主网部署地址 | `deployments/hyperevm.json` | 进 git，不含密钥 |

---

## 4. 部署到 HyperEVM（阶段 3）

### 4.1 预发检查清单

- [ ] `forge test` 全绿
- [ ] Slither 无高危（`slither .` 可选）
- [ ] 部署脚本可重复执行或文档说明 upgrade 策略
- [ ] owner 计划交给多签（Safe）
- [ ] `MIN_SEED_USDC` 等经济参数产品确认

### 4.2 部署

```bash
# 使用部署钱包私钥（环境变量，勿写进仓库）
export PRIVATE_KEY=0x...
forge script script/DeployHyperEVM.s.sol \
  --rpc-url https://rpc.hyperliquid.xyz/evm \
  --broadcast \
  --verify   # 若 HyperEVM 支持 verifier
```

### 4.3 切换生产 env

**前端**（构建环境变量）：

- `NEXT_PUBLIC_ZAP_ADDRESS`
- `NEXT_PUBLIC_BONDING_ADDRESS`
- `NEXT_PUBLIC_ROUTER_ADDRESS`
- `NEXT_PUBLIC_USDC_ADDRESS`（主网真 USDC）
- `NEXT_PUBLIC_CREATOR_REWARDS_ADDRESS`

**后端**：

- `ZAP_ADDRESS`、`USDC_ADDRESS`、`CHAIN_ID=999`
- `CHAIN_RPC_URL`（生产建议私有 RPC）

### 4.4 部署后验证

1. 小额 create + buy + sell
2. indexer 入库正确
3. 前端列表与链上状态一致

---

## 5. 文档同步规范（必须遵守）

合约开发过程中，**每完成一个可交付阶段**更新：

| 变更 | 更新文件 |
|------|----------|
| 完成 Foundry 初始化 / 首个 MockUSDC | [STATUS.md](STATUS.md) |
| 新增合约文件、职责变化 | [CONTRACTS.md](CONTRACTS.md) |
| 部署步骤、env 变量变化 | 本文 WORKFLOW.md |
| 新工具、安装问题 | [GETTING_STARTED.md](GETTING_STARTED.md) |
| 部署地址（主网/预发） | `deployments/*.json` + STATUS.md |

### STATUS.md 更新模板

```markdown
## 2026-06-XX — 阶段 1 本地 MVP

- [x] MockUSDC + DeployLocal 脚本
- [x] LeapZap createToken / buy / sell
- [ ] CreatorRewards
- 部署：`deployments/local.json`
- 备注：...
```

### 接口变更时额外同步

1. `web/lib/contracts/abis.ts` — 前端 ABI
2. `backend/internal/indexer/abi.go` — indexer
3. `backend/.env.example` / `web/.env.example` — 文档化新变量

---

## 6. 常见问题

### Q: Anvil 重启后前端连不上了？

Anvil 重启后链上状态清空，需**重新 deploy** 并更新 env 地址。

### Q: 交易 revert 怎么查？

```bash
cast run <txHash> --rpc-url http://127.0.0.1:8545
```

或 `forge test` 里用 `vm.expectRevert()` 单测复现。

### Q: 我只改 Go indexer，要跑合约吗？

要。indexer 解析的字节码/事件来自链上真实合约；本地先用 Anvil 部署自有合约再扫。

### Q: 必须用 Solidity 吗？

是。EVM 链上跑 Solidity（或 Yul）；前端 Go 只负责链下，不能替代合约。

---

## 7. 推荐第一周任务（学习路径）

| 天 | 任务 |
|----|------|
| 1 | 安装 Foundry；`anvil` + `cast block-number`；读 GETTING_STARTED |
| 2 | `forge init`；写 `MockUSDC.sol`；测试 `mint` |
| 3 | 读 `abis.ts` 中 `zapAbi.createToken`；写空壳 `LeapZap` revert 测试 |
| 4 | 实现 `LeapBonding` 最简 create + `TokenCreated` 事件 |
| 5 | DeployLocal 脚本 + `deployments/local.json` |
| 6 | 前端连本地链，完成一笔 create |
| 7 | 后端 indexer 扫本地链，核对 DB |

每完成一项，更新 [STATUS.md](STATUS.md)。
