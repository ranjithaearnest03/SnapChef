import { AnimatePresence, motion } from 'framer-motion'
import {
  Check,
  CheckCheck,
  ChefHat,
  FolderPlus,
  KeyRound,
  ListPlus,
  Loader2,
  Minus,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  UtensilsCrossed,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  CATEGORIES,
  INGREDIENTS,
  colorFor,
  type Cat,
  type Ingredient,
  type PantryItem,
} from '../lib/ingredients'
import type { Diet, Mood, Prefs } from '../lib/recipe'

interface Props {
  items: PantryItem[]
  onToggleSelect: (id: string) => void
  onSelectAll: () => void
  onDeselectAll: () => void
  onUpdateQuantity: (id: string, delta: number) => void
  onRemoveItem: (id: string) => void
  onClearPantry: () => void
  onAddMultipleItems: (text: string) => void
  onAddIngredient: (ing: Ingredient) => void
  prefs: Prefs
  onPrefsChange: React.Dispatch<React.SetStateAction<Prefs>>
  onGenerateRecipe: () => void
  rPhase: 'idle' | 'working' | 'done'
  busy: boolean
  onOpenLlmSettings: () => void
  llmOn: boolean
}

const MOODS: { id: Mood; label: string; emoji: string }[] = [
  { id: 'comfort', label: 'Comfort', emoji: '🍲' },
  { id: 'light', label: 'Light', emoji: '🥗' },
  { id: 'spicy', label: 'Spicy', emoji: '🌶️' },
  { id: 'quick', label: 'Super quick', emoji: '⚡' },
]

