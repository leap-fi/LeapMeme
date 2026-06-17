# 合约开发进度

> 开发过程中持续更新。`forge test` 通过 ≠ 已上主网，仅代表当前单测覆盖范围。

**当前链上环境：** Alt Fun 生产合约（HyperEVM mainnet）  
**自有合约：** 阶段 1 进行中（Forge 单测已绿，尚未 Anvil 部署）

---

## 总览：合约要做什么？

对齐 `web/lib/contracts/abis.ts` 与 [CONTRACTS.md](CONTRACTS.md)。

| 模块 | 职责 | 状态 |
|------|------|------|
| **MockUSDC** | 6 位小数测试币，`mint` | ✅ 已完成 |
| **LeapToken** | EIP-1167 clone 实现，`name`/`symbol`/mint | ✅ 已完成 |
| **LeapBonding** | 发币工厂、曲线储备、creator/LT 绑定、买卖底层 | ✅ MVP 已完成 |
| **LeapRouter** | `previewBuy` / `getAmountOut` 报价 | ✅ MVP 已完成 |
| **LeapZap** | `createToken` / `buy` / `sell`、`TokenCreated` 事件 | ✅ MVP 已完成 |
| **MockLT + Factory + GlobalStorage** | 供 `lt-registry` 解析 LT 列表 | ✅ MVP 已完成 |
| **LeapCreatorRewards** | 占位（返回 0） | ✅ 占位已完成 |
| **Forge 单测** | 发币 / 买卖 / 报价 / revert / transferCreator | ✅ 9 项已通过 |
| **DeployLocal + Anvil** | 部署脚本、本地 JSON、前端 env | ⬜ 待完成 |
| **buyWithPermit / sellWithPermit** | Zap permit 路径 | ⬜ 待完成 |
| **createTokenWithPermit** | 发币 permit | ⬜ 待完成 |
| **毕业状态机** | `isGraduating` / `isGraduated` + UniV2 | ⬜ 待完成 |
| **真 Bounce LT 对接** | 替换 MockLT | ⬜ 待完成 |
| **CreatorRewards 实装** | 手续费累计与 claim | ⬜ 待完成 |
| **HyperEVM 部署** | 主网脚本 + 多签 | ⬜ 待完成 |
| **indexer 联调** | 自有 Zap 地址与 ABI | ⬜ 待完成 |
| **前端联调** | `.env.development` 地址 + 本地 RPC | ⬜ 待完成 |

---

## 阶段 0 — 工具与文档

| 任务 | 状态 | 完成日期 | 备注 |
|------|------|----------|------|
| `contracts/docs/` 参考文档 | ✅ | 2026-06-12 | |
| Foundry 安装（本机） | ✅ | 2026-06-15 | v1.7.1 |
| `forge init` + `foundry.toml` | ✅ | 2026-06-16 | |
| `lib/` git 忽略 + `install-deps.sh` | ✅ | 2026-06-16 | 见 `contracts/README.md` |
| OpenZeppelin 依赖文档化 | ✅ | 2026-06-16 | v5.0.2 锁定 |

---

## 阶段 1 — 本地 MVP

| 任务 | 状态 | 完成日期 | 备注 |
|------|------|----------|------|
| `MockUSDC.sol` | ✅ | 2026-06-16 | |
| `LeapToken.sol` | ✅ | 2026-06-16 | CREATE2 clone |
| `LeapBonding.sol` | ✅ | 2026-06-16 | vanity + 常数乘积曲线 |
| `LeapRouter.sol` | ✅ | 2026-06-16 | |
| `LeapZap.sol` | ✅ | 2026-06-16 | 无 permit |
| Mock LT 生态 | ✅ | 2026-06-16 | BTC 3x LONG |
| `LeapCreatorRewards.sol` 占位 | ✅ | 2026-06-16 | |
| `test/LeapProtocol.t.sol` | ✅ | 2026-06-16 | 9 tests pass |
| `script/DeployLocal.s.sol` | ⬜ | | |
| Anvil 部署 + `deployments/local.json` | ⬜ | | |
| 前端本地联调 | ⬜ | | 仅改 `.env.development` |
| 后端 indexer 本地联调 | ⬜ | | |

---

## 阶段 2 — 产品对齐

| 任务 | 状态 |
|------|------|
| 更多 MockLT（2x/3x/5x LONG/SHORT） | ⬜ |
| `buyWithPermit` / `sellWithPermit` | ⬜ |
| `createTokenWithPermit` | ⬜ |
| CreatorRewards 真实逻辑 | ⬜ |
| `isGraduating` / `isGraduated` + UniV2 报价 | ⬜ |
| indexer 字段全对齐 | ⬜ |

---

## 阶段 3 — HyperEVM 部署

| 任务 | 状态 |
|------|------|
| `DeployHyperEVM.s.sol` | ⬜ |
| Slither / review | ⬜ |
| owner 多签 | ⬜ |
| 生产 env | ⬜ |

---

## 阶段 4 — 差异化（可选）

| 任务 | 状态 |
|------|------|
| `MIN_SEED_USDC = 1` | ⬜ |
| 反 spam / 费率策略 | ⬜ |

---

## 变更日志

| 日期 | 说明 |
|------|------|
| 2026-06-12 | 初版文档 |
| 2026-06-16 | Foundry 工程、MVP 合约、`LeapProtocol.t.sol` 9 项通过；`lib/` 忽略 + README |

---

## 运行测试

```bash
cd contracts
bash scripts/install-deps.sh   # 首次
forge test
```

---

## 当前部署地址

### local（Anvil）

_尚未部署。_

### HyperEVM（LEAP 自有）

_尚未部署。现网仍用 `ALT_FUN_CONTRACTS`。_
