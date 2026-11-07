import { useCallback, useEffect, useState } from 'react'
import Cookbook from './components/Cookbook'
import Header from './components/Header'
import Hero from './components/Hero'
import HowItWorks from './components/HowItWorks'
import Impact from './components/Impact'
import Studio from './components/Studio'
import Tech from './components/Tech'
import type { Recipe } from './lib/recipe'

const KEY = 'snapchef:cookbook:v1'

function load(): Recipe[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Recipe[]) : []
  } catch {
    return []
  }
}

export default function App() {
  const [saved, setSaved] = useState<Recipe[]>(load)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(saved))
    } catch {
      /* storage full or disabled */
    }
  }, [saved])

  const toggle = useCallback((r: Recipe) => {
    setSaved((s) => (s.some((x) => x.id === r.id) ? s.filter((x) => x.id !== r.id) : [r, ...s]))
  }, [])

  return (
    <>
      <Header saved={saved.length} onOpenCookbook={() => setOpen(true)} />
      <main>
        <Hero />
        <Impact />
        <HowItWorks />
        <Studio savedIds={saved.map((s) => s.id)} onToggleSave={toggle} />
        <Tech />
      </main>
      <footer className="border-t-2 border-ink bg-paper-2 no-print">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm sm:px-6">
          <p className="font-display text-xl font-black">SnapChef <span className="font-body text-sm font-medium text-ink-soft">— cook what you have.</span></p>
          <p className="text-ink-soft">YOLOv8 · ONNX Runtime Web · LLM · React. Food-waste figures: UNEP Food Waste Index 2024.</p>
        </div>
      </footer>
      <Cookbook open={open} recipes={saved} onClose={() => setOpen(false)} onRemove={(id) => setSaved((s) => s.filter((x) => x.id !== id))} />
    </>
  )
}
