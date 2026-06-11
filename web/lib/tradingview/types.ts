export type KlinePeriod = '1m' | '15m' | '1h' | '1d'

export type KlineCandle = {
  time: number // unix timestamp in seconds
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export type KlineListParams = {
  address: string
  period: KlinePeriod
  startTime: number // milliseconds
  endTime: number // milliseconds
}

export type KlineListItem = {
  beginTime: number
  endTime: number
  openPrice: number
  highPrice: number
  lowPrice: number
  closePrice: number
  volume: number
  quoteVolume: number
  count: number
}

export type KlineListResponse = {
  code: number
  msg: string
  ts: number
  data: KlineListItem[]
}

export type KlineWsArg = {
  channel: 'kline'
  period: KlinePeriod
  address: string
}

export type KlineWsPush = {
  arg: KlineWsArg
  data: KlineListItem
}
