# 合约开发进度

> 开发过程中持续更新。`forge test` 通过 ≠ 已上主网，仅代表当前单测覆盖范围。

**当前链上环境：** Alt Fun 生产合约（HyperEVM mainnet）  
**自有合约：** 本地演示闭环已就绪（发币→曲线买卖→毕业→UniV2 买卖→创作者领奖→K线；12 项 Forge 单测全绿；DeployLocal 脚本就绪）

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
| **LeapCreatorRewards** | 手续费累计 + claim（真实） | ✅ 已完成 |
| **UniswapV2 (0.8 移植)** | Pair/Factory，毕业后池子 | ✅ 已完成 |
| **Forge 单测** | 发币/买卖/报价/revert/毕业/permit/奖励 | ✅ 12 项已通过 |
| **DeployLocal + Anvil** | 部署脚本、本地 JSON、env 片段输出 | ✅ 脚本就绪 |
| **buyWithPermit / sellWithPermit** | Zap permit 路径 | ✅ 已完成 |
| **createTokenWithPermit** | 发币 permit | ✅ 已完成 |
| **毕业状态机** | `isGraduated` + UniV2 原子迁移 | ✅ 已完成 |
| **毕业后买卖路由** | USDC↔LT↔meme（UniV2） | ✅ 已完成 |
| **前端链/地址配置** | `chain.ts` env 驱动 + `.env.development` 本地段 | ✅ 已完成 |
| **后端毕业阈值对齐** | `BondingCurveGraduationTargetUSD=1000` | ✅ 已完成 |
| **真 Bounce LT 对接** | 替换 MockLT（接真实 NAV） | ⬜ 待完成（生产） |
| **HyperEVM 部署** | 主网脚本 + 多签 + Slither | ⬜ 待完成（生产） |
| **本地端到端走查** | anvil+前端+后端实跑 | ⬜ 待人工执行 |

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
| `LeapCreatorRewards.sol`（真实） | ✅ | 2026-06-17 | recordFee + claim |
| `test/LeapProtocol.t.sol` | ✅ | 2026-06-17 | 12 tests pass |
| `script/DeployLocal.s.sol` | ✅ | 2026-06-17 | 写 local.json + 打印 env |
| Anvil 部署 + `deployments/local.json` | ✅ | 2026-06-17 | 脚本就绪（待人工跑 anvil） |
| 前端本地联调 | ✅ | 2026-06-17 | `chain.ts` env 驱动 + `.env` 本地段 |
| 后端 indexer 本地联调 | ✅ | 2026-06-17 | `.env.example` 本地段 |

---

## 阶段 2 — 产品对齐

| 任务 | 状态 | 备注 |
|------|------|------|
| 更多 MockLT（2x/3x/5x LONG/SHORT） | ✅ | DeployLocal 部署 12 个（BTC/ETH） |
| `buyWithPermit` / `sellWithPermit` | ✅ | EIP-2612；meme token 内置 clone 安全 permit |
| `createTokenWithPermit` | ✅ | |
| CreatorRewards 真实逻辑 | ✅ | 手续费按 creator 累计 + claim |
| `isGraduated` + UniV2 迁移/报价 | ✅ | 原子毕业，价格连续 |
| 真实 Bounce LT（NAV 波动） | ⬜ | 本地固定 1:1 汇率 |
| indexer 字段全对齐 | ⬜ | 现有字段够演示，余量待校 |

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
| 2026-06-17 | 毕业状态机 + UniV2(0.8 移植) 迁移与买卖路由；permit 系列；CreatorRewards 实装；12 MockLT；DeployLocal 脚本；前端 `chain.ts` env 驱动；后端阈值=1000；测试 12 项全绿 |

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

地址为 `DeployLocal.s.sol` 在全新 Anvil（默认助记词）上的确定性产物，见
[`deployments/local.example.json`](../deployments/local.example.json)；实跑后以 `deployments/local.json` 为准。

**本地设计说明：**
- 毕业阈值 `GRADUATION_USDC = 1000 USDC`，与后端 `BondingCurveGraduationTargetUSD` 对齐。
- MockLT 与 USDC 固定 1:1（6 位小数），毕业后作为 UniV2 池对手资产。
- 毕业在触发买入的同一笔交易内**原子完成**（建池 + 注入流动性 + LP 永久锁定），故 `isGraduating` 恒 false（无中间态）。
- UniswapV2 Pair/Factory 为 Solidity 0.8 忠实移植（省略未使用的 TWAP 预言机），保留 0.3% 费率与 k 不变量。
- `MIN_SEED_USDC` 仍为 20 USDC（与生产一致）。

### HyperEVM（LEAP 自有）

_尚未部署。现网仍用 `ALT_FUN_CONTRACTS`。_
