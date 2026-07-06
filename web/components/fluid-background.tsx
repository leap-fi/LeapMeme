'use client'

import WebGLFluidEnhanced from 'webgl-fluid-enhanced'
import { useTheme } from 'next-themes'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// webgl-fluid-enhanced 基础参数
const BASE_FLUID_CONFIG = {
  simResolution: 128, // 速度场模拟分辨率，越低越省性能、纹理越糊
  dyeResolution: 512, // 染料（可见烟雾）分辨率，影响拖尾清晰度
  densityDissipation: 5, // 染料消散速度；越大鼠标落点消散越快、不易堆成实心圆
  velocityDissipation: 3, // 速度消散；越小彗尾拖得越长
  pressure: 0.1,
  pressureIterations: 20, // 压力求解迭代次数，影响流体稳定性
  curl: 3, // 旋度强度，增加涡流/卷曲感
  splatRadius: 0.028, // 单次 splat 半径；越小鼠标中心点越细
  splatForce: 2050, // 单次 splat 注入力度；与半径配合控制浓淡
  shading: true, // 光照 shading，让烟雾有体积感
  colorful: false, // false = 使用 colorPalette 单色，不随机彩虹色
  bloom: false,
  sunrays: false,
  transparent: true, // 画布透明，叠在页面背景上
  hover: false, // 关闭库内置 hover，改由下方 mousemove 手动 splat
  brightness: 0.32, // 染料整体亮度
} as const

const SPLAT_VELOCITY_SCALE = 2.8 // 鼠标位移 → splat 速度的倍率；略大于 1 可拉长彗尾
const SPLAT_MIN_SPEED = 2 // 低于该速度（px/frame）不 splat，避免悬停微抖堆积

const FLUID_THEMES = {
  dark: {
    colorPalette: ['#00C78C'],
    backgroundColor: '#04030b',
  },
  light: {
    colorPalette: ['#00C78C'],
    backgroundColor: '#f4fbf8',
  },
} as const

type FluidTheme = (typeof FLUID_THEMES)[keyof typeof FLUID_THEMES]

function resolveFluidTheme(theme: string | undefined): FluidTheme {
  return theme === 'light' ? FLUID_THEMES.light : FLUID_THEMES.dark
}

function buildFluidConfig(theme: string | undefined) {
  const fluidTheme = resolveFluidTheme(theme)
  return {
    ...BASE_FLUID_CONFIG,
    colorPalette: [...fluidTheme.colorPalette],
    backgroundColor: fluidTheme.backgroundColor,
  }
}

export function FluidBackground() {
  const { resolvedTheme } = useTheme()
  const containerRef = useRef<HTMLDivElement>(null)
  const fluidRef = useRef<WebGLFluidEnhanced | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    fluidRef.current?.setConfig(buildFluidConfig(resolvedTheme))
  }, [resolvedTheme])

  useEffect(() => {
    if (!mounted) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion) return

    const container = containerRef.current
    if (!container) return

    let fluid: WebGLFluidEnhanced | null = null

    try {
      fluid = new WebGLFluidEnhanced(container)
      fluidRef.current = fluid
      fluid.setConfig(buildFluidConfig(resolvedTheme))
      fluid.start()
    } catch (error) {
      console.error('Fluid background failed to start:', error)
      return
    }

    let pendingDx = 0
    let pendingDy = 0
    let pendingX = 0
    let pendingY = 0
    let rafId = 0

    const flushSplat = () => {
      rafId = 0
      if (!fluid || (pendingDx === 0 && pendingDy === 0)) return

      const dx = pendingDx * SPLAT_VELOCITY_SCALE
      const dy = -pendingDy * SPLAT_VELOCITY_SCALE

      pendingDx = 0
      pendingDy = 0

      if (Math.hypot(dx, dy) < SPLAT_MIN_SPEED) return

      fluid.splatAtLocation(pendingX, pendingY, dx, dy)
    }

    const onMouseMove = (event: MouseEvent) => {
      pendingDx += event.movementX
      pendingDy += event.movementY
      pendingX = event.clientX
      pendingY = event.clientY

      if (!rafId) {
        rafId = requestAnimationFrame(flushSplat)
      }
    }

    const onTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0]
      if (!touch) return
      pendingX = touch.clientX
      pendingY = touch.clientY
      pendingDx += 4
      pendingDy += 4
      if (!rafId) {
        rafId = requestAnimationFrame(flushSplat)
      }
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('touchmove', onTouchMove, { passive: true })

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('touchmove', onTouchMove)
      if (rafId) cancelAnimationFrame(rafId)
      fluid?.stop()
      fluidRef.current = null
    }
  }, [mounted])

  if (!mounted) return null

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-0">
      <div
        ref={containerRef}
        className="h-full w-full [&_canvas]:block [&_canvas]:!h-full [&_canvas]:!w-full"
      >
        <canvas id="fluid" className="h-full w-full" />
      </div>
    </div>,
    document.body,
  )
}
