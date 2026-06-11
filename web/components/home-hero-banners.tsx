'use client'

import { useEffect, useState } from 'react'
import { HeroBanner } from '@/components/hero-banner'
import { WorldCupHeroBanner } from '@/components/world-cup-hero-banner'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel'
import { WORLD_CUP_BANNER_LAB } from '@/lib/world-cup-banner-theme'
import { cn } from '@/lib/utils'

/** Set to true to show the World Cup hero banner instead of the default HeroBanner */
const SHOW_WORLD_CUP_BANNER = true

/** Set to true to restore the default HeroBanner slide and carousel controls (requires SHOW_WORLD_CUP_BANNER) */
const SHOW_SECOND_BANNER = false

const AUTOPLAY_MS = 60_000

export function HomeHeroBanners() {
  if (!SHOW_WORLD_CUP_BANNER) {
    return (
      <div className="relative mb-2.5">
        <HeroBanner />
      </div>
    )
  }

  if (!SHOW_SECOND_BANNER) {
    return (
      <div className="relative mb-2.5">
        <WorldCupHeroBanner />
      </div>
    )
  }

  return <HomeHeroBannersCarousel />
}

function HomeHeroBannersCarousel() {
  const [api, setApi] = useState<CarouselApi>()
  const [activeIndex, setActiveIndex] = useState(0)
  const slideCount = 2

  useEffect(() => {
    if (!api) return
    const onSelect = () => setActiveIndex(api.selectedScrollSnap())
    onSelect()
    api.on('select', onSelect)
    api.on('reInit', onSelect)
    return () => {
      api.off('select', onSelect)
      api.off('reInit', onSelect)
    }
  }, [api])

  useEffect(() => {
    if (!api) return
    const timer = window.setInterval(() => {
      if (api.canScrollNext()) {
        api.scrollNext()
      } else {
        api.scrollTo(0)
      }
    }, AUTOPLAY_MS)
    return () => window.clearInterval(timer)
  }, [api])

  return (
    <div className="relative mb-2.5">
      <Carousel setApi={setApi} opts={{ loop: true, align: 'start' }} className="w-full">
        <CarouselContent className="-ml-0">
          <CarouselItem className="pl-0 basis-full">
            <WorldCupHeroBanner />
          </CarouselItem>
          <CarouselItem className="pl-0 basis-full">
            <HeroBanner />
          </CarouselItem>
        </CarouselContent>
      </Carousel>

      <div className="pointer-events-none absolute inset-0 z-20">
        <div className="pointer-events-auto absolute bottom-3 left-5 flex items-center gap-1.5">
          {Array.from({ length: slideCount }).map((_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Go to banner ${index + 1}`}
              aria-current={activeIndex === index ? 'true' : undefined}
              onClick={() => api?.scrollTo(index)}
              className={cn(
                'h-1.5 rounded-full transition-all',
                activeIndex === index
                  ? 'w-5'
                  : 'w-1.5 bg-muted-foreground/40 hover:bg-muted-foreground/70',
                activeIndex === index && index !== 0 && 'bg-primary',
              )}
              style={
                activeIndex === index && index === 0
                  ? { backgroundColor: WORLD_CUP_BANNER_LAB }
                  : undefined
              }
            />
          ))}
        </div>
      </div>
    </div>
  )
}
