import { cn } from '@/lib/utils'

const WAVE_PATH =
  'M0 96 C120 56 240 136 360 96 C480 56 600 136 720 96 C840 56 960 136 1080 96 C1200 56 1320 136 1440 96 L1440 320 L0 320 Z'

const WAVES = [
  { opacity: 0.45, duration: 5, delay: 0, height: '72%' },
  { opacity: 0.28, duration: 7, delay: 0.6, height: '58%' },
  { opacity: 0.16, duration: 9, delay: 1.2, height: '44%' },
] as const

type HeroBannerEffectProps = {
  waveColor?: string
}

export function HeroBannerEffect({ waveColor }: HeroBannerEffectProps = {}) {
  return (
    <div
      className="pointer-events-none absolute inset-y-0 right-0 hidden md:block w-[70%] min-w-[65%] overflow-hidden motion-reduce:opacity-50 [mask-image:linear-gradient(to_right,transparent_0%,rgba(0,0,0,0.4)_30%,black_58%)]"
      aria-hidden
    >
      {WAVES.map((wave, i) => (
        <div
          key={i}
          className={cn(
            'hero-banner-wave-layer absolute bottom-0 left-0 right-0',
            !waveColor && 'text-primary',
          )}
          style={{
            height: wave.height,
            opacity: wave.opacity,
            color: waveColor,
            animation: `hero-wave-drift ${wave.duration}s linear infinite`,
            animationDelay: `${wave.delay}s`,
          }}
        >
          <svg
            className="h-full w-[200%] will-change-transform"
            viewBox="0 0 1440 320"
            preserveAspectRatio="none"
            fill="currentColor"
          >
            <path d={WAVE_PATH} />
            <path d={WAVE_PATH} transform="translate(1440 0)" />
          </svg>
        </div>
      ))}
    </div>
  )
}
