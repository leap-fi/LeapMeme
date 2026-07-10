import { BONDING_CURVE_GRADUATION_TARGET_USD } from '@/lib/apis/meme-server/format'

export type Lang = 'en' | 'zh'

/** UI 文案字典。长文档正文另在 docs 页按 lang 分支，不走这里。 */
export const dictionaries = {
  en: {
    'hero.badge': 'leap.fun · HyperEVM',
    'hero.title.a': 'Launch & trade memes',
    'hero.title.b': 'backed by perps',
    'hero.subtitle':
      'Bonding curve launch, graduation to UniV2, and leveraged LT exposure — launch without seed or add up to $20 seed buy.',
    'hero.cta': 'Launch a token',
    'footer.rights': '2026 All rights reserved',
    'footer.docs': 'Docs',
    'footer.lang': 'EN',
    'disclaimer.badge': 'LEAP',
    'disclaimer.text': `Graduates at $${BONDING_CURVE_GRADUATION_TARGET_USD} USDC raised on the bonding curve.`,
    'disclaimer.more': 'Read the docs',
  },
  zh: {
    'hero.badge': 'leap.fun · HyperEVM',
    'hero.title.a': '发行并交易由永续支撑的',
    'hero.title.b': 'meme 代币',
    'hero.subtitle':
      'Bonding 曲线发币、毕业进 UniV2、杠杆 LT 敞口——无需 seed 即可发币，可选最多 $20 seed 买入。',
    'hero.cta': '发行代币',
    'footer.rights': '2026 版权所有',
    'footer.docs': '文档',
    'footer.lang': '中',
    'disclaimer.badge': 'LEAP',
    'disclaimer.text': `Bonding 曲线募集满 $${BONDING_CURVE_GRADUATION_TARGET_USD} USDC 即毕业。`,
    'disclaimer.more': '查看文档',
  },
} as const

export type TranslationKey = keyof (typeof dictionaries)['en']
