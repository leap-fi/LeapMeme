# 合约架构与实现范围

## 1. `ALT_FUN_CONTRACTS` 是五个合约吗？

```ts
// web/lib/contracts/config.ts
export const ALT_FUN_CONTRACTS = {
  zap: '0x693f...',
  bonding: '0xb688...',
  router: '0x70c7...',
  usdc: '0xb883...',
  creatorRewards: '0xb489...',
}
```

**是五个链上地址**，但含义不同：

| 地址 key | 类型 | 是否 LEAP 必须自研 | 说明 |
|----------|------|-------------------|------|
| `usdc` | ERC20 代币 | **否（本地用 Mock）** | 主网是 HyperEVM 官方 USDC；本地部署 `MockUSDC` 带 `mint` |
| `zap` | 协议入口 | **是（核心）** | 用户发币、买卖唯一入口；indexer 扫 `TokenCreated` 与买卖 tx |
| `bonding` | 核心状态机 | **是（核心）** | 发币工厂、creator、LT 绑定、毕业状态 |
| `router` | 定价/路由 | **是（核心）** | bonding 阶段报价 `previewBuy` / `getAmountOut` |
| `creatorRewards` | 激励 | **二期** | 创作者手续费累计与领取；Profile 页使用 |

**结论：不是五个都要在第一期 1:1 重写。** 第一期核心是 **MockUSDC + Zap + Bonding + Router**；CreatorRewards 可二期；主网 USDC 不部署，只复用或 Mock。

---

## 2. Bounce LT 生态详解（外部依赖，不在五个地址里）

### 2.1 是什么？

**一句话：** Alt Fun 发的每个 meme 币，不是随便起的 ticker，而是绑在一个 **杠杆代币（LT，Leverage Token）** 上。LT 代表某种标的（如 BTC）的 **2x / 3x / 5x 做多或做空** 敞口。

**Bounce LT 生态**是 HyperEVM 上 **生产、登记、兑换这些 LT** 的一套**外部合约**（Bounce / BounceTech 体系）。Alt Fun 的 Bonding、Zap **接进去用**，但 LT 工厂和各 LT 合约 **不属于** `ALT_FUN_CONTRACTS` 那五个地址。

代码注释见 `web/lib/contracts/lt-registry.ts`：`Resolve BounceTech LT address`。

和普通 DEX（用户 → Router → 池子）不同，本产品多了一层：

```
meme 币 ↔ 必须选一个「杠杆主题」↔ Bounce LT 体系 ↔ Hyperliquid 相关资产
```

---

### 2.2 和发币页面（`/create`）的关系

用户在创建页要选择：

| 字段 | 示例 |
|------|------|
| **underlying**（标的） | BTC、ETH… |
| **leverage**（杠杆） | 2x / 3x / 5x |
| **direction**（方向） | LONG / SHORT |

发币前，前端调用 `resolveLtAddress(underlying, leverage, direction)`（`use-launch-token.ts`），在链上查出 **对应的 LT 合约地址**，再传给 `createToken`。

因此每个 meme 币从诞生起就带有主题，例如「代表 BTC 3 倍做多」。`TokenCreated` 事件里的 `ltAddress` 即此绑定关系；indexer 入库时会记录。

---

### 2.3 合约调用链（如何从 Bonding 找到 LT）

```
Bonding.bounceGlobalStorage()
        ↓
BounceGlobalStorage.factory()
        ↓
Factory.lts()  →  [ LT₁, LT₂, LT₃, ... ]
        ↓
每个 LT 合约：
  - targetAsset()    → "BTC"（string）
  - targetLeverage() → 3e18（表示 3x）
  - isLong()         → true / false
```

前端 `lt-registry.ts` 启动时扫链上全部 LT，建成内存表：

```
"BTC:3:LONG"  → 0xABC...
"ETH:5:SHORT" → 0xDEF...
```

发币时 `resolveLtAddress` 即查此表。杠杆倍数在代码里过滤为 `[2, 3, 5]`（见 `lt-registry.ts`）。

**涉及仓库文件：**

| 文件 | 作用 |
|------|------|
| `web/lib/contracts/lt-registry.ts` | 加载 LT 注册表、解析 LT 地址 |
| `web/lib/contracts/trade-quote.ts` | 毕业后 USDC ↔ LT ↔ meme 报价 |
| `web/lib/contracts/vanity-salt.ts` | CREATE2 预测 token 地址（读 `bonding.tokenImplementation`） |
| `web/lib/contracts/abis.ts` | `bounceLtAbi`、`bounceFactoryAbi`、`bounceGlobalStorageAbi` |

---

### 2.4 LT 合约做什么？

LT 是链上的 **「杠杆敞口凭证」**（由 Bounce 发行，底层与 Hyperliquid 杠杆市场相关）。前端主要用到的 view 函数：

