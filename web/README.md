# Alt Fun 合约

[Alt Fun](https://alt.fun) 的 Solidity 合约。这是一个部署在 HyperEVM 上的代币发射台，每个代币的联合曲线以 [BounceTech 杠杆代币](https://docs.bounce.tech/) 作为储备资产。

## 部署指南

### 前置条件

安装 [Foundry](https://getfoundry.sh)，并在运行任何部署脚本前配置以下环境变量：

| 变量 | 说明 |
|---|---|
| `PRIVATE_KEY` | 部署者私钥 |
| `USDC` | USDC 代币地址（6 位小数） |
| `UNISWAP_V2_FACTORY` | HyperSwap V2 Factory 地址 |
| `UNISWAP_V2_ROUTER` | HyperSwap V2 Router 地址 |
| `BOUNCE_GLOBAL_STORAGE` | BounceTech GlobalStorage 地址 |
| `OWNER` | 协议所有者 / 多签地址（部署后所有合约转移至此） |
| `FEE_TO` | 协议费用接收地址 |
| `GRADUATION_THRESHOLD_USD` | 毕业阈值，18 位精度 USD（默认：`69000000000000000000000`，即 $69k） |
| `BUY_FEE_BPS` | 买入手续费，单位 bps，最大 200（默认：`100`，即 1%） |
| `SELL_FEE_BPS` | 卖出手续费，单位 bps，最大 200（默认：`100`，即 1%） |
| `CREATOR_FEE_BPS` | 创建者分成比例，单位 bps（默认：`2000`，即 20%） |

模板文件位于 `script/.env.example`。

### 合约依赖顺序

```
外部合约（已部署）
  USDC · UniswapV2Factory · UniswapV2Router · BounceGlobalStorage
        ↓
[1] Token 实现合约  （EIP-1167 克隆模板）
        ↓
[2] Factory ──────────────────→ [3] Router
        ↓                              ↓
[4] LPLock   [5] FeeVault             ↓
        └──────────[6] Bonding ←──────┘
                         ↓
                     [7] Zap
```

### 完整部署

一次广播中部署所有合约并完成连接：

```bash
source .env
forge script script/Deploy.s.sol --rpc-url $RPC_URL --broadcast
```

### 仅部署 Zap

适用于协议其余部分已部署的场景（例如替换或新增 Zap 实例）。需额外配置以下变量：

| 变量 | 说明 |
|---|---|
| `BONDING` | 已有的 Bonding 代理地址 |
| `FEE_VAULT` | 已有的 FeeVault 代理地址 |

```bash
source .env
forge script script/DeployZap.s.sol --rpc-url $RPC_URL --broadcast
```

该脚本会自动调用 `Bonding.addRouter(zap)` 和 `FeeVault.addDepositor(zap)`，广播完成后新 Zap 即刻生效。

### 部署后连接（由 `Deploy.s.sol` 自动执行）

| 调用 | 用途 |
|---|---|
| `Factory.setRouter(router)` | 在任何交易对创建前锁定内部 AMM Router |
| `Factory.grantRole(BONDING_ROLE, bonding)` | 允许 Bonding 调用 `createPair` |
| `Router.grantRole(BONDING_ROLE, bonding)` | 允许 Bonding 调用 `buy` / `sell` / `graduate` |
| `LPLock.addLocker(bonding)` | 允许 Bonding 在毕业时记录 LP 锁仓 |
| `Bonding.addRouter(zap)` | 允许 Zap 调用 Bonding 的 `launch` / `buy` / `sell` |
| `FeeVault.addDepositor(zap)` | 允许 Zap 向 FeeVault 累积手续费 |

### 升级

`Bonding`、`Zap`、`FeeVault` 和 `LPLock` 均为 UUPS 可升级代理。升级时，部署新的实现合约后，由所有者账户对现有代理调用 `upgradeToAndCall` 即可。

`Factory` 和 `Router` 没有升级机制，如需变更必须重新部署（可部署一个指向新合约的新 `Bonding`，与旧版并行运行）。

---

## ABI

`Zap` 是协议唯一的对外交互入口，其 ABI 单独保存于 [`Zap.abi.json`](./Zap.abi.json)。

---

## 已部署地址

| 合约 | 地址 |
|---|---|
| `Bonding`  | `0x3d968edbed8c953C814FE7Ad207705525189D13A` |
| `Zap`      | `0x5f66E5Ec4ec9F045E10a580e7bA1147b0c650E45` |
| `Factory`  | `0x6F6Fd31838cea254b032A5a24d350e0683382357` |
| `Router`   | `0xf1e943a1b78ac7F0976beC79c5F74C4B30C5646b` |
| `FeeVault` | `0x2B7fB3857B26654609E4d36db3876c61EECA50DC` |
| `LPLock`   | `0x5cF3D0147Fe93b820444C7D03fD00fce91811b6a` |
| `Token`（实现合约） | `0x7a680a5330CAB3D322192220d7FD70c668AD6EE5` |
