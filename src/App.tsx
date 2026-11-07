import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import Cookbook from './components/Cookbook'
import Header from './components/Header'
import Hero from './components/Hero'
import HowItWorks from './components/HowItWorks'
import Impact from './components/Impact'
import LlmSettings from './components/LlmSettings'
import Pantry from './components/Pantry'
import RecipeCard from './components/RecipeCard'
import Studio from './components/Studio'
import Tech from './components/Tech'
import {
  byId,
  loadPantry,
  parseMultipleIngredients,
  resolveIngredient,
  savePantry,
  type Ingredient,
  type PantryItem,
} from './lib/ingredients'
import {
  generateRecipe,
  loadLlmConfig,
  type Prefs,
  type Recipe,
} from './lib/recipe'
import type { DetectedIngredientSummary } from './lib/yolo'

const COOKBOOK_KEY = 'snapchef:cookbook:v1'

function loadSavedRecipes(): Recipe[] {
  try {
    const raw = localStorage.getItem(COOKBOOK_KEY)
    return raw ? (JSON.parse(raw) as Recipe[]) : []
  } catch {
    return []
  }
}

const THINKING = [
  'Reading your selected ingredients...',
  'Balancing flavours and textures...',
  'Checking your time budget...',
  'Writing the method step by step...',
  'Adding a zero-waste tip...',
]

