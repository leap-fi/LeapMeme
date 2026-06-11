'use client'

import { motion } from 'framer-motion'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

const faqs = [
  {
    question: 'What is the World Cup Meme Launch Battle?',
    answer:
      'It\'s a competitive event on leap.fun where users create leveraged meme tokens representing World Cup 2026 national teams. The goal is to be the first token to fill its bonding curve and "graduate" to HyperSwap V2 liquidity pool, earning rewards for deployers and early holders.',
  },
  {
    question: 'How do I participate?',
    answer:
      'Simply launch a leveraged meme token for any of the 48 participating national teams on leap.fun. Choose between 3x or 5x leverage, and decide whether to go long (L) or short (S). For example, $ARG5L means Argentina 5x Long, $FRA3S means France 3x Short.',
  },
  {
    question: 'What does "graduation" mean?',
    answer:
      'Graduation occurs when a token reaches $9,000 in position value or completely fills its bonding curve. Once graduated, the token is automatically injected into HyperSwap V2 liquidity pool, and rewards are distributed to the deployer and all token holders.',
  },
  {
    question: 'How are rewards distributed?',
    answer:
      'Each trade charges 0.75% in total fees. Creators receive 33.33% of that fee (~0.25% of volume). The protocol share (66.67%, ~0.50% of volume) is accumulated and, upon graduation, distributed 100% to the top 10 token holders by balance at the graduation snapshot, proportional to their holdings within that top 10. The larger your position among the top 10, the larger your share.',
  },
  {
    question: 'What is the underlying asset for these tokens?',
    answer:
      'Since the underlying must be a Hyperliquid asset, tokens are pegged to high-beta assets like $HYPE or $BTC, but carry the World Cup narrative. This gives you leveraged exposure to crypto markets with the fun of supporting your favorite national team.',
  },
  {
    question: 'How many teams are participating?',
    answer:
      'All 48 national teams qualified for World Cup 2026 can have tokens created. Each team can have multiple tokens with different leverage levels (3x or 5x) and directions (Long or Short).',
  },
  {
    question: 'What happens if my token doesn\'t graduate?',
    answer:
      'Tokens that don\'t reach the graduation threshold remain tradeable on the bonding curve. You can continue to trade them, or wait for more community support to push towards graduation. There\'s no penalty for non-graduation.',
  },
  {
    question: 'Can I create multiple tokens?',
    answer:
      'Yes! You can deploy tokens for different teams or with different leverage configurations. Each successful graduation earns creators their accumulated 33.33% creator-fee share, while top 10 holders split the protocol fee pool for that token.',
  },
]

export function WorldCupFAQSection() {
  return (
    <section className="py-24 px-4">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-balance text-foreground">
            Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Everything you need to know about the World Cup Meme Launch Battle.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
        >
          <Accordion type="single" collapsible className="w-full space-y-3">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-card/80 backdrop-blur-sm border border-border rounded-lg px-6 last:border-b last:border-border data-[state=open]:border-primary/50 transition-colors"
              >
                <AccordionTrigger className="text-left hover:no-underline py-4 text-foreground font-medium">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  )
}
