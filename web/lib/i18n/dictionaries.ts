import { MAX_TRADE_USDC } from '@/lib/contracts/config'
import { BONDING_CURVE_GRADUATION_TARGET_USD } from '@/lib/apis/meme-server/format'

export type Lang = 'en' | 'zh'

/** UI 文案字典。长文档正文另在 docs 页按 lang 分支，不走这里。 */
export const dictionaries = {
  en: {
    'hero.badge': 'leap.fun · HyperEVM',
    'hero.playground': 'Playground · low-risk experience',
    'hero.title.a': 'Launch & trade memes',
    'hero.title.b': 'backed by perps',
    'hero.subtitle':
      MAX_TRADE_USDC > 0
        ? `Bonding-curve launch, graduation to UniV2, leveraged LT exposure — max $${MAX_TRADE_USDC} per trade, no seed required. A low-risk way to experience the full flow.`
        : 'Bonding curve launch, graduation to UniV2, and leveraged LT exposure — create with a seed buy or discover tokens trending now.',
    'hero.cta': 'Launch a token',
    'footer.rights': '2026 All rights reserved',
    'footer.docs': 'Docs',
    'footer.lang': 'EN',
    'disclaimer.badge': 'Playground',
    'disclaimer.text':
      MAX_TRADE_USDC > 0
        ? `Low-risk experience version · max $${MAX_TRADE_USDC} per trade · graduates at $${BONDING_CURVE_GRADUATION_TARGET_USD} · real USDC, small amounts.`
        : 'Production mode.',
    'disclaimer.more': 'Read the docs',
  },
  zh: {
    'hero.badge': 'leap.fun · HyperEVM',
    'hero.playground': 'Playground · 低风险体验版',
    'hero.title.a': '发行并交易由永续支撑的',
    'hero.title.b': 'meme 代币',
    'hero.subtitle':
      MAX_TRADE_USDC > 0
        ? `Bonding 曲线发币、毕业进 UniV2、杠杆 LT 敞口——单笔最多 $${MAX_TRADE_USDC}，无需垫资。用极小风险体验完整流程。`
        : 'Bonding 曲线发币、毕业进 UniV2、杠杆 LT 敞口——垫资发币或发现热门代币。',
    'hero.cta': '发行代币',
    'footer.rights': '2026 版权所有',
    'footer.docs': '文档',
    'footer.lang': '中',
    'disclaimer.badge': '体验版',
    'disclaimer.text':
      MAX_TRADE_USDC > 0
        ? `低风险体验版 · 单笔最多 $${MAX_TRADE_USDC} · 募集满 $${BONDING_CURVE_GRADUATION_TARGET_USD} 毕业 · 真实 USDC、小额。`
        : '正式模式。',
    'disclaimer.more': '查看文档',
  },
} as const

export type TranslationKey = keyof (typeof dictionaries)['en']
