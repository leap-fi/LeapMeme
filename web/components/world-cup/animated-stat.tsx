'use client'

import { useEffect, useRef, useState } from 'react'
import { animate, useInView } from 'framer-motion'

type AnimatedStatProps = {
  value: number
  prefix?: string
  suffix?: string
  duration?: number
  delay?: number
  className?: string
}

function formatNumber(n: number) {
  return Math.round(n).toLocaleString('en-US')
}

export function AnimatedStat({
  value,
  prefix = '',
  suffix = '',
  duration = 1.8,
  delay = 0.5,
  className,
}: AnimatedStatProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  const [display, setDisplay] = useState(`${prefix}0${suffix}`)

  useEffect(() => {
    if (!isInView) return

    let controls: ReturnType<typeof animate> | undefined
    const timeout = setTimeout(() => {
      controls = animate(0, value, {
        duration,
        ease: [0.16, 1, 0.3, 1],
        onUpdate: (latest) => {
          setDisplay(`${prefix}${formatNumber(latest)}${suffix}`)
        },
      })
    }, delay * 1000)

    return () => {
      clearTimeout(timeout)
      controls?.stop()
    }
  }, [isInView, value, prefix, suffix, duration, delay])

  return (
    <div ref={ref} className={className}>
      {display}
    </div>
  )
}
