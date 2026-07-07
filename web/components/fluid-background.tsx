'use client'

import WebGLFluidEnhanced from 'webgl-fluid-enhanced'
import { useTheme } from 'next-themes'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// webgl-fluid-enhanced 基础参数（偏柔和烟雾：落点轻、拖尾在，参考 Houdini 式扩散感）
const BASE_FLUID_CONFIG = {
  simResolution: 256, // 速度场模拟分辨率，越低越省性能、纹理越糊
  dyeResolution: 512, // 染料（可见烟雾）分辨率，影响拖尾清晰度
  densityDissipation: 5, // 染料消散；越大落点越不易堆成实心团
  velocityDissipation: 0.01, // 速度消散；略低一点保留彗尾长度
  pressure: 0.5, // 压力；影响流体稳定性
  pressureIterations: 4, // 压力求解迭代次数，影响流体稳定性
  curl: 2, // 旋度；略降减少落点处涡流堆积
  splatRadius: 0.03, // splat 半径；越小鼠标中心越细、越不「糊一团」
  splatForce: 0.1, // 注入力度；降低可减轻落点浓度，拖尾靠位移速度补足
  shading: true, // 关闭体积 shading，避免落点过亮、过实心
  colorful: false, // false = 使用 colorPalette 单色，不随机彩虹色
  bloom: true, // 轻微 bloom，边缘更柔、鼠标前进方向有手电筒效果
  bloomIterations: 1, // bloom 迭代次数，影响 bloom 效果
  bloomResolution: 256, // bloom 分辨率，影响 bloom 效果
  bloomIntensity: 0.28, // bloom 强度，影响 bloom 效果
  bloomThreshold: 0.42, // bloom 阈值，影响 bloom 效果
  bloomSoftKnee: 0.75, // bloom 软化，影响 bloom 效果
  sunrays: true, // 太阳光线，开启才不会有像素颗粒
  transparent: true, // 画布透明，叠在页面背景上
  hover: false, // 关闭库内置 hover，改由下方 mousemove 手动 splat
  brightness: 0.03, // 整体亮度；配合较低 splatForce，落点不会过曝★★★★★
} as const

const SPLAT_VELOCITY_SCALE = 3.5 // 略提高位移倍率，落点变淡后仍保留拖尾
const SPLAT_MIN_SPEED = 10 // 悬停/微抖不 splat，减少指针处染料堆积

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
