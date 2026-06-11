# Meme-Kline 接口与 WebSocket 协议文档

本文档详细介绍了 `meme-kline` 模块提供的 HTTP 接口与 WebSocket 实时推送协议。

---

## 1. HTTP 接口说明

### 1.1 获取 K 线数据列表 (GET /market/kline/list)

用于获取指定代币在特定周期和时间范围内的历史 K 线数据。

- **请求方法**: `GET`
- **请求路径**: `/market/kline/list`
- **默认端口**: `9701` (取决于 `application.yml` 的 `server.port`)
- **上下文路径 (Context Path)**: `/`
- **Content-Type**: `application/x-www-form-urlencoded`

#### 请求参数 (Query Parameters)

| 参数名 | 类型 | 是否必填 | 示例值 | 说明 |
| :--- | :--- | :--- | :--- | :--- |
| `address` | `String` | 是 | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` | 代币的合约地址 (Token Address) |
| `period` | `String` | 是 | `1m` | K 线周期，可选值：`1m` (1分钟), `15m` (15分钟), `1h` (1小时), `1d` (1天) |
| `startTime` | `Long` | 是 | `1716696000000` | 开始时间戳 (**毫秒级**，后端会除以 1000 转换为秒级进行数据库查询) |
| `endTime` | `Long` | 是 | `1716700000000` | 结束时间戳 (**毫秒级**，后端会除以 1000 转换为秒级进行数据库查询) |

#### 响应格式 (Response JSON)

响应继承自公共响应基类 `BaseResponse<List<KlineDTO>>`，结构如下：

```json
{
  "code": 0,
  "msg": "success",
  "ts": 1716700005123,
  "data": [
    {
      "beginTime": 1716699960,
      "endTime": 1716700020,
      "openPrice": 0.00012345,
      "highPrice": 0.00012567,
      "lowPrice": 0.00012210,
      "closePrice": 0.00012480,
      "volume": 50000.0,
      "quoteVolume": 6.24,
      "count": 42
    }
  ]
}
```

#### 响应字段说明

| 字段名 | 类型 | 说明 |
| :--- | :--- | :--- |
| `code` | `Integer` | 状态码，`0` 表示成功，非 `0` 表示失败 (参见第 3 节 错误码定义) |
| `msg` | `String` | 状态描述信息，成功时为 `"success"` |
| `ts` | `Long` | 响应生成的服务器当前时间戳 (**毫秒级**) |
| `data` | `List<Object>` | K 线数据列表，按时间倒序排列 (即最新的 K 线排在前面) |
| ↳ `beginTime` | `Long` | K 线开始时间 (**秒级**) |
| ↳ `endTime` | `Long` | K 线结束时间 (**秒级**) |
| ↳ `openPrice` | `BigDecimal` | 开盘价 |
| ↳ `highPrice` | `BigDecimal` | 最高价 |
| ↳ `lowPrice` | `BigDecimal` | 最低价 |
| ↳ `closePrice` | `BigDecimal` | 收盘价 |
| ↳ `volume` | `BigDecimal` | 基础代币成交量 (Base Asset Volume) |
| ↳ `quoteVolume` | `BigDecimal` | 计价资产成交额/SOL 成交额 (Quote Asset Volume) |
| ↳ `count` | `Long` | 该周期的总成交笔数 |

---

## 2. WebSocket 实时协议说明

WebSocket 用于实时推送最新交易产生的 K 线数据变化。目前主要开启的是**公共 WebSocket** 服务。

### 2.1 连接与基础配置

- **协议**: `ws` 或 `wss`
- **默认端口**: `9705` (取决于 `application.yml` 中的 `public-websocket-port`)
- **连接路径**: `/ws/kline`
- **示例地址**: `ws://127.0.0.1:9705/ws/kline`

---

### 2.2 客户端请求消息格式 (Client -> Server)

客户端通过向服务器发送 JSON 字符串来进行订阅或取消订阅操作。

