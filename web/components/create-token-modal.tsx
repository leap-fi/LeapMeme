'use client'

import { useState } from 'react'
import { X, ImageIcon } from 'lucide-react'
import { underlyingAssetOptions, formatUnderlyingChange } from '@/lib/mock-data'

interface CreateTokenModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateTokenModal({ isOpen, onClose }: CreateTokenModalProps) {
  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [underlying, setUnderlying] = useState('HYPE')
  const [leverage, setLeverage] = useState('3')
  const [direction, setDirection] = useState<'Long' | 'Short'>('Long')

  if (!isOpen) return null

  const handleCreate = () => {
    // Mock creation - would connect to blockchain in real app
    alert(`Creating ${symbol} token: ${leverage}x ${direction} on ${underlying}`)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg bg-card border border-border rounded-xl shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Create New Token</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Image Upload */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-2">
              TOKEN IMAGE
            </label>
            <div className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
              <ImageIcon className="w-8 h-8 text-muted-foreground" />
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-2">
              NAME
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., MoonShot"
              className="w-full px-3 py-2 bg-secondary rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Symbol */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-2">
              TICKER SYMBOL
            </label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="e.g., MOON"
              maxLength={8}
              className="w-full px-3 py-2 bg-secondary rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Underlying Asset */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-2">
              UNDERLYING ASSET
            </label>
            <div className="grid grid-cols-3 gap-2">
              {underlyingAssetOptions.map((asset) => (
                <button
                  key={asset.symbol}
                  type="button"
                  onClick={() => setUnderlying(asset.symbol)}
                  className={`p-2 rounded-lg border text-left transition-all ${
                    underlying === asset.symbol
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-secondary hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-base shrink-0">{asset.icon}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{asset.symbol}</p>
                      <p
                        className={`text-[10px] font-medium ${
                          asset.change >= 0 ? 'text-primary' : 'text-destructive'
                        }`}
                      >
                        {formatUnderlyingChange(asset.change)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Leverage */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-2">
              LEVERAGE
            </label>
            <div className="flex gap-2">
              {['2', '3', '5'].map((lev) => (
                <button
                  key={lev}
                  onClick={() => setLeverage(lev)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    leverage === lev
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {lev}x
                </button>
              ))}
            </div>
          </div>

          {/* Direction */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-2">
              DIRECTION
            </label>
            <div className="flex gap-2">
              {(['Long', 'Short'] as const).map((dir) => (
                <button
                  key={dir}
                  onClick={() => setDirection(dir)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    direction === dir
                      ? dir === 'Long' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-destructive text-destructive-foreground'
                      : 'bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {dir}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <button
            onClick={handleCreate}
            disabled={!name || !symbol}
            className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            CREATE TOKEN
          </button>
          <p className="text-center text-xs text-muted-foreground mt-3">
            By creating, you agree to the Terms of Use and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  )
}
