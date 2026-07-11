'use client'

import { useMemo } from 'react'
import { Header } from '@/components/header'
import { PriceTicker } from '@/components/price-ticker'
import { Footer } from '@/components/footer'
import { useI18n } from '@/lib/i18n/context'
import { useProtocolConfig } from '@/contexts/protocol-context'
import type { ProtocolProfile } from '@/lib/protocol/types'

type Section = {
  heading: string
  paragraphs?: string[]
  bullets?: string[]
}

type DocContent = {
  title: string
  subtitle: string
  sections: Section[]
}

function buildDocContent(lang: 'en' | 'zh', config: ProtocolProfile): DocContent {
  const grad = config.graduationTargetUsdc
  const maxSeed = config.maxSeedUsdc
  const minSeed = config.minSeedUsdc
  const minBuy = config.minBuyUsdc
  const buyFeePct = (config.buyFeeBps / 100).toFixed(2)
  const creatorFeePct = ((config.buyFeeBps * config.creatorFeeShareBps) / 1_000_000).toFixed(2)
  const protocolFeePct = (
    (config.buyFeeBps * (10_000 - config.creatorFeeShareBps)) /
    1_000_000
  ).toFixed(2)
  const maxTradeLabel =
    config.maxTradeUsdc != null && config.maxTradeUsdc > 0
      ? `${config.maxTradeUsdc} USDC`
      : lang === 'zh'
        ? '无'
        : 'no cap'

  if (lang === 'zh') {
    return {
      title: 'LEAP 使用文档',
      subtitle: '产品、玩法与手续费分润。',
      sections: [
        {
          heading: '一、LEAP 是什么',
          paragraphs: [
            'LEAP 是一个 Web3 发币平台：任何人都能一笔交易创建 meme 代币，在 bonding 曲线上交易，募集满后自动「毕业」进入真实的 UniswapV2 池。每个代币都与一个杠杆代币（LT）配对，让持有者获得由永续合约支撑的标的杠杆敞口。',
            `创始人无需垫资即可发币；可选最多 ${maxSeed} USDC 的 seed 买入帮助启动流动性。曲线募集满 ${grad} USDC 即毕业。`,
          ],
        },
        {
          heading: '二、玩法',
          paragraphs: [
            `创建 —— 选择方向（做多/做空）、标的资产与杠杆倍数，填写代币信息并部署。seed 买入为可选项（${minSeed}–${maxSeed} USDC）。`,
            '交易 —— 直接用 USDC 买卖。bonding 曲线（带虚拟储备的 x·y=k）决定价格，买的人越多价格越高。',
            `毕业 —— 当真实累计募集达到 ${grad} USDC 时，会在该笔交易内自动毕业：把募集到的 USDC 兑换为 LT，与新铸的代币一起注入 UniswapV2 池，LP 永久锁定。毕业后继续在该池交易。`,
          ],
        },
        {
          heading: '三、手续费与分润',
          paragraphs: [
            `每笔买入和卖出（曲线阶段与毕业后一致）都收取总计 ${buyFeePct}% 的 swap 手续费，拆分如下：`,
          ],
          bullets: [
            `创作者：成交额的 ${creatorFeePct}%（占手续费的 ${(config.creatorFeeShareBps / 100).toFixed(2)}%）——归代币创作者，可随时领取。`,
            `协议：成交额的 ${protocolFeePct}%——进入协议金库。`,
            '创作者拿大头：平台分到的只有创作者的一半（创作者 : 协议 = 2 : 1）。',
            '若代币没有登记的创作者，创作者那部分也会进入协议金库。',
          ],
        },
        {
          heading: '四、参数一览',
          bullets: [
            `最小 seed：${minSeed} USDC（可选）`,
            `最大 seed：${maxSeed} USDC`,
            `最小买入：${minBuy} USDC`,
            `单笔上限：${maxTradeLabel}`,
            `毕业目标：${grad} USDC`,
            `swap 手续费：${buyFeePct}%（创作者 ${creatorFeePct}% / 协议 ${protocolFeePct}%）`,
            `参数来源：${config.source === 'chain' ? '链上合约' : '环境配置'}`,
          ],
        },
        {
          heading: '五、风险声明',
          paragraphs: [
            'LEAP 是实验性软件。meme 代币与杠杆代币波动极大，你可能损失用于交易的资金。请只用你能承受损失的资金参与，并始终自行研究（DYOR）。',
          ],
        },
      ],
    }
  }

  return {
    title: 'LEAP Documentation',
    subtitle: 'Product, gameplay and fee sharing.',
    sections: [
      {
        heading: '1. What is LEAP',
        paragraphs: [
          'LEAP is a Web3 launchpad where anyone can create a meme token in one transaction, trade it on a bonding curve, and — once it fills — graduate it to a real UniswapV2 pool. Each token is paired with a Leveraged Token (LT) that gives holders perp-backed leveraged exposure to an underlying asset.',
          `Creators can launch without seed capital. An optional seed buy up to ${maxSeed} USDC helps bootstrap liquidity. Graduation happens at ${grad} USDC raised on the curve.`,
        ],
      },
      {
        heading: '2. Gameplay',
        paragraphs: [
          `Create — Pick a direction (LONG/SHORT), an underlying asset and a leverage multiplier, name your token, and deploy. Seed buy is optional (${minSeed}–${maxSeed} USDC).`,
          'Trade — Buy and sell with USDC directly. The bonding curve (x·y=k with virtual reserves) sets the price; the more people buy, the higher it climbs.',
          `Graduate — When cumulative real raise reaches ${grad} USDC, the token graduates automatically inside that trade: the raised USDC is converted to LT and paired with freshly minted tokens into a UniswapV2 pool, with LP permanently locked. After graduation, trading continues against that pool.`,
        ],
      },
      {
        heading: '3. Fees & revenue sharing',
        paragraphs: [
          `A total swap fee of ${buyFeePct}% is charged on every buy and sell, on the curve and after graduation alike. It is split as:`,
        ],
        bullets: [
          `Creator: ${creatorFeePct}% of volume (${(config.creatorFeeShareBps / 100).toFixed(2)}% of the fee) — accrues to the token creator and can be claimed anytime.`,
          `Protocol: ${protocolFeePct}% of volume — goes to the protocol treasury.`,
          'Creators earn the larger share: the platform keeps only half of what the creator gets (creator : protocol = 2 : 1).',
          'If a token has no registered creator, the creator share also goes to the treasury.',
        ],
      },
      {
        heading: '4. Parameters',
        bullets: [
          `Min seed: ${minSeed} USDC (optional)`,
          `Max seed: ${maxSeed} USDC`,
          `Min buy: ${minBuy} USDC`,
          `Max per trade: ${maxTradeLabel}`,
          `Graduation target: ${grad} USDC`,
          `Swap fee: ${buyFeePct}% (creator ${creatorFeePct}% / protocol ${protocolFeePct}%)`,
          `Config source: ${config.source === 'chain' ? 'on-chain contracts' : 'environment'}`,
        ],
      },
      {
        heading: '5. Risk disclaimer',
        paragraphs: [
          'LEAP is experimental software. Meme tokens and leveraged tokens are highly volatile and you may lose the funds you trade. Only trade what you can afford to lose, and always do your own research.',
        ],
      },
    ],
  }
}

export default function DocsPage() {
  const { lang } = useI18n()
  const { config } = useProtocolConfig()
  const doc = useMemo(() => buildDocContent(lang, config), [lang, config])

  return (
    <div className="min-h-screen bg-transparent flex flex-col">
      <Header />
      <PriceTicker />

      <main className="flex-1 max-w-4xl mx-auto px-6 py-12 w-full">
        <h1 className="text-3xl font-bold text-foreground mb-2">{doc.title}</h1>
        <p className="text-sm text-muted-foreground mb-10">{doc.subtitle}</p>

        <div className="space-y-10 text-muted-foreground">
          {doc.sections.map((section) => (
            <section key={section.heading} className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">{section.heading}</h2>
              {section.paragraphs?.map((p, i) => (
                <p key={i} className="leading-relaxed">
                  {p}
                </p>
              ))}
              {section.bullets ? (
                <ul className="list-disc space-y-2 pl-5 leading-relaxed">
                  {section.bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  )
}