#### 2.2.1 订阅 K 线通道 (Subscribe)

客户端发送订阅请求后，服务器会将该连接加入指定 Topic 的广播队列中。

- **请求示例**:
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

#### 2.2.2 取消订阅 K 线通道 (Unsubscribe)

- **请求示例**:
```json
{
  "op": "unsubscribe",
  "args": [
    {
      "channel": "kline",
      "period": "1m",
      "address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    }
  ]
}
```

#### 参数说明
- `op`: 操作类型，取值可为 `"subscribe"` (订阅), `"unsubscribe"` (取消订阅), 或者是 `"auth"` (权限验证，公共 K线无需验证)。
- `args`: 订阅的参数列表，包含：
  - `channel`: 订阅的频道名称，当前 K 线统一为 `"kline"`。
  - `period`: 订阅的 K 线周期，可选值：`"1m"`, `"15m"`, `"1h"`, `"1d"`。
  - `address`: 订阅的代币合约地址。

---

### 2.3 服务端响应消息格式 (Server -> Client)

#### 2.3.1 订阅/取消订阅结果确认 (Response)

在客户端发送 `subscribe` 或 `unsubscribe` 之后，服务端会立即单播返回一条确认消息。

- **成功响应示例**:
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

- **失败响应示例**:
```json
{
  "event": "subscribe",
  "arg": {
    "channel": "kline",
    "period": "1m",
    "address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
  },
  "code": 1007,
  "msg": "period does not support"
}
```

#### 2.3.2 实时 K 线数据推送 (Push)

当链上或者系统内发生新的 Trade 交易事件并被处理时，服务端会向所有订阅了对应 Topic 的客户端广播最新的 K 线状态。

> [!NOTE]
> 实时推送的 JSON 结构中，没有 `event`、`code`、`msg` 字段，仅包含触发的 `arg` 以及对应的 `data`。

- **推送消息示例**:
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
    "openPrice": 0.00012345,
    "highPrice": 0.00012890,
    "lowPrice": 0.00012210,
    "closePrice": 0.00012750,
    "volume": 120500.0,
    "quoteVolume": 15.22,
    "count": 48
  }
}
```

---

### 2.4 心跳与保活机制 (Heartbeat)

为确保连接的有效性，服务端与客户端实现了主动心跳检测。

1. **服务端 Ping**:
   - 服务端每隔 **20秒** (取决于配置 `front.ping-interval-seconds`) 向客户端发送一个纯文本消息：`"ping"`。
2. **客户端 Pong**:
   - 客户端在收到 `"ping"` 消息后，必须立即回复纯文本消息：`"pong"`。
3. **断线判定**:
   - 如果服务端连续 **3次** (即约 60 秒) 没有收到客户端发来的有效 `"pong"` 响应，服务端将主动关闭该 WebSocket 连接。

---

## 3. 常见错误码说明 (TradeError)

当 HTTP 或 WebSocket 请求发生错误时，服务端会返回对应的错误码与错误信息。

| 错误码 (Code) | 描述 (Message) | 释义 |
| :--- | :--- | :--- |
| `0` | `success` | 请求处理成功 |
| `-1` | `unknown` | 未知错误 |
| `1000` | `internal error` | 服务端内部错误 |
| `1001` | `invalid argument` | 请求参数非法 (例如 JSON 格式错误或缺少必填字段) |
| `1002` | `channel does not exist` | 订阅的通道不存在 (目前仅支持 `"kline"`) |
| `1003` | `token does not exist` | 订阅或查询的代币在系统中不存在 |
| `1004` | `illegal request` | 非法的请求内容 |
| `1005` | `event type not support` | 不支持的事件类型 |
| `1006` | `source does not support` | 不支持的数据源 |
| `1007` | `period does not support` | 不支持的 K 线周期 (目前仅支持 `"1m"`, `"15m"`, `"1h"`, `"1d"`) |