export default function Pantry({
  items,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  onUpdateQuantity,
  onRemoveItem,
  onClearPantry,
  onAddMultipleItems,
  onAddIngredient,
  prefs,
  onPrefsChange,
  onGenerateRecipe,
  rPhase,
  busy,
  onOpenLlmSettings,
  llmOn,
}: Props) {
  const [multiInput, setMultiInput] = useState('')
  const [selectedCat, setSelectedCat] = useState<Cat | 'all'>('all')

  const selectedItems = useMemo(() => items.filter((i) => i.selected), [items])

  const handleMultiSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!multiInput.trim()) return
    onAddMultipleItems(multiInput)
    setMultiInput('')
  }

  // Filter category items for quick add
  const quickItems = useMemo(() => {
    const list = selectedCat === 'all' ? INGREDIENTS : INGREDIENTS.filter((i) => i.cat === selectedCat)
    return list.slice(0, 18)
  }, [selectedCat])

  return (
    <section id="pantry" className="mx-auto max-w-7xl scroll-mt-16 px-4 py-16 sm:px-6">
      {/* ---------------- Section Header ---------------- */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-mono text-leaf">Inventory &amp; Recipe Lab</p>
          <h2 className="font-display mt-2 text-4xl font-black leading-tight tracking-tight sm:text-5xl">
            My <span className="italic text-tomato">Pantry</span>
          </h2>
          <p className="mt-2 max-w-xl text-sm text-ink-soft">
            Ingredients noted from your photos and manual entries live here. Select the exact ingredients you want the AI chef to use.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="chip bg-white">
            Total in Pantry: <strong className="ml-1 text-ink">{items.length}</strong>
          </span>
          <span className={`chip ${selectedItems.length ? 'bg-butter' : 'bg-paper-2'}`}>
            Selected for Recipe: <strong className="ml-1 text-ink">{selectedItems.length}</strong>
          </span>
          {items.length > 0 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={onSelectAll}
                className="btn !px-3 !py-1.5 bg-white text-xs font-bold"
                title="Select all ingredients for recipe"
              >
                <CheckCheck size={14} /> Select All
              </button>
              <button
                onClick={onDeselectAll}
                className="btn !px-3 !py-1.5 bg-white text-xs font-bold"
                title="Clear ingredient selection"
              >
                <RotateCcw size={14} /> Deselect All
              </button>
              <button
                onClick={onClearPantry}
                className="btn !px-3 !py-1.5 bg-blush text-xs font-bold text-tomato-dark"
                title="Clear entire pantry"
              >
                <Trash2 size={14} /> Clear All
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ---------------- Add Multiple Items Panel ---------------- */}
      <div className="mt-8 card p-6 bg-card border-2 border-ink shadow-pop">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl border-2 border-ink bg-butter shadow-pop-sm">
            <ListPlus size={18} />
          </span>
          <div>
            <h3 className="font-display text-xl font-black">Add Food Items to Pantry</h3>
            <p className="text-xs text-ink-soft">Type single or multiple items separated by commas (e.g. <em>eggs, milk, tomatoes, garlic, olive oil</em>)</p>
          </div>
        </div>

        <form onSubmit={handleMultiSubmit} className="mt-4 flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={multiInput}
            onChange={(e) => setMultiInput(e.target.value)}
            placeholder="Type items (e.g. tomatoes, garlic, pasta, spinach, chicken)..."
            className="flex-1 rounded-2xl border-2 border-ink bg-white px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-butter"
            aria-label="Add multiple food items"
          />
          <button type="submit" className="btn bg-leaf text-white font-bold sm:!px-6">
            <Plus size={18} /> Add Items to Pantry
          </button>
        </form>

        {/* Category Quick-Add Drawer */}
        <div className="mt-5 border-t-2 border-dashed border-ink/20 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="label-mono text-ink-soft flex items-center gap-1.5">
              <FolderPlus size={14} /> Quick-Stock by Category:
            </p>
            <div className="flex flex-wrap gap-1">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCat(cat.id)}
                  className={`rounded-full border border-ink px-2.5 py-0.5 text-xs font-bold transition-colors ${
                    selectedCat === cat.id ? 'bg-butter text-ink shadow-pop-sm' : 'bg-white text-ink-soft hover:bg-paper-2'
                  }`}
                >
                  {cat.emoji} {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 max-h-28 overflow-y-auto pr-1">
            {quickItems.map((ing) => {
              const inPantry = items.find((p) => p.id === ing.id)
              return (
                <button
                  key={ing.id}
                  onClick={() => onAddIngredient(ing)}
                  className={`chip !text-xs transition-all hover:scale-105 active:scale-95 ${
                    inPantry ? 'bg-mint font-bold border-leaf' : 'bg-white hover:bg-butter'
                  }`}
                  title={inPantry ? `In pantry (x${inPantry.count}) — click to add another` : `Add ${ing.name} to pantry`}
                >
                  <span>{ing.emoji}</span>
                  <span>{ing.name}</span>
                  {inPantry ? (
                    <span className="ml-1 rounded-full bg-leaf px-1.5 py-0.2 text-[0.65rem] text-white">
                      +{inPantry.count}
                    </span>
                  ) : (
                    <Plus size={12} className="ml-0.5 text-ink-soft" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ---------------- Pantry Inventory Grid ---------------- */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-2xl font-black flex items-center gap-2">
            <UtensilsCrossed size={22} className="text-tomato" /> Pantry Inventory ({items.length})
          </h3>
          <p className="text-xs text-ink-soft">
            Click on any item to check / uncheck for the recipe
          </p>
        </div>

        {items.length === 0 ? (
          <div className="card grid min-h-[14rem] place-items-center border-dashed p-8 text-center bg-paper-2/50">
            <div>
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl border-2 border-ink bg-butter text-3xl shadow-pop">
                🧺
              </span>
              <h4 className="font-display mt-4 text-2xl font-black">Your pantry is empty</h4>
              <p className="mt-1 text-sm text-ink-soft max-w-sm mx-auto">
                Snap a photo of your fridge or counter above, or type ingredients into the box above to build your kitchen inventory!
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            <AnimatePresence>
              {items.map((item) => {
                const c = colorFor(item.id)
                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={() => onToggleSelect(item.id)}
                    className={`card relative cursor-pointer p-4 transition-all hover:-translate-y-0.5 ${
                      item.selected
                        ? 'border-leaf bg-card shadow-pop'
                        : 'border-ink/40 bg-white/70 opacity-75 shadow-none'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        {/* Custom Checkbox */}
                        <div
                          className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 border-ink transition-colors ${
                            item.selected ? 'bg-leaf text-white' : 'bg-white'
                          }`}
                        >
                          {item.selected && <Check size={14} strokeWidth={3} />}
                        </div>
                        <span className="text-2xl">{item.emoji}</span>
                        <div>
                          <p className={`font-bold leading-tight ${item.selected ? 'text-ink' : 'text-ink-soft'}`}>
                            {item.name}
                          </p>
                          <span
                            className="label-mono inline-block rounded-md px-1.5 py-0.2 !text-[0.62rem]"
                            style={{ backgroundColor: `${c}22`, color: c }}
                          >
                            {item.cat}
                          </span>
                        </div>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onRemoveItem(item.id)
                        }}
                        className="grid h-6 w-6 place-items-center rounded-full border border-ink/30 text-ink-soft hover:bg-blush hover:text-tomato hover:border-tomato"
                        aria-label={`Remove ${item.name} from pantry`}
                      >
                        <X size={12} />
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-ink/10 pt-2 text-xs">
                      {/* Source tag */}
                      <span className="text-[0.7rem] text-ink-soft flex items-center gap-1 font-semibold">
                        {item.source === 'photo' ? (
                          <>
                            📸 Photo
                            {item.conf ? ` (${Math.round(item.conf * 100)}%)` : ''}
                          </>
                        ) : (
                          '✏️ Manual'
                        )}
                      </span>

                      {/* Quantity adjuster */}
                      <div
                        className="flex items-center gap-1.5 bg-paper rounded-full border border-ink px-1.5 py-0.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => onUpdateQuantity(item.id, -1)}
                          className="grid h-5 w-5 place-items-center rounded-full text-ink hover:bg-butter"
                          aria-label="Decrease quantity"
                        >
                          <Minus size={10} />
                        </button>
                        <span className="w-4 text-center font-bold text-xs">{item.count}</span>
                        <button
                          onClick={() => onUpdateQuantity(item.id, 1)}
                          className="grid h-5 w-5 place-items-center rounded-full text-ink hover:bg-butter"
                          aria-label="Increase quantity"
                        >
                          <Plus size={10} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ---------------- Recipe Creator (Placed in Pantry) ---------------- */}
      <div className="mt-12 card p-6 sm:p-8 bg-paper border-2 border-ink shadow-pop-lg">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl border-2 border-ink bg-tomato text-paper shadow-pop-sm">
              <ChefHat size={26} />
            </span>
            <div>
              <p className="label-mono text-tomato">Recipe Creator</p>
              <h3 className="font-display text-2xl sm:text-3xl font-black">
                Cook With Your Selected Ingredients
              </h3>
            </div>
          </div>

          <button
            onClick={onOpenLlmSettings}
            className="flex items-center gap-2 rounded-xl border-2 border-ink bg-white px-3 py-1.5 text-xs font-bold text-ink shadow-pop-sm hover:bg-butter"
          >
            <KeyRound size={14} />
            {llmOn ? 'Custom LLM Active' : 'AI Settings (Optional Key)'}
          </button>
        </div>

        {/* Selected Ingredients Pill Bar */}
        <div className="mt-6 rounded-2xl border-2 border-ink bg-white p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="label-mono text-ink-soft">
              Selected Ingredients ({selectedItems.length} of {items.length})
            </span>
            {selectedItems.length > 0 && (
              <span className="text-xs text-leaf font-bold flex items-center gap-1">
                <Sparkles size={13} /> Ready to craft meal
              </span>
            )}
          </div>

          {selectedItems.length === 0 ? (
            <p className="text-sm font-semibold text-tomato-dark bg-blush/60 rounded-xl p-3 border border-tomato/30">
              ⚠️ No ingredients selected yet. Check the boxes on items in your Pantry above to choose what to cook!
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {selectedItems.map((it) => (
                <span key={it.id} className="chip bg-butter font-bold !text-xs">
                  <span>{it.emoji}</span>
                  <span>{it.name}</span>
                  {it.count > 1 && <span className="opacity-75">({it.count})</span>}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Preferences Grid */}
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Diet */}
          <fieldset>
            <legend className="label-mono mb-2 text-ink-soft">Diet</legend>
            <div className="grid grid-cols-3 gap-1.5">
              {(['any', 'vegetarian', 'vegan'] as Diet[]).map((d) => (
                <button
                  key={d}
                  onClick={() => onPrefsChange((p) => ({ ...p, diet: d }))}
                  aria-pressed={prefs.diet === d}
                  className={`rounded-xl border-2 border-ink py-2 text-xs font-bold capitalize transition-all ${
                    prefs.diet === d ? 'bg-leaf text-white shadow-pop-sm' : 'bg-white hover:bg-paper-2'
                  }`}
                >
                  {d === 'any' ? 'Anything' : d}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Time */}
          <fieldset>
            <legend className="label-mono mb-2 text-ink-soft">Time Available</legend>
            <div className="grid grid-cols-3 gap-1.5">
              {([15, 30, 60] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => onPrefsChange((p) => ({ ...p, time: t }))}
                  aria-pressed={prefs.time === t}
                  className={`rounded-xl border-2 border-ink py-2 text-xs font-bold transition-all ${
                    prefs.time === t ? 'bg-leaf text-white shadow-pop-sm' : 'bg-white hover:bg-paper-2'
                  }`}
                >
                  {t === 60 ? '1 hour' : `${t} min`}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Mood */}
          <fieldset>
            <legend className="label-mono mb-2 text-ink-soft">Meal Mood</legend>
            <div className="grid grid-cols-2 gap-1.5">
              {MOODS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => onPrefsChange((p) => ({ ...p, mood: m.id }))}
                  aria-pressed={prefs.mood === m.id}
                  className={`rounded-xl border-2 border-ink py-1.5 text-xs font-bold transition-all ${
                    prefs.mood === m.id ? 'bg-leaf text-white shadow-pop-sm' : 'bg-white hover:bg-paper-2'
                  }`}
                >
                  {m.emoji} {m.label}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Servings */}
          <div>
            <span className="label-mono text-ink-soft block mb-2">Servings</span>
            <div className="flex items-center justify-between rounded-xl border-2 border-ink bg-white px-3 py-1.5">
              <button
                onClick={() => onPrefsChange((p) => ({ ...p, servings: Math.max(1, p.servings - 1) }))}
                className="grid h-8 w-8 place-items-center rounded-lg border border-ink bg-paper-2 hover:bg-butter"
                aria-label="Fewer servings"
              >
                <Minus size={14} />
              </button>
              <span className="font-display text-2xl font-black">{prefs.servings}</span>
              <button
                onClick={() => onPrefsChange((p) => ({ ...p, servings: Math.min(8, p.servings + 1) }))}
                className="grid h-8 w-8 place-items-center rounded-lg border border-ink bg-paper-2 hover:bg-butter"
                aria-label="More servings"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Staples Checkbox */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-ink/10 pt-4">
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={prefs.staples}
              onChange={(e) => onPrefsChange((p) => ({ ...p, staples: e.target.checked }))}
              className="h-5 w-5 accent-leaf"
            />
            <span className="text-xs sm:text-sm font-semibold">
              I have basic pantry staples <span className="text-ink-soft font-normal">(oil, salt, pepper, vinegar, sugar, spices)</span>
            </span>
          </label>
        </div>

        {/* Generate Recipe Button */}
        <div className="mt-6">
          <button
            onClick={onGenerateRecipe}
            disabled={!selectedItems.length || rPhase === 'working' || busy}
            className="btn w-full bg-tomato py-4 text-lg text-paper font-black shadow-pop hover:scale-[1.01]"
          >
            {rPhase === 'working' ? (
              <>
                <Loader2 className="animate-spin" size={22} />
                The Chef is Cooking Up Ideas...
              </>
            ) : (
              <>
                <ChefHat size={24} />
                {selectedItems.length
                  ? `Make a Recipe from ${selectedItems.length} Selected Ingredient${
                      selectedItems.length === 1 ? '' : 's'
                    }`
                  : 'Select at Least 1 Ingredient to Create Recipe'}
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  )
}