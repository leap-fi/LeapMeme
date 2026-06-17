'use client'

import { useState, useEffect, useCallback, useRef, useMemo, type ChangeEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Header } from '@/components/header'
import { PriceTicker } from '@/components/price-ticker'
import { ChevronRight, LinkIcon, Sparkles, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useMarketsContext } from '@/contexts/markets-context'
import {
  findLeverageToken,
  formatLeverageLabel,
  getLeverageTiers,
  parseLeverageMultiplier,
} from '@/lib/account/market-leverage'
import { formatChangePercent } from '@/lib/hyperliquid/format'
import { DEFAULT_TOKEN_IMAGE, isRenderableImageSrc } from '@/lib/image-src'
import { usePrivyWalletLogin } from '@/hooks/use-privy-wallet-login'
import { useLaunchToken } from '@/hooks/use-launch-token'
import { MIN_SEED_USDC } from '@/lib/contracts/config'
import { BONDING_CURVE_GRADUATION_TARGET_USD } from '@/lib/apis/meme-server/format'
import { fetchAwsUploadTokenApi } from '@/lib/apis/account/aws-token.api'
import {
  getWorldCupCreatePrefill,
  parseWorldCupFromQuery,
} from '@/lib/world-cup-flags'

const seedBuyPresets = [
  { label: 'MIN', value: 20 },
  { label: '1%', value: 31 },
  { label: '2%', value: 62 },
  { label: '3%', value: 94 },
  { label: '5%', value: 160 },
]