export default function App() {
  const [saved, setSaved] = useState<Recipe[]>(loadSavedRecipes)
  const [cookbookOpen, setCookbookOpen] = useState(false)
  const [pantry, setPantry] = useState<PantryItem[]>(loadPantry)

  const [llmOpen, setLlmOpen] = useState(false)
  const [llmOn, setLlmOn] = useState(() => !!loadLlmConfig())

  const [prefs, setPrefs] = useState<Prefs>({
    diet: 'any',
    time: 30,
    servings: 2,
    mood: 'comfort',
    staples: true,
  })

  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [rPhase, setRPhase] = useState<'idle' | 'working' | 'done'>('idle')
  const [thinkIdx, setThinkIdx] = useState(0)

  const seed = useRef(0)
  const recipeRef = useRef<HTMLDivElement>(null)

  // Save cookbook changes
  useEffect(() => {
    try {
      localStorage.setItem(COOKBOOK_KEY, JSON.stringify(saved))
    } catch {
      /* storage full or disabled */
    }
  }, [saved])

  // Save pantry changes
  useEffect(() => {
    savePantry(pantry)
  }, [pantry])

  // Thinking animation cycle
  useEffect(() => {
    if (rPhase !== 'working') return
    const t = window.setInterval(() => setThinkIdx((i) => (i + 1) % THINKING.length), 1800)
    return () => window.clearInterval(t)
  }, [rPhase])

  const toggleSaveRecipe = useCallback((r: Recipe) => {
    setSaved((s) => (s.some((x) => x.id === r.id) ? s.filter((x) => x.id !== r.id) : [r, ...s]))
  }, [])

  // Auto-add photo detections to pantry
  const handleAddPhotoDetections = useCallback((dets: DetectedIngredientSummary[]) => {
    setPantry((prev) => {
      const next = [...prev]
      for (const d of dets) {
        const idx = next.findIndex((p) => p.id === d.id)
        if (idx >= 0) {
          next[idx] = {
            ...next[idx],
            count: Math.max(next[idx].count, d.count),
            conf: Math.max(next[idx].conf ?? 0, d.conf),
            selected: true,
            source: 'photo',
          }
        } else {
          const ing = byId(d.id)
          next.push({
            id: d.id,
            name: ing?.name ?? d.name,
            emoji: ing?.emoji ?? d.emoji,
            cat: ing?.cat ?? 'misc',
            count: d.count || 1,
            selected: true,
            source: 'photo',
            conf: d.conf,
            addedAt: Date.now(),
          })
        }
      }
      return next
    })
  }, [])

  // Add multiple items from comma-separated input
  const handleAddMultipleItems = useCallback((text: string) => {
    const list = parseMultipleIngredients(text)
    if (!list.length) return
    setPantry((prev) => {
      const next = [...prev]
      for (const ing of list) {
        const idx = next.findIndex((p) => p.id === ing.id)
        if (idx >= 0) {
          next[idx] = { ...next[idx], count: next[idx].count + 1, selected: true }
        } else {
          next.push({
            id: ing.id,
            name: ing.name,
            emoji: ing.emoji,
            cat: ing.cat,
            count: 1,
            selected: true,
            source: 'manual',
            addedAt: Date.now(),
          })
        }
      }
      return next
    })
  }, [])

  // Add single ingredient
  const handleAddIngredient = useCallback((ing: Ingredient) => {
    setPantry((prev) => {
      const idx = prev.findIndex((p) => p.id === ing.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], count: next[idx].count + 1, selected: true }
        return next
      }
      return [
        ...prev,
        {
          id: ing.id,
          name: ing.name,
          emoji: ing.emoji,
          cat: ing.cat,
          count: 1,
          selected: true,
          source: 'manual',
          addedAt: Date.now(),
        },
      ]
    })
  }, [])

  const handleToggleSelect = useCallback((id: string) => {
    setPantry((prev) => prev.map((p) => (p.id === id ? { ...p, selected: !p.selected } : p)))
  }, [])

  const handleSelectAll = useCallback(() => {
    setPantry((prev) => prev.map((p) => ({ ...p, selected: true })))
  }, [])

  const handleDeselectAll = useCallback(() => {
    setPantry((prev) => prev.map((p) => ({ ...p, selected: false })))
  }, [])

  const handleUpdateQuantity = useCallback((id: string, delta: number) => {
    setPantry((prev) =>
      prev
        .map((p) => (p.id === id ? { ...p, count: p.count + delta } : p))
        .filter((p) => p.count > 0),
    )
  }, [])

  const handleRemoveItem = useCallback((id: string) => {
    setPantry((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const handleClearPantry = useCallback(() => {
    if (window.confirm('Clear all items from your pantry?')) {
      setPantry([])
    }
  }, [])

  // Generate recipe with selected ingredients from pantry
  const handleGenerateRecipe = useCallback(
    async (regen = false) => {
      const selected = pantry.filter((p) => p.selected)
      if (!selected.length) return

      if (regen) seed.current++
      setRPhase('working')
      setThinkIdx(0)

      setTimeout(() => recipeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)

      const ingredientsList: Ingredient[] = selected.map(
        (p) =>
          byId(p.id) ??
          resolveIngredient(p.name) ?? {
            id: p.id,
            name: p.name,
            emoji: p.emoji,
            cat: p.cat,
            per: 1,
            unit: 'portion',
          },
      )

      const r = await generateRecipe(
        ingredientsList,
        prefs,
        seed.current,
        regen ? recipe?.title : undefined,
      )

      setRecipe(r)
      setRPhase('done')
      setTimeout(() => recipeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
    },
    [pantry, prefs, recipe?.title],
  )

  const selectedItems = pantry.filter((p) => p.selected)

  return (
    <>
      <Header saved={saved.length} onOpenCookbook={() => setCookbookOpen(true)} />
      <main>
        <Hero />
        <Impact />
        <HowItWorks />

        {/* Vision Studio for Photo Scanning */}
        <Studio
          onAddPhotoDetections={handleAddPhotoDetections}
          onAddSuggestedProduce={handleAddIngredient}
        />

        {/* Dedicated Pantry Section with Embedded Recipe Creator */}
        <Pantry
          items={pantry}
          onToggleSelect={handleToggleSelect}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onClearPantry={handleClearPantry}
          onAddMultipleItems={handleAddMultipleItems}
          onAddIngredient={handleAddIngredient}
          prefs={prefs}
          onPrefsChange={setPrefs}
          onGenerateRecipe={() => handleGenerateRecipe(false)}
          rPhase={rPhase}
          busy={false}
          onOpenLlmSettings={() => setLlmOpen(true)}
          llmOn={llmOn}
        />

        {/* Generated Recipe View */}
        <div ref={recipeRef} id="recipe" className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 scroll-mt-24">
          {rPhase === 'working' && (
            <div className="card grid min-h-[20rem] place-items-center p-10 text-center" role="status">
              <div>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2.4, ease: 'linear' }}
                  className="mx-auto grid h-20 w-20 place-items-center rounded-full border-2 border-dashed border-ink text-4xl"
                >
                  🍳
                </motion.div>
                <h3 className="font-display mt-6 text-3xl font-black">The chef is cooking</h3>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={thinkIdx}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="mt-2 text-ink-soft font-semibold"
                  >
                    {THINKING[thinkIdx]}
                  </motion.p>
                </AnimatePresence>
                <div className="mx-auto mt-6 flex max-w-md flex-wrap justify-center gap-1.5">
                  {selectedItems.map((i) => (
                    <span key={i.id} className="chip !text-xs font-bold bg-white">
                      {i.emoji} {i.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {rPhase === 'done' && recipe && (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              saved={saved.some((s) => s.id === recipe.id)}
              onToggleSave={() => toggleSaveRecipe(recipe)}
              onRegenerate={() => handleGenerateRecipe(true)}
            />
          )}
        </div>

        <Tech />
      </main>

      <footer className="border-t-2 border-ink bg-paper-2 no-print">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm sm:px-6">
          <p className="font-display text-xl font-black">
            SnapChef <span className="font-body text-sm font-medium text-ink-soft">— cook what you have.</span>
          </p>
          <p className="text-ink-soft">
            YOLOv8 • ONNX Runtime Web • LLM Chef • React • Tailwind CSS
          </p>
        </div>
      </footer>

      {/* AI Key Settings Modal */}
      <LlmSettings open={llmOpen} onClose={() => setLlmOpen(false)} onChange={setLlmOn} />

      {/* Cookbook Modal */}
      <Cookbook
        open={cookbookOpen}
        recipes={saved}
        onClose={() => setCookbookOpen(false)}
        onRemove={(id) => setSaved((s) => s.filter((x) => x.id !== id))}
      />
    </>
  )
}