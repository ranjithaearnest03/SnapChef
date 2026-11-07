import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, BookHeart, Clock, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import type { Recipe } from '../lib/recipe'
import RecipeCard from './RecipeCard'

interface Props {
  open: boolean
  recipes: Recipe[]
  onClose: () => void
  onRemove: (id: string) => void
}

export default function Cookbook({ open, recipes, onClose, onRemove }: Props) {
  const [viewId, setViewId] = useState<string | null>(null)
  const view = recipes.find((r) => r.id === viewId)

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="no-print fixed inset-0 z-50 bg-ink/50" />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="no-print fixed bottom-0 right-0 top-0 z-[60] flex w-full max-w-3xl flex-col border-l-2 border-ink bg-paper"
            role="dialog"
            aria-label="Saved recipes"
          >
            <div className="flex items-center justify-between border-b-2 border-ink bg-butter px-5 py-4">
              <div className="flex items-center gap-3">
                {view && (
                  <button onClick={() => setViewId(null)} className="grid h-9 w-9 place-items-center rounded-full border-2 border-ink bg-white" aria-label="Back to list"><ArrowLeft size={18} /></button>
                )}
                <h2 className="font-display flex items-center gap-2 text-2xl font-black"><BookHeart /> My Cookbook</h2>
              </div>
              <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full border-2 border-ink bg-white" aria-label="Close cookbook"><X /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {view ? (
                <RecipeCard recipe={view} saved onToggleSave={() => { onRemove(view.id); setViewId(null) }} />
              ) : recipes.length === 0 ? (
                <div className="grid h-full place-items-center text-center">
                  <div>
                    <p className="text-6xl">📖</p>
                    <p className="font-display mt-4 text-2xl font-bold">Nothing saved yet</p>
                    <p className="mt-1 text-ink-soft">Hit “Save” on a recipe you love and it will live here.</p>
                  </div>
                </div>
              ) : (
                <ul className="space-y-4">
                  {recipes.map((r) => (
                    <li key={r.id} className="card flex items-center gap-4 p-4">
                      <button onClick={() => setViewId(r.id)} className="min-w-0 flex-1 text-left">
                        <p className="font-display truncate text-xl font-bold">{r.title}</p>
                        <p className="mt-1 flex items-center gap-3 text-sm text-ink-soft">
                          <span className="inline-flex items-center gap-1"><Clock size={14} /> {r.minutes} min</span>
                          <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                        </p>
                      </button>
                      <button onClick={() => onRemove(r.id)} className="grid h-10 w-10 place-items-center rounded-full border-2 border-ink bg-blush" aria-label={`Delete ${r.title}`}><Trash2 size={17} /></button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