export default function CreatePage() {
  const [direction, setDirection] = useState<'LONG' | 'SHORT'>('LONG')
  const [selectedAsset, setSelectedAsset] = useState('HYPE')
  const [leverage, setLeverage] = useState('3×')
  const [tokenName, setTokenName] = useState('')
  const [ticker, setTicker] = useState('')
  const [description, setDescription] = useState('')
  const [tokenImage, setTokenImage] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [seedAmount, setSeedAmount] = useState(20)
  const [showSocialLinks, setShowSocialLinks] = useState(false)
  const [socialLinks, setSocialLinks] = useState({ twitter: '', telegram: '', website: '' })
  const router = useRouter()
  const searchParams = useSearchParams()
  const worldCupPrefillAppliedRef = useRef(false)
  const { items: markets, loading: marketsLoading } = useMarketsContext()
  const loginWithWallet = usePrivyWalletLogin()
  const {
    isWalletReady,
    needsReconnect,
    ltAddress,
    ltLoading,
    txState,
    isBusy,
    resolveLt,
    launchToken,
    resetTx,
  } = useLaunchToken()

  const selectedMarket = useMemo(
    () => markets.find((m) => m.symbol === selectedAsset),
    [markets, selectedAsset],
  )

  const leverageTiers = useMemo(
    () => getLeverageTiers(selectedMarket, direction),
    [selectedMarket, direction],
  )

  const selectedLtToken = useMemo(
    () =>
      findLeverageToken(
        selectedMarket,
        direction,
        parseLeverageMultiplier(leverage),
      ),
    [selectedMarket, direction, leverage],
  )

  const accountLtAddress = selectedLtToken?.address as `0x${string}` | undefined

  useEffect(() => {
    if (marketsLoading || markets.length === 0) return
    if (!markets.some((m) => m.symbol === selectedAsset)) {
      setSelectedAsset(markets[0]!.symbol)
    }
  }, [markets, marketsLoading, selectedAsset])

  useEffect(() => {
    if (leverageTiers.length === 0) return
    const current = parseLeverageMultiplier(leverage)
    if (!leverageTiers.includes(current)) {
      setLeverage(formatLeverageLabel(leverageTiers[0]!))
    }
  }, [leverageTiers, leverage])

  useEffect(() => {
    void resolveLt(selectedAsset, leverage, direction, accountLtAddress ?? null)
  }, [selectedAsset, leverage, direction, accountLtAddress, resolveLt])

  const worldCupTeam = useMemo(
    () => parseWorldCupFromQuery(searchParams.get('from')),
    [searchParams],
  )
  const isWorldCupTokenLocked = !!worldCupTeam

  useEffect(() => {
    if (!worldCupTeam || worldCupPrefillAppliedRef.current) return
    worldCupPrefillAppliedRef.current = true
    const prefill = getWorldCupCreatePrefill(worldCupTeam)
    setTokenName(prefill.tokenName)
    setTicker(prefill.ticker)
    setDescription(prefill.description)
    setTokenImage(prefill.image)
    setUploadError(null)
  }, [worldCupTeam])

  const handleLaunch = useCallback(async () => {
    resetTx()
    try {
      const result = await launchToken({
        tokenName,
        ticker,
        description,
        underlying: selectedAsset,
        leverageLabel: leverage,
        direction,
        seedAmountUsd: seedAmount,
        socialUrls: [
          socialLinks.twitter,
          socialLinks.telegram,
          socialLinks.website,
        ],
        image: tokenImage?.trim() ? tokenImage.trim() : null,
      })
      const lev = leverage.replace(/[^\d]/g, '')
      const q = new URLSearchParams({
        address: result.tokenAddress,
        name: tokenName,
        underlying: selectedAsset,
        leverage: lev,
        direction,
      })
      router.push(`/coin/${ticker}?${q.toString()}`)
    } catch {
      // surfaced via txState
    }
  }, [
    resetTx,
    launchToken,
    tokenName,
    ticker,
    description,
    selectedAsset,
    leverage,
    direction,
    seedAmount,
    socialLinks,
    tokenImage,
    router,
  ])

  const uploadTokenImage = useCallback(async (file: File) => {
    setUploadError(null)
    setUploadingImage(true)
    try {
      const { signature, url } = await fetchAwsUploadTokenApi(file.name)
      if (!signature || !url) {
        throw new Error('Invalid upload credentials.')
      }

      const uploadRes = await fetch(signature, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
        body: file,
      })

      if (!uploadRes.ok) {
        throw new Error('Upload failed. Please try again.')
      }

      setTokenImage(url)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Upload failed, please try again shortly.'
      setUploadError(message)
    } finally {
      setUploadingImage(false)
    }
  }, [])

  const handleTokenImageChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      void uploadTokenImage(file)
      // Reset input so selecting the same file works again.
      e.target.value = ''
    },
    [uploadTokenImage],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      const file = e.dataTransfer.files?.[0]
      if (!file) return
      void uploadTokenImage(file)
    },
    [uploadTokenImage],
  )

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }, [])

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      const item = Array.from(e.clipboardData.items).find((it) =>
        it.type.startsWith('image/'),
      )
      const file = item?.getAsFile()
      if (!file) return
      void uploadTokenImage(file)
    },
    [uploadTokenImage],
  )

  const handleRemoveTokenImage = useCallback(() => {
    setTokenImage(null)
    setUploadError(null)
  }, [])

  const hasCustomImage = !!tokenImage?.trim()

  const selectedLeverageNum = parseLeverageMultiplier(leverage)
  const tokensReceived = (seedAmount * 330000).toLocaleString()
  const supplyPercent = ((seedAmount / 3100) * 100).toFixed(1)
  const curveFilled = ((seedAmount / BONDING_CURVE_GRADUATION_TARGET_USD) * 100).toFixed(1)

  const canLaunch =
    tokenName.trim().length > 0 &&
    ticker.trim().length > 0 &&
    seedAmount >= MIN_SEED_USDC &&
    !!ltAddress &&
    !ltLoading

  const launchLabel = (() => {
    if (needsReconnect) return 'RECONNECT WALLET TO LAUNCH'
    if (!isWalletReady) return 'CONNECT WALLET TO LAUNCH'
    if (ltLoading) return 'LOADING PAIR…'
    if (!ltAddress) return 'PAIR NOT AVAILABLE'
    if (isBusy) {
      if (txState.status === 'mining_address') return 'MINING ADDRESS…'
      if (txState.status === 'simulating') return 'SIMULATING LAUNCH…'
      if (txState.status === 'approving') return 'APPROVING USDC…'
      return 'CONFIRM IN WALLET…'
    }
    if (txState.status === 'success') return 'LAUNCHED'
    return 'LAUNCH TOKEN'
  })()

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PriceTicker />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
          {/* Main Form */}
          <div className="space-y-8">
            {/* Header */}
            <div>
              <p className="text-primary font-mono text-sm mb-1">NEW TOKEN</p>
              <h1 className="text-2xl font-bold text-foreground mb-2">Create a token</h1>
              {worldCupTeam ? (
                <p className="text-muted-foreground text-sm">
                  Launching the national team token for{' '}
                  <span className="text-foreground font-medium">{worldCupTeam.name}</span> — World
                  Cup 2026. Token name, ticker, description, and image are fixed for this nation.
                </p>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Choose a direction, pick your underlying, set your leverage, and deploy to the
                  bonding curve in one transaction.
                </p>
              )}
            </div>

            {/* Step 1: Choose your pair */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">1</span>
                <div>
                  <h2 className="font-semibold text-foreground">Choose your pair</h2>
                  <p className="text-muted-foreground text-sm">Pick a direction and underlying asset.</p>
                </div>
              </div>

              {/* Direction Cards */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setDirection('LONG')}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    direction === 'LONG'
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-card hover:border-primary/50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold text-foreground">LONG</h3>
                      <p className="text-muted-foreground text-sm font-mono mt-1">
                        Token moves up when underlying pumps.
                      </p>
                      <span className="inline-block mt-2 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs font-mono rounded">
                        BULLISH
                      </span>
                    </div>
                    <svg className="w-16 h-12 text-primary" viewBox="0 0 64 48">
                      <path d="M0 40 L20 30 L40 35 L64 8" stroke="currentColor" strokeWidth="2" fill="none" />
                    </svg>
                  </div>
                </button>

                <button
                  onClick={() => setDirection('SHORT')}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    direction === 'SHORT'
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-card hover:border-primary/50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold text-foreground">SHORT</h3>
                      <p className="text-muted-foreground text-sm font-mono mt-1">
                        Token moves up when underlying dumps.
                      </p>
                      <span className="inline-block mt-2 px-2 py-0.5 bg-red-500/20 text-red-400 text-xs font-mono rounded">
                        BEARISH
                      </span>
                    </div>
                    <svg className="w-16 h-12 text-red-400" viewBox="0 0 64 48">
                      <path d="M0 8 L20 18 L40 13 L64 40" stroke="currentColor" strokeWidth="2" fill="none" />
                    </svg>
                  </div>
                </button>
              </div>

              {/* Underlying Asset */}
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground">UNDERLYING ASSET</label>
                {marketsLoading ? (
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-[52px] rounded-lg" />
                    ))}
                  </div>
                ) : markets.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No markets available</p>
                ) : (
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    {markets.map((asset) => {
                      const hasChange =
                        asset.changePercent != null &&
                        Number.isFinite(asset.changePercent)

                      return (
                        <button
                          key={asset.symbol}
                          type="button"
                          onClick={() => setSelectedAsset(asset.symbol)}
                          className={`p-3 rounded-lg border text-left transition-all ${
                            selectedAsset === asset.symbol
                              ? 'border-primary bg-primary/10'
                              : 'border-border bg-card hover:border-primary/50'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {isRenderableImageSrc(asset.icon) ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={asset.icon}
                                alt=""
                                className="w-5 h-5 rounded-full shrink-0 object-cover"
                              />
                            ) : (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={DEFAULT_TOKEN_IMAGE}
                                alt=""
                                className="w-5 h-5 rounded-full shrink-0 object-cover"
                              />
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">
                                {asset.symbol}
                              </p>
                              {hasChange ? (
                                <p
                                  className={`text-xs ${
                                    asset.changePercent! >= 0
                                      ? 'text-green-400'
                                      : 'text-red-400'
                                  }`}
                                >
                                  {formatChangePercent(asset.changePercent!)}
                                </p>
                              ) : (
                                <p className="text-xs text-muted-foreground truncate">
                                  {asset.name}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Leverage */}
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground">LEVERAGE</label>
                {marketsLoading ? (
                  <div className="grid grid-cols-3 gap-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-11 rounded-lg" />
                    ))}
                  </div>
                ) : leverageTiers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No {direction.toLowerCase()} leverage for {selectedAsset}
                  </p>
                ) : (
                  <div
                    className="grid gap-2"
                    style={{
                      gridTemplateColumns: `repeat(${Math.min(leverageTiers.length, 3)}, minmax(0, 1fr))`,
                    }}
                  >
                    {leverageTiers.map((tier) => {
                      const label = formatLeverageLabel(tier)
                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={() => setLeverage(label)}
                          className={`py-3 rounded-lg border font-mono font-semibold transition-all ${
                            leverage === label
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border bg-card text-foreground hover:border-primary/50'
                          }`}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Selected Preview */}
              <div className="p-3 bg-card rounded-lg border border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="font-mono text-sm text-foreground">
                      {selectedAsset} {leverage} {direction}
                    </span>
                  </div>
                  {selectedMarket?.changePercent != null && (
                    <span className="text-primary text-sm font-mono">
                      {formatChangePercent(
                        selectedMarket.changePercent * selectedLeverageNum,
                      )}
                      {' '}
                      today
                    </span>
                  )}
                </div>
              </div>

              <p className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                <span className="text-primary">⚡</span> powered by Hyperliquid perps
              </p>
            </div>

            {/* Step 2: Token Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">2</span>
                <div>
                  <h2 className="font-semibold text-foreground">Token details</h2>
                  <p className="text-muted-foreground text-sm">
                    {isWorldCupTokenLocked
                      ? 'Locked for this World Cup nation — pick your pair and seed buy below.'
                      : "These can't be changed after launch."}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-xs font-mono text-muted-foreground">TOKEN NAME</label>
                    <span className="text-xs text-muted-foreground">{tokenName.length}/34</span>
                  </div>
                  <Input
                    value={tokenName}
                    onChange={(e) => setTokenName(e.target.value.slice(0, 34))}
                    placeholder="e.g. HYPERBULL"
                    readOnly={isWorldCupTokenLocked}
                    className={cn(
                      'bg-card border-border font-mono',
                      isWorldCupTokenLocked && 'cursor-not-allowed opacity-80',
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-xs font-mono text-muted-foreground">TICKER</label>
                    <span className="text-xs text-muted-foreground">{ticker.length}/10</span>
                  </div>
                  <Input
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value.slice(0, 10).toUpperCase())}
                    placeholder="e.g. HBULL"
                    readOnly={isWorldCupTokenLocked}
                    className={cn(
                      'bg-card border-border font-mono',
                      isWorldCupTokenLocked && 'cursor-not-allowed opacity-80',
                    )}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What's the vibe?"
                  readOnly={isWorldCupTokenLocked}
                  className={cn(
                    'bg-card border-border font-mono',
                    isWorldCupTokenLocked && 'cursor-not-allowed opacity-80',
                  )}
                />
              </div>

              {/* Token Image */}
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground">TOKEN IMAGE</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleTokenImageChange}
                />
                {hasCustomImage ? (
                  <div className="border border-border rounded-lg p-4 bg-card flex items-start gap-4">
                    <div className="w-16 h-16 shrink-0 rounded-md overflow-hidden bg-secondary/40">
                      <img
                        src={tokenImage!}
                        alt="Token"
                        className={cn(
                          'w-full h-full',
                          isWorldCupTokenLocked ? 'object-contain p-1' : 'object-cover',
                        )}
                      />
                    </div>
                    {!isWorldCupTokenLocked && (
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          disabled={uploadingImage}
                          onClick={() => fileInputRef.current?.click()}
                          className="px-4 py-1.5 rounded-md border border-border bg-transparent font-mono text-xs text-muted-foreground hover:text-foreground hover:border-primary/60 transition-colors disabled:opacity-50"
                        >
                          {uploadingImage ? (
                            <span className="inline-flex items-center gap-1.5">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              UPLOADING…
                            </span>
                          ) : (
                            'CHANGE'
                          )}
                        </button>
                        <button
                          type="button"
                          disabled={uploadingImage}
                          onClick={handleRemoveTokenImage}
                          className="px-4 py-1.5 rounded-md border border-border bg-transparent font-mono text-xs text-muted-foreground hover:text-foreground hover:border-primary/60 transition-colors disabled:opacity-50"
                        >
                          REMOVE
                        </button>
                      </div>
                    )}
                    {isWorldCupTokenLocked && (
                      <p className="text-xs font-mono text-muted-foreground self-center">
                        National flag (fixed)
                      </p>
                    )}
                  </div>
                ) : (
                  <div
                    className={cn(
                      'border border-dashed border-border rounded-lg px-6 py-10 bg-card/40 text-center space-y-3 transition-colors',
                      !isWorldCupTokenLocked &&
                        'cursor-pointer hover:border-primary/60 hover:bg-card/60',
                    )}
                    onClick={
                      isWorldCupTokenLocked
                        ? undefined
                        : () => fileInputRef.current?.click()
                    }
                    onDrop={isWorldCupTokenLocked ? undefined : handleDrop}
                    onDragOver={isWorldCupTokenLocked ? undefined : handleDragOver}
                    onPaste={isWorldCupTokenLocked ? undefined : handlePaste}
                  >
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-10 h-10 rounded-md bg-secondary/60 flex items-center justify-center">
                        <svg
                          viewBox="0 0 24 24"
                          className="w-5 h-5 text-primary"
                          aria-hidden="true"
                        >
                          <path
                            d="M5 4h14a1 1 0 0 1 1 1v10.5a1 1 0 0 1-1.6.8l-3.8-2.85a1 1 0 0 0-1.25.05l-2.42 2.21a1 1 0 0 1-1.36 0L6.8 12.8a1 1 0 0 0-1.6.2L4 15V5a1 1 0 0 1 1-1Z"
                            fill="currentColor"
                            opacity="0.9"
                          />
                          <circle cx="9" cy="8" r="1.4" fill="white" />
                        </svg>
                      </div>
                      <div className="space-y-1">
                        <p className="font-mono text-xs text-muted-foreground">
                          Click, drag, or paste to upload
                        </p>
                        <p className="font-mono text-[10px] text-muted-foreground/70">
                          JPEG, PNG, GIF, WebP — max 5MB
                        </p>
                      </div>
                    </div>
                    {uploadingImage && (
                      <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground font-mono">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Uploading to AWS...
                      </p>
                    )}
                  </div>
                )}
                {uploadError && (
                  <p className="text-xs text-destructive font-mono">{uploadError}</p>
                )}
              </div>

              {/* Social Links */}
              <button
                onClick={() => setShowSocialLinks(!showSocialLinks)}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <LinkIcon className="w-4 h-4" />
                <span className="font-mono text-sm">Add social links</span>
                <span className="text-xs">(optional)</span>
                <ChevronRight className={`w-4 h-4 transition-transform ${showSocialLinks ? 'rotate-90' : ''}`} />
              </button>

              {showSocialLinks && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-card rounded-lg border border-border">
                  <Input
                    value={socialLinks.twitter}
                    onChange={(e) => setSocialLinks({ ...socialLinks, twitter: e.target.value })}
                    placeholder="Twitter URL"
                    className="bg-background border-border font-mono text-sm"
                  />
                  <Input
                    value={socialLinks.telegram}
                    onChange={(e) => setSocialLinks({ ...socialLinks, telegram: e.target.value })}
                    placeholder="Telegram URL"
                    className="bg-background border-border font-mono text-sm"
                  />
                  <Input
                    value={socialLinks.website}
                    onChange={(e) => setSocialLinks({ ...socialLinks, website: e.target.value })}
                    placeholder="Website URL"
                    className="bg-background border-border font-mono text-sm"
                  />
                </div>
              )}
            </div>

            {/* Step 3: Seed Buy */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">3</span>
                <div>
                  <h2 className="font-semibold text-foreground">Seed buy</h2>
                  <p className="text-muted-foreground text-sm">Mandatory min $20</p>
                </div>
              </div>

              <div className="p-4 bg-card rounded-lg border border-border space-y-4">
                {/* Amount Input */}
                <div className="flex items-center gap-2 text-3xl font-bold text-foreground border-b border-border pb-4">
                  <span className="text-muted-foreground">$</span>
                  <input
                    type="number"
                    value={seedAmount}
                    onChange={(e) => setSeedAmount(Math.max(20, parseInt(e.target.value) || 20))}
                    className="bg-transparent outline-none w-full font-mono"
                    min={20}
                  />
                </div>

                {/* Preset Buttons */}
                <div className="grid grid-cols-5 gap-2">
                  {seedBuyPresets.map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => setSeedAmount(preset.value)}
                      className={`py-3 rounded-lg border font-mono text-sm transition-all ${
                        seedAmount === preset.value
                          ? 'border-primary bg-primary/10 text-foreground'
                          : 'border-border bg-background text-muted-foreground hover:border-primary/50'
                      }`}
                    >
                      <div className="font-semibold">{preset.label}</div>
                      <div className="text-xs">${preset.value}</div>
                    </button>
                  ))}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 pt-2">
                  <div className="p-3 bg-background rounded-lg border border-border">
                    <p className="text-xs font-mono text-muted-foreground">tokens received</p>
                    <p className="font-mono font-semibold text-foreground">{tokensReceived}</p>
                  </div>
                  <div className="p-3 bg-background rounded-lg border border-border">
                    <p className="text-xs font-mono text-muted-foreground">% of supply</p>
                    <p className="font-mono font-semibold text-foreground">{supplyPercent}%</p>
                  </div>
                  <div className="p-3 bg-background rounded-lg border border-border">
                    <p className="text-xs font-mono text-muted-foreground">curve filled</p>
                    <p className="font-mono font-semibold text-foreground">{curveFilled}%</p>
                  </div>
                </div>
              </div>

              {/* Launch Button */}
              <Button
                type="button"
                disabled={isBusy || (isWalletReady && !canLaunch)}
                onClick={() => {
                  if (!isWalletReady) {
                    loginWithWallet()
                    return
                  }
                  void handleLaunch()
                }}
                className="w-full py-6 bg-primary hover:bg-primary/90 text-primary-foreground font-mono font-bold text-lg disabled:opacity-50"
              >
                {isBusy ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-5 h-5 mr-2" />
                )}
                {launchLabel}
              </Button>

              {txState.status === 'error' && (
                <p className="text-center text-destructive text-sm font-mono">
                  {txState.message}
                </p>
              )}

              <p className="text-center text-muted-foreground text-sm font-mono">
                Checks USDC balance, simulates the launch, then generates a vanity address (…00000), approves{' '}
                <span className="text-primary">${seedAmount.toFixed(2)} USDC</span> if needed, and confirms on-chain
              </p>

              <p className="text-center text-muted-foreground/60 text-xs font-mono">
                Seed buy of <span className="text-primary">${seedAmount.toFixed(2)} USDC</span> is routed atomically through the TX Router - you receive tokens directly.
              </p>
            </div>
          </div>

          {/* Right Sidebar - Live Preview */}
          <div className="space-y-4">
            <h3 className="font-mono text-sm text-muted-foreground">LIVE PREVIEW</h3>

            {/* Token Card Preview */}
            <div className="bg-card rounded-lg border border-border p-4 space-y-4">
              <div className="flex gap-3">
                <div className="w-16 h-16 rounded-lg bg-secondary flex items-center justify-center overflow-hidden">
                  {!hasCustomImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={DEFAULT_TOKEN_IMAGE}
                      alt=""
                      className="w-12 h-12 object-contain"
                    />
                  ) : (
                    <img
                      src={tokenImage!}
                      alt="Token"
                      className={cn(
                        'w-full h-full',
                        isWorldCupTokenLocked ? 'object-contain p-1' : 'object-cover',
                      )}
                    />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-foreground">{tokenName || 'YOUR TOKEN'}</h4>
                  <span className="inline-block px-2 py-0.5 bg-primary/20 text-primary text-xs font-mono rounded mt-1">
                    ⚡ {selectedAsset} {leverage} {direction}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-secondary rounded">
                  <p className="text-lg font-bold text-foreground">{leverage}</p>
                  <p className="text-xs text-muted-foreground">Leverage</p>
                </div>
                <div className="p-2 bg-secondary rounded">
                  <p className="text-lg font-bold text-foreground">{selectedAsset}</p>
                  <p className="text-xs text-muted-foreground">underlying</p>
                </div>
                <div className="p-2 bg-secondary rounded">
                  <p className="text-lg font-bold text-foreground">{direction}</p>
                  <p className="text-xs text-muted-foreground">direction</p>
                </div>
              </div>
            </div>

            {/* Price Preview */}
            <div className="bg-card rounded-lg border border-border p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-mono text-sm text-muted-foreground">{selectedAsset} / USD</span>
                {selectedMarket?.changePercent != null && (
                  <span
                    className={`text-sm font-mono ${
                      selectedMarket.changePercent >= 0
                        ? 'text-green-400'
                        : 'text-red-400'
                    }`}
                  >
                    {formatChangePercent(selectedMarket.changePercent)}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                your token moves {leverage} this
              </p>

              {/* Mini Chart */}
              <div className="h-24 bg-secondary/30 rounded relative overflow-hidden">
                <svg className="w-full h-full" viewBox="0 0 200 80" preserveAspectRatio="none">
                  <path
                    d="M0 60 L20 55 L40 58 L60 45 L80 50 L100 35 L120 40 L140 25 L160 30 L180 20 L200 15"
                    stroke="hsl(var(--primary))"
                    strokeWidth="2"
                    fill="none"
                  />
                  <path
                    d="M0 60 L20 55 L40 58 L60 45 L80 50 L100 35 L120 40 L140 25 L160 30 L180 20 L200 15 L200 80 L0 80 Z"
                    fill="hsl(var(--primary))"
                    fillOpacity="0.1"
                  />
                </svg>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-card rounded-lg border border-border p-4">
              <p className="font-mono text-sm text-primary mb-2">
                {selectedAsset} {leverage} {direction}
              </p>
              <p className="text-muted-foreground text-sm">
                - if {selectedAsset} rises 10%, your token pumps ~{parseInt(leverage) * 10}% with zero buys.
              </p>
            </div>

            {/* How it Works */}
            <div className="bg-card rounded-lg border border-border p-4">
              <h4 className="font-mono text-sm text-muted-foreground mb-3">HOW IT WORKS</h4>
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span className="text-primary font-mono">1</span>
                  Token deploys to bonding curve
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-mono">2</span>
                  Users buy/sell with USDC atomically
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-mono">3</span>
                  At $9.0k MCAP, token graduates to DEX
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