| 函数 | 含义（简化） |
|------|----------------|
| `baseToLtAmount(usdc)` | 多少 USDC（计价基准）可换算成多少 LT |
| `ltToBaseAmount(lt)` | 多少 LT 可换回多少 USDC |
| `targetAsset()` | 跟踪哪个标的（如 `"BTC"`） |
| `targetLeverage()` | 几倍杠杆 |
| `isLong()` | 做多 `true` / 做空 `false` |

LT 有两个角色：

1. **发币时**：作为 meme 的「主题标签」写入 `ltAddress`
2. **毕业后**：作为 UniV2 池的 **对手资产**（pair = meme token / LT）

---

### 2.5 与 meme 币生命周期

```
1. 创建（createToken）
   └─ 绑定 ltAddress（如 BTC 3x LONG）
   └─ seed 买入，在 bonding 曲线上交易

2. Trading（isTrading = true）
   └─ buy / sell，Router 报价（trade-quote.ts 未毕业分支）

3. Graduated（isGraduated = true）
   └─ meme 与 LT 组成 UniV2 Pair
   └─ 买入：USDC → baseToLtAmount → 在池内 LT 换代币
   └─ 卖出：代币 → 池内换 LT → ltToBaseAmount → USDC
   └─ 见 trade-quote.ts 中 quoteGraduatedBuy / quoteGraduatedSell
```

`quoteBuy` 会先读 `bonding.isGraduated(token)`，分支选择报价逻辑。

---

### 2.6 架构总图

```
                    ┌─────────────────────────┐
                    │   Bounce LT 生态（外部）  │
                    │  GlobalStorage / Factory │
                    │  LT(BTC 3x LONG) ...    │
                    └───────────┬─────────────┘
                                │ ltAddress
┌──────────┐   create/buy/sell  ▼   ┌──────────┐
│   Zap    │ ◄──────────────────────►│ Bonding  │
└──────────┘                         └────┬─────┘
       ▲                                │ 毕业后
       │ USDC                           ▼
┌──────────┐                 ┌───────────────────────┐
│  USDC    │                 │ UniV2 Pair              │
└──────────┘                 │  meme token  /  LT      │
                             └───────────────────────┘
```

- **LEAP / Alt Fun 自研或配置的五地址**：Zap、Bonding、Router、USDC、CreatorRewards（左侧）
- **Bounce LT**：通过 `bonding.bounceGlobalStorage()` 间接引用（上方外部框）

---

### 2.7 自有合约开发时怎么接？

| 阶段 | 建议 |
|------|------|
| **阶段 1 本地 MVP** | 不必复刻整个 Bounce。部署 **MockLT**（实现上述 view）+ **MockGlobalStorage**（返回 Mock Factory）；`isGraduated` 恒 `false`，买卖只走 Bonding 曲线 |
| **阶段 2** | vanity CREATE2、与 `lt-registry.ts` 解析逻辑对齐 |
| **阶段 3 主网** | **方案 A**：继续接链上真 Bounce LT（与 Alt Fun 一致）；**方案 B**：产品改版、不再绑 LT（需大改 create 页与 trade-quote） |

阶段 1 最小 MockLT 需实现的接口（对齐 `bounceLtAbi`）：

- `targetAsset()`、`targetLeverage()`、`isLong()`
- `baseToLtAmount(uint256)`、`ltToBaseAmount(uint256)`（可先用 1:1 固定汇率简化）

MockGlobalStorage / MockFactory 需实现：

- `bounceGlobalStorage()` → storage 地址
- `factory()` → factory 地址
- `lts()` → LT 地址数组

**第一期可不做毕业 + UniV2**，只要发币时能解析到 LT、create 不 revert 即可。

---


## 3. 各合约详细职责（与仓库代码对应）

### 3.1 USDC / MockUSDC

**链上做什么：**

- 6 位小数 ERC20
- 用户持有、approve 给 Zap、买卖转账

**前端：** `readErc20Balance`、`approve`、`permit`（`web/lib/contracts/trade-quote.ts`、`permit.ts`）

**本地：** `MockUSDC.sol` + `mint(to, amount)` 脚本，测试钱包无限领取。

---

### 3.2 Zap（用户入口）

**链上做什么：**

| 函数 / 事件 | 作用 |
|-------------|------|
| `createToken(params, seedUsdcAmount)` | 创建 meme token + 首笔 seed 买入 |
| `createTokenWithPermit` | 同上，USDC 用 permit 授权 |
| `buy` / `sell` | 买卖 |
| `buyWithPermit` / `sellWithPermit` | 带 permit 的买卖 |
| `MIN_SEED_USDC` | 发币最低 seed（现网 20 USDC；自有合约可改为 1 USDC） |
| `MIN_USDC_AMOUNT` | 链上买入下限 |
| `buyFeeBps` / `sellFeeBps` | 手续费（万分比） |
| `event TokenCreated(token, creator, ltAddress)` | **indexer 依赖**，必须保留事件签名与 indexed 字段 |

**前端：** `use-launch-token.ts`、`use-zap-trade.ts`

**后端 indexer：** `backend/internal/indexer/scanner.go` 解析 `TokenCreated`、买卖 calldata

