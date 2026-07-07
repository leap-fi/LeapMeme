'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { dictionaries, type Lang, type TranslationKey } from '@/lib/i18n/dictionaries'

const STORAGE_KEY = 'leap.lang'

type I18nContextValue = {
  lang: Lang
  setLang: (lang: Lang) => void
  toggle: () => void
  t: (key: TranslationKey) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // SSR 与首帧统一用 'en'，挂载后读取本地偏好，避免 hydration 不一致。
  const [lang, setLangState] = useState<Lang>('en')

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored === 'en' || stored === 'zh') {
        setLangState(stored)
        return
      }
      if (navigator.language?.toLowerCase().startsWith('zh')) {
        setLangState('zh')
      }
    } catch {
      // ignore storage errors
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // ignore storage errors
    }
  }, [])

  const toggle = useCallback(() => {
    setLang(lang === 'en' ? 'zh' : 'en')
  }, [lang, setLang])

  const t = useCallback(
    (key: TranslationKey) => dictionaries[lang][key] ?? dictionaries.en[key] ?? key,
    [lang],
  )

  const value = useMemo<I18nContextValue>(
    () => ({ lang, setLang, toggle, t }),
    [lang, setLang, toggle, t],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    throw new Error('useI18n must be used within a LanguageProvider')
  }
  return ctx
}
