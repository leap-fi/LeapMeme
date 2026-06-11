# Meme-Kline 接口与 WebSocket 协议文档

本文档详细介绍了 `meme-kline` 模块提供的 HTTP 接口与 WebSocket 实时推送协议，用于向客户端提供代币的 K 线行情图与实时指标推送。

---

## 2. HTTP 接口说明

### 2.1 获取 K 线数据列表 (GET /market/kline/list)

用于获取指定代币在特定周期和时间范围内的历史 K 线图表数据。支持按时间倒序排列输出。

- **请求方法**: `GET`
- **请求路径**: `/market/kline/list`
- **Content-Type**: `application/x-www-form-urlencoded`

#### 请求参数 (Query Parameters)


| 参数名         | 类型       | 是否必填 | 示例值                                            | 说明                                                        |
| ----------- | -------- | ---- | ---------------------------------------------- | --------------------------------------------------------- |
| `address`   | `String` | 是    | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` | 代币的合约地址 (Token Address)                                   |
| `period`    | `String` | 是    | `1m`                                           | K 线周期，可选值：`1m` (1分钟), `15m` (15分钟), `1h` (1小时), `1d` (1天) |
| `startTime` | `Long`   | 是    | `1716696000000`                                | 开始时间戳 (**毫秒级**，后端处理时会自动除以 1000 转换为秒级进行数据库检索)              |
| `endTime`   | `Long`   | 是    | `1716700000000`                                | 结束时间戳 (**毫秒级**，后端处理时会自动除以 1000 转换为秒级进行数据库检索)              |


#### 响应字段说明 (KlineDTO)


| 字段名           | 类型           | 说明                                     |
| ------------- | ------------ | -------------------------------------- |
| `beginTime`   | `Long`       | 该周期的 K 线开始时间 (**秒级**)                  |
| `endTime`     | `Long`       | 该周期的 K 线结束时间 (**秒级**)                  |
| `openPrice`   | `BigDecimal` | 开盘价 (以 SOL/USD 折算)                     |
| `highPrice`   | `BigDecimal` | 该周期内的最高价格                              |
| `lowPrice`    | `BigDecimal` | 该周期内的最低价格                              |
| `closePrice`  | `BigDecimal` | 收盘价                                    |
| `volume`      | `BigDecimal` | 基础代币成交总量 (Base Asset Volume)           |
| `quoteVolume` | `BigDecimal` | 计价资产成交总额/SOL 消耗总量 (Quote Asset Volume) |
| `count`       | `Long`       | 本周期内发生交易的撮合成交总笔数                       |


#### 20条连续 K 线 Mock 数据 (完美模拟：盘整 -> 爆拉拉升 -> 回撤 -> 稳步固盘的市场生命周期)

以下 mock 数据为 **20分钟连续的 1m K 线数据**。时间从 `1716699000` (秒级) 连续递增至 `1716700140`。前台图表库 (如 Lightweight Charts 或 TradingView) 导入后可完美呈现高水准的平滑 K 线走势图。

```json
{
  "code": 0,
  "msg": "success",
  "ts": 1716700150241,
  "data": [
    {
      "beginTime": 1716699000,
      "endTime": 1716699060,
      "openPrice": 0.00001000,
      "highPrice": 0.00001020,
      "lowPrice": 0.00000995,
      "closePrice": 0.00001005,
      "volume": 250000.00,
      "quoteVolume": 2.51,
      "count": 12
    },
    {
      "beginTime": 1716699060,
      "endTime": 1716699120,
      "openPrice": 0.00001005,
      "highPrice": 0.00001010,
      "lowPrice": 0.00000990,
      "closePrice": 0.00001000,
      "volume": 180000.00,
      "quoteVolume": 1.80,
      "count": 8
    },
    {
      "beginTime": 1716699120,
      "endTime": 1716699180,
      "openPrice": 0.00001000,
      "highPrice": 0.00001030,
      "lowPrice": 0.00000998,
      "closePrice": 0.00001025,
      "volume": 320000.00,
      "quoteVolume": 3.25,
      "count": 19
    },
    {
      "beginTime": 1716699180,
      "endTime": 1716699240,
      "openPrice": 0.00001025,
      "highPrice": 0.00001035,
      "lowPrice": 0.00001015,
      "closePrice": 0.00001020,
      "volume": 210000.00,
      "quoteVolume": 2.15,
      "count": 10
    },
    {
      "beginTime": 1716699240,
      "endTime": 1716699300,
      "openPrice": 0.00001020,
      "highPrice": 0.00001050,
      "lowPrice": 0.00001010,
      "closePrice": 0.00001045,
      "volume": 450000.00,
      "quoteVolume": 4.65,
      "count": 28
    },
    {
      "beginTime": 1716699300,
      "endTime": 1716699360,
      "openPrice": 0.00001045,
      "highPrice": 0.00001250,
      "lowPrice": 0.00001040,
      "closePrice": 0.00001220,
      "volume": 2500000.00,
      "quoteVolume": 29.50,
      "count": 142
    },
    {
      "beginTime": 1716699360,
      "endTime": 1716699420,
      "openPrice": 0.00001220,
      "highPrice": 0.00001580,
      "lowPrice": 0.00001205,
      "closePrice": 0.00001550,
      "volume": 4200000.00,
      "quoteVolume": 61.20,
      "count": 285
    },
    {
      "beginTime": 1716699420,
      "endTime": 1716699480,
      "openPrice": 0.00001550,
      "highPrice": 0.00002100,
      "lowPrice": 0.00001530,
      "closePrice": 0.00001980,
      "volume": 8500000.00,
      "quoteVolume": 158.40,
      "count": 510
    },
    {
      "beginTime": 1716699480,
      "endTime": 1716699540,
      "openPrice": 0.00001980,
      "highPrice": 0.00002850,
      "lowPrice": 0.00001950,
      "closePrice": 0.00002720,
      "volume": 12000000.00,
      "quoteVolume": 288.50,
      "count": 780
    },
    {
      "beginTime": 1716699540,
      "endTime": 1716699600,
      "openPrice": 0.00002720,
      "highPrice": 0.00003500,
      "lowPrice": 0.00002680,
      "closePrice": 0.00003450,
      "volume": 15000000.00,
      "quoteVolume": 465.00,
      "count": 920
    },
    {
      "beginTime": 1716699600,
      "endTime": 1716699660,
      "openPrice": 0.00003450,
      "highPrice": 0.00004520,
      "lowPrice": 0.00003400,
      "closePrice": 0.00004480,
      "volume": 18000000.00,
      "quoteVolume": 718.00,
      "count": 1150
    },
    {
      "beginTime": 1716699660,
      "endTime": 1716699720,
      "openPrice": 0.00004480,
      "highPrice": 0.00004890,
      "lowPrice": 0.00004210,
      "closePrice": 0.00004350,
      "volume": 22000000.00,
      "quoteVolume": 980.00,
      "count": 1420
    },
    {
      "beginTime": 1716699720,
      "endTime": 1716699780,
      "openPrice": 0.00004350,
      "highPrice": 0.00004450,
      "lowPrice": 0.00003850,
      "closePrice": 0.00003920,
      "volume": 11000000.00,
      "quoteVolume": 456.00,
      "count": 680
    },
    {
      "beginTime": 1716699780,
      "endTime": 1716699840,
      "openPrice": 0.00003920,
      "highPrice": 0.00004120,
      "lowPrice": 0.00003600,
      "closePrice": 0.00003750,
      "volume": 8500000.00,
      "quoteVolume": 331.00,
      "count": 480
    },
    {
      "beginTime": 1716699840,
      "endTime": 1716699900,
      "openPrice": 0.00003750,
      "highPrice": 0.00003850,
      "lowPrice": 0.00003420,
      "closePrice": 0.00003510,
      "volume": 6200000.00,
      "quoteVolume": 224.00,
      "count": 310
    },
    {
      "beginTime": 1716699900,
      "endTime": 1716699960,
      "openPrice": 0.00003510,
      "highPrice": 0.00003680,
      "lowPrice": 0.00003490,
      "closePrice": 0.00003650,
      "volume": 4100000.00,
      "quoteVolume": 147.00,
      "count": 210
    },
    {
      "beginTime": 1716699960,
      "endTime": 1716700020,
      "openPrice": 0.00003650,
      "highPrice": 0.00003750,
      "lowPrice": 0.00003580,
      "closePrice": 0.00003710,
      "volume": 3200000.00,
      "quoteVolume": 118.00,
      "count": 154
    },
    {
      "beginTime": 1716700020,
      "endTime": 1716700080,
      "openPrice": 0.00003710,
      "highPrice": 0.00003810,
      "lowPrice": 0.00003690,
      "closePrice": 0.00003780,
      "volume": 2900000.00,
      "quoteVolume": 109.00,
      "count": 120
    },
    {
      "beginTime": 1716700080,
      "endTime": 1716700140,
      "openPrice": 0.00003780,
      "highPrice": 0.00003840,
      "lowPrice": 0.00003750,
      "closePrice": 0.00003800,
      "volume": 2100000.00,
      "quoteVolume": 79.50,
      "count": 95
    },
    {
      "beginTime": 1716700140,
      "endTime": 1716700200,
      "openPrice": 0.00003800,
      "highPrice": 0.00003850,
      "lowPrice": 0.00003780,
      "closePrice": 0.00003820,
      "volume": 1800000.00,
      "quoteVolume": 68.60,
      "count": 78
    }
  ]
}
```

---

## 3. WebSocket 实时协议说明

WebSocket 用于向客户端实时推送最新的交易引发的 K 线柱变动（在当前未封柱的时间段内，价格和交易量会持续刷新）。

### 3.1 客户端请求消息格式 (Client -> Server)

客户端发送订阅或取消订阅 JSON：

```json
{
  "op": "subscribe",
  "args": [
    {
      "channel": "kline",
      "period": "1m",
      "address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    }
  ]
}
```

- `op`: 操作类型，取值为 `"subscribe"` (订阅) 或 `"unsubscribe"` (取消订阅)。
- `args`: 订阅的参数列表，包含：
  - `channel`: 行情通道，固定填 `"kline"`。
  - `period`: 订阅周期，可选：`"1m"`, `"15m"`, `"1h"`, `"1d"`。
  - `address`: 代币的合约账户公钥。

### 3.2 服务端确认与响应消息格式 (Server -> Client)

#### 3.2.1 操作确认单播响应

```json
{
  "event": "subscribe",
  "arg": {
    "channel": "kline",
    "period": "1m",
    "address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
  },
  "code": 0,
  "msg": "success"
}
```

#### 3.2.2 实时推送广播事件

当有最新的交易在联合曲线中被触发撮合时，服务端会广播推送当前周期的最新 K 线快照。

```json
{
  "arg": {
    "channel": "kline",
    "period": "1m",
    "address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
  },
  "data": {
    "tokenId": 10023,
    "period": "1m",
    "beginTime": 1716699960,
    "endTime": 1716700020,
    "openPrice": 0.00003650,
    "highPrice": 0.00003750,
    "lowPrice": 0.00003580,
    "closePrice": 0.00003710,
    "volume": 3200000.00,
    "quoteVolume": 118.00,
    "count": 154
  }
}
```

#### 20条连续实时 K 线更新推送 (模拟 1 分钟柱子内部随交易涌入持续闪烁刷新，直到最后定帧的真实场景)

以下为 **20次实时的 WebSocket 推送帧数据**，它展示了一个 `beginTime: 1716700200` 的 1 分钟 K 线柱，在有交易密集打入时，它的最高价、最低价、收盘价、交易量和成交笔数在短短数秒内被 20 次平滑刷新，直至该分钟结束的完整历程：

```carousel
{
  "arg": {"channel": "kline", "period": "1m", "address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"},
  "data": {
    "tokenId": 10023,
    "period": "1m",
    "beginTime": 1716700200,
    "endTime": 1716700260,
    "openPrice": 0.00003820,
    "highPrice": 0.00003820,
    "lowPrice": 0.00003820,
    "closePrice": 0.00003820,
    "volume": 10000.00,
    "quoteVolume": 0.38,
    "count": 1
  }
}
<!-- slide -->
{
  "arg": {"channel": "kline", "period": "1m", "address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"},
  "data": {
    "tokenId": 10023,
    "period": "1m",
    "beginTime": 1716700200,
    "endTime": 1716700260,
    "openPrice": 0.00003820,
    "highPrice": 0.00003850,
    "lowPrice": 0.00003820,
    "closePrice": 0.00003850,
    "volume": 35000.00,
    "quoteVolume": 1.34,
    "count": 3
  }
}
<!-- slide -->
{
  "arg": {"channel": "kline", "period": "1m", "address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"},
  "data": {
    "tokenId": 10023,
    "period": "1m",
    "beginTime": 1716700200,
    "endTime": 1716700260,
    "openPrice": 0.00003820,
    "highPrice": 0.00003890,
    "lowPrice": 0.00003810,
    "closePrice": 0.00003890,
    "volume": 125000.00,
    "quoteVolume": 4.82,
    "count": 8
  }
}
<!-- slide -->
{
  "arg": {"channel": "kline", "period": "1m", "address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"},
  "data": {
    "tokenId": 10023,
    "period": "1m",
    "beginTime": 1716700200,
    "endTime": 1716700260,
    "openPrice": 0.00003820,
    "highPrice": 0.00003890,
    "lowPrice": 0.00003800,
    "closePrice": 0.00003805,
    "volume": 250000.00,
    "quoteVolume": 9.58,
    "count": 15
  }
}
<!-- slide -->
{
  "arg": {"channel": "kline", "period": "1m", "address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"},
  "data": {
    "tokenId": 10023,
    "period": "1m",
    "beginTime": 1716700200,
    "endTime": 1716700260,
    "openPrice": 0.00003820,
    "highPrice": 0.00003920,
    "lowPrice": 0.00003800,
    "closePrice": 0.00003910,
    "volume": 580000.00,
    "quoteVolume": 22.45,
    "count": 24
  }
}
<!-- slide -->
{
  "arg": {"channel": "kline", "period": "1m", "address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"},
  "data": {
    "tokenId": 10023,
    "period": "1m",
    "beginTime": 1716700200,
    "endTime": 1716700260,
    "openPrice": 0.00003820,
    "highPrice": 0.00004100,
    "lowPrice": 0.00003800,
    "closePrice": 0.00004080,
    "volume": 1250000.00,
    "quoteVolume": 49.80,
    "count": 39
  }
}
<!-- slide -->
{
  "arg": {"channel": "kline", "period": "1m", "address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"},
  "data": {
    "tokenId": 10023,
    "period": "1m",
    "beginTime": 1716700200,
    "endTime": 1716700260,
    "openPrice": 0.00003820,
    "highPrice": 0.00004250,
    "lowPrice": 0.00003800,
    "closePrice": 0.00004210,
    "volume": 2100000.00,
    "quoteVolume": 85.50,
    "count": 52
  }
}
<!-- slide -->
{
  "arg": {"channel": "kline", "period": "1m", "address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"},
  "data": {
    "tokenId": 10023,
    "period": "1m",
    "beginTime": 1716700200,
    "endTime": 1716700260,
    "openPrice": 0.00003820,
    "highPrice": 0.00004250,
    "lowPrice": 0.00003750,
    "closePrice": 0.00003780,
    "volume": 3500000.00,
    "quoteVolume": 138.00,
    "count": 68
  }
}
<!-- slide -->
{
  "arg": {"channel": "kline", "period": "1m", "address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"},
  "data": {
    "tokenId": 10023,
    "period": "1m",
    "beginTime": 1716700200,
    "endTime": 1716700260,
    "openPrice": 0.00003820,
    "highPrice": 0.00004250,
    "lowPrice": 0.00003750,
    "closePrice": 0.00003850,
    "volume": 4100000.00,
    "quoteVolume": 161.20,
    "count": 79
  }
}
<!-- slide -->
{
  "arg": {"channel": "kline", "period": "1m", "address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"},
  "data": {
    "tokenId": 10023,
    "period": "1m",
    "beginTime": 1716700200,
    "endTime": 1716700260,
    "openPrice": 0.00003820,
    "highPrice": 0.00004250,
    "lowPrice": 0.00003750,
    "closePrice": 0.00003920,
    "volume": 4900000.00,
    "quoteVolume": 192.50,
    "count": 91
  }
}
<!-- slide -->
{
  "arg": {"channel": "kline", "period": "1m", "address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"},
  "data": {
    "tokenId": 10023,
    "period": "1m",
    "beginTime": 1716700200,
    "endTime": 1716700260,
    "openPrice": 0.00003820,
    "highPrice": 0.00004250,
    "lowPrice": 0.00003750,
    "closePrice": 0.00004010,
    "volume": 5800000.00,
    "quoteVolume": 228.00,
    "count": 105
  }
}
<!-- slide -->
{
  "arg": {"channel": "kline", "period": "1m", "address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"},
  "data": {
    "tokenId": 10023,
    "period": "1m",
    "beginTime": 1716700200,
    "endTime": 1716700260,
    "openPrice": 0.00003820,
    "highPrice": 0.00004380,
    "lowPrice": 0.00003750,
    "closePrice": 0.00004350,
    "volume": 7200000.00,
    "quoteVolume": 289.40,
    "count": 121
  }
}
<!-- slide -->
{
  "arg": {"channel": "kline", "period": "1m", "address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"},
  "data": {
    "tokenId": 10023,
    "period": "1m",
    "beginTime": 1716700200,
    "endTime": 1716700260,
    "openPrice": 0.00003820,
    "highPrice": 0.00004590,
    "lowPrice": 0.00003750,
    "closePrice": 0.00004550,
    "volume": 8900000.00,
    "quoteVolume": 367.00,
    "count": 142
  }
}
<!-- slide -->
{
  "arg": {"channel": "kline", "period": "1m", "address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"},
  "data": {
    "tokenId": 10023,
    "period": "1m",
    "beginTime": 1716700200,
    "endTime": 1716700260,
    "openPrice": 0.00003820,
    "highPrice": 0.00004890,
    "lowPrice": 0.00003750,
    "closePrice": 0.00004800,
    "volume": 12000000.00,
    "quoteVolume": 512.00,
    "count": 189
  }
}
<!-- slide -->
{
  "arg": {"channel": "kline", "period": "1m", "address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"},
  "data": {
    "tokenId": 10023,
    "period": "1m",
    "beginTime": 1716700200,
    "endTime": 1716700260,
    "openPrice": 0.00003820,
    "highPrice": 0.00005120,
    "lowPrice": 0.00003750,
    "closePrice": 0.00005080,
    "volume": 15800000.00,
    "quoteVolume": 706.50,
    "count": 242
  }
}
<!-- slide -->
{
  "arg": {"channel": "kline", "period": "1m", "address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"},
  "data": {
    "tokenId": 10023,
    "period": "1m",
    "beginTime": 1716700200,
    "endTime": 1716700260,
    "openPrice": 0.00003820,
    "highPrice": 0.00005200,
    "lowPrice": 0.00003750,
    "closePrice": 0.00004920,
    "volume": 18200000.00,
    "quoteVolume": 820.00,
    "count": 280
  }
}
<!-- slide -->
{
  "arg": {"channel": "kline", "period": "1m", "address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"},
  "data": {
    "tokenId": 10023,
    "period": "1m",
    "beginTime": 1716700200,
    "endTime": 1716700260,
    "openPrice": 0.00003820,
    "highPrice": 0.00005200,
    "lowPrice": 0.00003750,
    "closePrice": 0.00004710,
    "volume": 20400000.00,
    "quoteVolume": 923.00,
    "count": 312
  }
}
<!-- slide -->
{
  "arg": {"channel": "kline", "period": "1m", "address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"},
  "data": {
    "tokenId": 10023,
    "period": "1m",
    "beginTime": 1716700200,
    "endTime": 1716700260,
    "openPrice": 0.00003820,
    "highPrice": 0.00005200,
    "lowPrice": 0.00003750,
    "closePrice": 0.00004650,
    "volume": 22100000.00,
    "quoteVolume": 1002.50,
    "count": 340
  }
}
<!-- slide -->
{
  "arg": {"channel": "kline", "period": "1m", "address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"},
  "data": {
    "tokenId": 10023,
    "period": "1m",
    "beginTime": 1716700200,
    "endTime": 1716700260,
    "openPrice": 0.00003820,
    "highPrice": 0.00005200,
    "lowPrice": 0.00003750,
    "closePrice": 0.00004580,
    "volume": 24200000.00,
    "quoteVolume": 1098.00,
    "count": 381
  }
}
<!-- slide -->
{
  "arg": {"channel": "kline", "period": "1m", "address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"},
  "data": {
    "tokenId": 10023,
    "period": "1m",
    "beginTime": 1716700200,
    "endTime": 1716700260,
    "openPrice": 0.00003820,
    "highPrice": 0.00005200,
    "lowPrice": 0.00003750,
    "closePrice": 0.00004520,
    "volume": 25800000.00,
    "quoteVolume": 1170.40,
    "count": 412
  }
}
```

---

### 3.3 心跳保活机制

与 `meme-server` 心跳保活逻辑完全一致：

1. **Ping**: 服务端每隔 **20秒** 向客户端推送纯文本内容 `"ping"`。
2. **Pong**: 客户端必须在接收到 `"ping"` 后，迅速响应纯文本内容 `"pong"`。
3. **剔除**: 连续 **3次** (即累计约 60秒) 未检测到 pong 帧，连接将会被服务端的主动保活任务断开。

---

## 4. 常见行情错误码说明 (TradeError)

若在 WebSocket Handshake/订阅中传入非法参数，服务端会返回对应的错误信息：


| 错误码 (Code) | 描述 (Message)              | 释义                                               |
| ---------- | ------------------------- | ------------------------------------------------ |
| `0`        | `success`                 | 请求处理成功                                           |
| `-1`       | `unknown`                 | 未知错误                                             |
| `1000`     | `internal error`          | 服务端内部处理异常                                        |
| `1001`     | `invalid argument`        | 订阅报文 JSON 格式解析失败或缺少必要字段                          |
| `1002`     | `channel does not exist`  | 通道类型不支持 (非 `"kline"`)                            |
| `1003`     | `token does not exist`    | 代币不存在 (Redis cache / 数据库未收录)                     |
| `1004`     | `illegal request`         | 非法请求 (非标准 WS 连接握手)                               |
| `1005`     | `event type not support`  | 不支持的 op 操作类型                                     |
| `1007`     | `period does not support` | 不支持的 K 线周期 (仅支持 `"1m"`, `"15m"`, `"1h"`, `"1d"`) |