**设计原则：** Zap 尽量薄——校验、收费、调 Bonding/Router、emit 事件。

---

### 3.3 Bonding（核心状态与发币工厂）

**链上做什么：**

| 能力 | 作用 |
|------|------|
| CREATE2 + EIP-1167 最小代理 | 部署每个 meme token；地址可预测 |
| `tokenImplementation` | clone 的实现合约地址 |
| `ltOf(token)` | 该 meme 绑定的 LT |
| `creatorOf` / `transferCreator` | 创作者 |
| `isTrading` / `isGraduating` / `isGraduated` | 生命周期（第一期可只实现 `isTrading=true`） |
| `bounceGlobalStorage` | 指向全局配置（本地可指向自己的 `MockGlobalStorage`） |

**前端：** `vanity-salt.ts`（挖 vanity 地址）、`lt-registry.ts`、`trade-quote.ts`

**实现难点：** CREATE2 salt 算法、vanity 末尾零、与前端 `predictTokenAddress` 一致（见 `vanity-salt.ts` 注释）。

---

### 3.4 Router（bonding 阶段报价）

**链上做什么：**

| 函数 | 作用 |
|------|------|
| `previewBuy(token, amountIn)` | 预览买入 |
| `getAmountOut(token, isBuy, amountIn)` | 统一报价入口 |

**前端：** `trade-quote.ts` 在 token 未毕业时调用。

**实现：** 第一期可用简单曲线（如常数乘积 \(x \cdot y = k\) 或分段线性），与 Alt Fun 数值不必一致，但**函数签名与返回值形状**应对齐 `abis.ts`。

---

### 3.5 CreatorRewards（创作者奖励）

**链上做什么：**

- 按 token / 创作者累计可领取奖励
- `claim` 类函数（见 `creatorRewardsAbi`）

**前端：** `use-creator-rewards.ts`、Profile 页

**阶段：** **二期**再实现；一期 Profile 奖励可显示 0 或 mock API。

---

## 4. 分阶段：都要实现吗？

```
阶段 0  工具链     Foundry + Anvil + 文档（当前）
阶段 1  本地 MVP   MockUSDC + Zap + Bonding + Router + MockLT + MockGlobalStorage
阶段 2  对齐产品   vanity 地址、CreatorRewards、permit、与 indexer 全字段对齐
阶段 3  预发/主网  HyperEVM 部署、多签 owner、Slither、env 切换
阶段 4  差异化     MIN_SEED=1U、费率、反 spam；可选毕业 + UniV2
```

| 组件 | 阶段 1 | 阶段 2 | 阶段 3 |
|------|--------|--------|--------|
| MockUSDC | ✅ | ✅ | 主网用真 USDC 地址 |
| Zap | ✅ 核心接口 | + permit | 部署 |
| Bonding | ✅ 简化 | + vanity + creator | 部署 |
| Router | ✅ 简化曲线 | 调参 | 部署 |
| MockLT / GlobalStorage | ✅ | 可换真 Bounce | 视产品 |
| CreatorRewards | ❌ | ✅ | 部署 |
| 毕业 + UniV2 | ❌ | ❌ | 可选 |

---

## 5. 自有合约应对齐的「接口契约」

以 **`web/lib/contracts/abis.ts`** 为准（勿参考 `web/docs/`）。第一期至少实现：

**Zap：** `createToken`、`buy`、`sell`、`TokenCreated` 事件、`MIN_SEED_USDC`、`buyFeeBps`、`sellFeeBps`

**Bonding：** `ltOf`、`creatorOf`、`isTrading`、`tokenImplementation`、`bounceGlobalStorage`

**Router：** `previewBuy`、`getAmountOut`

**ERC20 meme token：** `name`、`symbol`、`decimals`、`transfer`、`balanceOf`

indexer 另需买卖函数选择器与 `TokenCreated` topic 与现网一致，或同步改 `backend/internal/indexer/abi.go`。

---

## 6. 改规则示例：20U 发币 → 1U

仅在**自有合约**中修改（不影响 Alt Fun 主网）：

1. `LeapZap.sol`：`uint256 public constant MIN_SEED_USDC = 1e6;`
2. `createToken` 内 `require(seedUsdcAmount >= MIN_SEED_USDC)`
3. 前端 `web/lib/contracts/config.ts`：`MIN_SEED_USDC = 1`
4. `create` 页 seed 预设（`web/app/create/page.tsx`）

链上与前端**必须同时改**。

---

## 7. 部署产物

每个环境一份 JSON，例如 `deployments/local.json`：

```json
{
  "chainId": 31337,
  "rpcUrl": "http://127.0.0.1:8545",
  "usdc": "0x...",
  "zap": "0x...",
  "bonding": "0x...",
  "router": "0x...",
  "creatorRewards": "0x0000000000000000000000000000000000000000",
  "deployedAt": "2026-06-12T00:00:00Z"
}
```

供 `web/.env.development.local` 与 `backend/.env` 填写。
