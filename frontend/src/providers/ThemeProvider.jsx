// src/providers/ThemeProvider.jsx
import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const ThemeCtx = createContext({ theme: 'light', toggle: () => {}, setTheme: () => {} })

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // 优先用本地记忆；否则跟随系统
    const saved = typeof window !== 'undefined' ? localStorage.getItem('theme') : null
    if (saved === 'light' || saved === 'dark') return saved
    if (typeof window !== 'undefined' && window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }
    return 'light'
  })

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
    try { localStorage.setItem('theme', theme) } catch {}
  }, [theme])

  const value = useMemo(
    () => ({ theme, setTheme, toggle: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')) }),
    [theme]
  )

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>
}

export const useTheme = () => useContext(ThemeCtx)
