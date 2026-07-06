import Image from 'next/image'
import { cn } from '@/lib/utils'

type LogoProps = {
  width: number
  height: number
  className?: string
  priority?: boolean
}

export function Logo({ width, height, className, priority }: LogoProps) {
  return (
    <span className={cn('relative inline-flex shrink-0', className)} style={{ width, height }}>
      <Image
        src="/logo-light.svg"
        alt="LEAP"
        width={width}
        height={height}
        className="h-full w-full dark:hidden"
        priority={priority}
      />
      <Image
        src="/logo.svg"
        alt="LEAP"
        width={width}
        height={height}
        className="hidden h-full w-full dark:block"
        priority={priority}
      />
    </span>
  )
}
