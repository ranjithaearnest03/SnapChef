import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, Clock, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import type { Recipe } from '../lib/recipe'

export default function CookMode({ recipe, onClose }: { recipe: Recipe; onClose: () => void }) {
  const [i, setI] = useState(0)
  const last = recipe.steps.length - 1
  const next = useCallback(() => setI((v) => Math.min(last + 1, v + 1)), [last])
  const prev = useCallback(() => setI((v) => Math.max(0, v - 1)), [])
  const done = i > last

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        next()
      } else if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [next, prev, onClose])

  const step = recipe.steps[Math.min(i, last)]

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-ink text-paper" role="dialog" aria-modal="true" aria-label="Cooking mode">
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <p className="label-mono text-butter">Cooking mode</p>
          <p className="font-display text-xl font-bold">{recipe.title}</p>
        </div>
        <button onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full border-2 border-paper/40 hover:bg-paper/10" aria-label="Exit cooking mode">
          <X />
        </button>
      </div>

      <div className="mx-5 flex gap-1.5">
        {recipe.steps.map((_, k) => (
          <button key={k} onClick={() => setI(k)} aria-label={`Go to step ${k + 1}`} className={`h-2 flex-1 rounded-full transition-colors ${k <= i ? 'bg-butter' : 'bg-paper/20'}`} />
        ))}
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-y-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {done ? (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center">
              <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-leaf">
                <Check size={48} />
              </div>
              <h3 className="font-display mt-6 text-5xl font-black">Dinner is served!</h3>
              <p className="mx-auto mt-3 max-w-md text-paper/70">You just turned a photo into a meal and kept good food out of the bin.</p>
              {recipe.tip && <p className="mx-auto mt-6 max-w-md rounded-2xl bg-paper/10 p-4 text-sm">♻️ {recipe.tip}</p>}
              <button onClick={onClose} className="btn mt-8 bg-butter text-ink">Close</button>
            </motion.div>
          ) : (
            <motion.div key={i} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.25 }} className="w-full max-w-3xl">
              <p className="label-mono text-butter">Step {i + 1} of {recipe.steps.length}</p>
              <h3 className="font-display mt-2 text-5xl font-black leading-none sm:text-7xl">{step.title}</h3>
              <p className="mt-6 text-2xl leading-snug sm:text-3xl">{step.text}</p>
              {step.minutes ? (
                <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-paper/10 px-4 py-2 text-lg">
                  <Clock size={18} /> about {step.minutes} min
                </p>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!done && (
        <div className="flex items-center justify-between gap-4 px-5 pb-6">
          <button onClick={prev} disabled={i === 0} className="btn bg-paper text-ink">
            <ArrowLeft size={18} /> Back
          </button>
          <span className="label-mono hidden text-paper/50 sm:block">← → keys also work</span>
          <button onClick={next} className="btn bg-tomato text-paper">
            {i === last ? 'Finish' : 'Next'} <ArrowRight size={18} />
          </button>
        </div>
      )}
    </div>
  )
}
