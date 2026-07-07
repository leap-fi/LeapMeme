'use client'

import { Languages } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'
import { Button } from '@/components/ui/button'

export function LanguageToggle() {
  const { lang, toggle } = useI18n()

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-8 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
      aria-label={lang === 'en' ? '切换到中文' : 'Switch to English'}
      onClick={toggle}
    >
      <Languages className="size-4" />
      <span className="font-mono text-xs">{lang === 'en' ? '中' : 'EN'}</span>
    </Button>
  )
}
