import { AnimatePresence, motion } from 'framer-motion'
import { Camera, ChefHat, Cpu, ImagePlus, KeyRound, Loader2, Minus, Plus, RotateCcw, Upload, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { INGREDIENTS, COCO_FOOD, QUICK_ADD, byId, colorFor, resolveIngredient, type Ingredient } from '../lib/ingredients'
import { generateRecipe, loadLlmConfig, type Diet, type Mood, type Prefs, type Recipe } from '../lib/recipe'
import { detect, isModelReady, loadImage, loadModel, type Detection } from '../lib/yolo'
import LlmSettings from './LlmSettings'
import RecipeCard from './RecipeCard'

const SAMPLES = [
  { src: '/samples/market-table.jpg', label: 'Fruit stand' },
  { src: '/samples/veg.jpg', label: 'Veg & fruit' },
  { src: '/samples/haul.jpg', label: 'Grocery haul' },
  { src: '/samples/fruit.jpg', label: 'Fruit bowl' },
]

type Phase = 'idle' | 'loading' | 'detecting' | 'done' | 'error'

interface Item {
  id: string
  ing: Ingredient
  count: number
  conf?: number
  source: 'photo' | 'manual'
}

interface Props {
  savedIds: string[]
  onToggleSave: (r: Recipe) => void
}

const MOODS: { id: Mood; label: string; emoji: string }[] = [
  { id: 'comfort', label: 'Comfort', emoji: '🍲' },
  { id: 'light', label: 'Light', emoji: '🥗' },
  { id: 'spicy', label: 'Spicy', emoji: '🌶️' },
  { id: 'quick', label: 'Super quick', emoji: '⚡' },
]

const THINKING = [
  'Reading your ingredient list…',
  'Balancing flavours and textures…',
  'Checking your time budget…',
  'Writing the method step by step…',
  'Adding a zero-waste tip…',
]

export default function Studio({ savedIds, onToggleSave }: Props) {
  const [img, setImg] = useState<{ url: string; w: number; h: number; name: string } | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState('')
  const [dets, setDets] = useState<Detection[]>([])
  const [ms, setMs] = useState<number | null>(null)
  const [conf, setConf] = useState(0.35)
  const [manual, setManual] = useState<Ingredient[]>([])
  const [removed, setRemoved] = useState<string[]>([])
  const [hover, setHover] = useState<string | null>(null)
  const [drag, setDrag] = useState(false)
  const [text, setText] = useState('')
  const [llmOpen, setLlmOpen] = useState(false)
  const [llmOn, setLlmOn] = useState(() => !!loadLlmConfig())

  const [prefs, setPrefs] = useState<Prefs>({ diet: 'any', time: 30, servings: 2, mood: 'comfort', staples: true })
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [rPhase, setRPhase] = useState<'idle' | 'working' | 'done'>('idle')
  const [thinkIdx, setThinkIdx] = useState(0)
  const seed = useRef(0)
  const runId = useRef(0)
  const recipeRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const camRef = useRef<HTMLInputElement>(null)
  const urlRef = useRef<string | null>(null)

  // Warm up the model while the visitor is reading the page.
  useEffect(() => {
    const t = window.setTimeout(() => {
      loadModel().catch(() => undefined)
    }, 2500)
    return () => window.clearTimeout(t)
  }, [])

  useEffect(() => {
    if (rPhase !== 'working') return
    const t = window.setInterval(() => setThinkIdx((i) => (i + 1) % THINKING.length), 1800)
    return () => window.clearInterval(t)
  }, [rPhase])

  const foodDets = useMemo(() => dets.filter((d) => COCO_FOOD[d.classId]), [dets])
  const others = useMemo(() => {
    const m: Record<string, number> = {}
    dets.filter((d) => !COCO_FOOD[d.classId] && d.score >= 0.5).forEach((d) => (m[d.label] = (m[d.label] ?? 0) + 1))
    return Object.entries(m)
  }, [dets])

  const visibleDets = useMemo(
    () => foodDets.filter((d) => d.score >= conf && !removed.includes(COCO_FOOD[d.classId])),
    [foodDets, conf, removed],
  )

  const items = useMemo<Item[]>(() => {
    const map = new Map<string, Item>()
    for (const d of visibleDets) {
      const id = COCO_FOOD[d.classId]
      const cur = map.get(id)
      if (cur) {
        cur.count++
        cur.conf = Math.max(cur.conf ?? 0, d.score)
      } else {
        map.set(id, { id, ing: byId(id)!, count: 1, conf: d.score, source: 'photo' })
      }
    }
    for (const m of manual) if (!map.has(m.id)) map.set(m.id, { id: m.id, ing: m, count: 1, source: 'manual' })
    return [...map.values()]
  }, [visibleDets, manual])

  const resetResults = () => {
    setDets([])
    setMs(null)
    setManual([])
    setRemoved([])
    setRecipe(null)
    setRPhase('idle')
    seed.current = 0
  }

  const runDetection = useCallback(async (url: string, name: string) => {
    const id = ++runId.current
    resetResults()
    setError('')
    try {
      const el = await loadImage(url)
      if (id !== runId.current) return
      setImg({ url, w: el.naturalWidth, h: el.naturalHeight, name })
      setPhase(isModelReady() ? 'detecting' : 'loading')
      await loadModel()
      if (id !== runId.current) return
      setPhase('detecting')
      const [res] = await Promise.all([detect(el), new Promise((r) => setTimeout(r, 1100))])
      if (id !== runId.current) return
      setDets(res.detections)
      setMs(res.inferenceMs)
      setPhase('done')
    } catch (e) {
      if (id !== runId.current) return
      setError(e instanceof Error ? e.message : 'Something went wrong while analysing the photo.')
      setPhase('error')
    }
  }, [])

  const handleFile = useCallback(
    (file: File | undefined | null) => {
      if (!file) return
      if (!file.type.startsWith('image/')) {
        setError('Please choose an image file (JPG, PNG, WebP).')
        setPhase('error')
        return
      }
      if (urlRef.current?.startsWith('blob:')) URL.revokeObjectURL(urlRef.current)
      const url = URL.createObjectURL(file)
      urlRef.current = url
      void runDetection(url, file.name)
    },
    [runDetection],
  )

  const useSample = (src: string, label: string) => {
    if (urlRef.current?.startsWith('blob:')) URL.revokeObjectURL(urlRef.current)
    urlRef.current = src
    void runDetection(src, label)
  }

  // paste an image from the clipboard
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const f = Array.from(e.clipboardData?.files ?? []).find((x) => x.type.startsWith('image/'))
      if (f) handleFile(f)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [handleFile])

  const clearPhoto = () => {
    runId.current++
    setImg(null)
    setPhase('idle')
    setError('')
    resetResults()
    if (fileRef.current) fileRef.current.value = ''
    if (camRef.current) camRef.current.value = ''
  }

  const addIngredient = (ing: Ingredient | null) => {
    if (!ing) return
    setRemoved((r) => r.filter((x) => x !== ing.id))
    setManual((m) => (m.some((x) => x.id === ing.id) ? m : [...m, ing]))
    setText('')
  }

  const removeItem = (it: Item) => {
    setManual((m) => m.filter((x) => x.id !== it.id))
    if (it.source === 'photo') setRemoved((r) => [...r, it.id])
  }

  const generate = async (regen = false) => {
    if (!items.length) return
    if (regen) seed.current++
    setRPhase('working')
    setThinkIdx(0)
    setTimeout(() => recipeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
    const r = await generateRecipe(
      items.map((i) => i.ing),
      prefs,
      seed.current,
      regen ? recipe?.title : undefined,
    )
    setRecipe(r)
    setRPhase('done')
    setTimeout(() => recipeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }

  const busy = phase === 'loading' || phase === 'detecting'
  const step = !img ? 1 : busy ? 2 : rPhase === 'done' || rPhase === 'working' ? 3 : 2
  const quick = QUICK_ADD.map((id) => byId(id)!).filter((i) => !items.some((x) => x.id === i.id))

  return (
    <section id="studio" className="mx-auto max-w-7xl scroll-mt-16 px-4 py-20 sm:px-6">
      <p className="label-mono text-tomato">Try it now</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-6">
        <h2 className="font-display max-w-2xl text-4xl font-black leading-[1.02] tracking-tight sm:text-6xl">
          The SnapChef <span className="italic text-tomato">studio</span>
        </h2>
        <ol className="flex items-center gap-2 text-sm font-bold" aria-label="Progress">
          {['Snap', 'Detect & review', 'Cook'].map((s, i) => (
            <li key={s} className="flex items-center gap-2">
              <span className={`grid h-8 w-8 place-items-center rounded-full border-2 border-ink transition-colors ${step > i + 1 ? 'bg-leaf text-white' : step === i + 1 ? 'bg-butter' : 'bg-white'}`}>{i + 1}</span>
              <span className={`hidden sm:inline ${step === i + 1 ? '' : 'text-ink-soft'}`}>{s}</span>
              {i < 2 && <span className="h-0.5 w-5 bg-ink/30" />}
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        {/* ---------------- photo panel ---------------- */}
        <div>
          <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={(e) => handleFile(e.target.files?.[0])} aria-label="Upload a photo" />
          <input ref={camRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => handleFile(e.target.files?.[0])} aria-label="Take a photo" />

          {!img ? (
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDrag(true)
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDrag(false)
                handleFile(e.dataTransfer.files?.[0])
              }}
              className={`card flex min-h-[26rem] flex-col items-center justify-center border-dashed p-8 text-center transition-colors ${drag ? 'bg-butter' : 'bg-card'}`}
            >
              <motion.div animate={{ rotate: [-4, 4, -4] }} transition={{ repeat: Infinity, duration: 4 }} className="grid h-24 w-24 place-items-center rounded-3xl border-2 border-ink bg-tomato text-paper shadow-pop">
                <Camera size={44} />
              </motion.div>
              <h3 className="font-display mt-6 text-3xl font-black">Drop a photo of your fridge</h3>
              <p className="mt-2 max-w-sm text-ink-soft">Drag &amp; drop, paste from the clipboard, or pick a file. Works with fridge shelves, pantry or the kitchen counter.</p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button className="btn bg-tomato text-paper" onClick={() => fileRef.current?.click()}><Upload size={18} /> Upload photo</button>
                <button className="btn bg-white" onClick={() => camRef.current?.click()}><Camera size={18} /> Use camera</button>
              </div>
              {phase === 'error' && <p className="mt-4 rounded-xl bg-blush px-4 py-2 text-sm font-semibold" role="alert">{error}</p>}
              <div className="mt-8 w-full border-t-2 border-dashed border-ink/20 pt-6">
                <p className="label-mono text-ink-soft">No photo handy? Try a sample</p>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {SAMPLES.map((s) => (
                    <button key={s.src} onClick={() => useSample(s.src, s.label)} className="group overflow-hidden rounded-2xl border-2 border-ink bg-white shadow-pop-sm transition-transform hover:-translate-y-1" aria-label={`Use sample: ${s.label}`}>
                      <img src={s.src} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover transition-transform group-hover:scale-105" />
                      <span className="block px-2 py-1.5 text-xs font-bold">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="card overflow-hidden p-3">
              <div className="relative overflow-hidden rounded-2xl bg-paper-2">
                <img src={img.url} alt={`Uploaded photo: ${img.name}`} className="block max-h-[70vh] w-full object-contain" style={{ aspectRatio: `${img.w} / ${img.h}` }} />
                {busy && (
                  <>
                    <div className="scanline" />
                    <div className="absolute inset-0 bg-ink/10" />
                  </>
                )}
                {phase === 'done' &&
                  visibleDets.map((d, i) => {
                    const id = COCO_FOOD[d.classId]
                    const c = colorFor(id)
                    const dim = hover && hover !== id
                    return (
                      <motion.div
                        key={`${d.classId}-${i}-${d.box[0]}`}
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: dim ? 0.2 : 1, scale: 1 }}
                        transition={{ delay: Math.min(i * 0.05, 0.6) }}
                        className="pointer-events-none absolute rounded-md border-[3px]"
                        style={{
                          left: `${(d.box[0] / img.w) * 100}%`,
                          top: `${(d.box[1] / img.h) * 100}%`,
                          width: `${((d.box[2] - d.box[0]) / img.w) * 100}%`,
                          height: `${((d.box[3] - d.box[1]) / img.h) * 100}%`,
                          borderColor: c,
                          background: hover === id ? `${c}33` : undefined,
                        }}
                      >
                        <span className="label-mono absolute left-0 top-0 -translate-y-full whitespace-nowrap rounded-t-md px-1.5 py-0.5 !text-[0.58rem] text-white" style={{ background: c }}>
                          {d.label} {d.score.toFixed(2)}
                        </span>
                      </motion.div>
                    )
                  })}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 px-1">
                <p className="flex items-center gap-2 text-sm font-semibold" aria-live="polite">
                  {busy && <Loader2 size={16} className="animate-spin" />}
                  {phase === 'loading' && 'Loading YOLOv8 vision model (one-time, ~12 MB)…'}
                  {phase === 'detecting' && 'Detecting ingredients…'}
                  {phase === 'done' && (
                    <>
                      <Cpu size={16} className="text-leaf" />
                      YOLOv8n found {visibleDets.length} item{visibleDets.length === 1 ? '' : 's'} in {ms} ms
                    </>
                  )}
                  {phase === 'error' && <span className="text-tomato-dark">{error}</span>}
                </p>
                <button onClick={clearPhoto} className="btn !px-4 !py-2 bg-white text-sm"><RotateCcw size={15} /> New photo</button>
              </div>

              {phase === 'done' && (
                <div className="mt-4 rounded-2xl border-2 border-ink bg-paper p-4">
                  <label className="flex items-center justify-between gap-4 text-sm font-bold" htmlFor="conf">
                    Detection confidence
                    <span className="label-mono rounded-full bg-ink px-2 py-0.5 text-paper">≥ {Math.round(conf * 100)}%</span>
                  </label>
                  <input id="conf" type="range" min={15} max={90} value={Math.round(conf * 100)} onChange={(e) => setConf(Number(e.target.value) / 100)} className="mt-2 w-full accent-tomato" />
                  <p className="mt-1 text-xs text-ink-soft">Lower it to catch more items (more false positives); raise it to keep only the sure things.</p>
                  {others.length > 0 && (
                    <p className="mt-3 text-xs text-ink-soft">
                      Also in frame (not food, ignored): {others.map(([k, v]) => `${k}${v > 1 ? ` ×${v}` : ''}`).join(', ')}
                    </p>
                  )}
                </div>
              )}

              <div className="mt-4 px-1 pb-1">
                <p className="label-mono text-ink-soft">Try another sample</p>
                <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                  {SAMPLES.map((s) => (
                    <button key={s.src} onClick={() => useSample(s.src, s.label)} className="h-14 w-20 shrink-0 overflow-hidden rounded-xl border-2 border-ink" aria-label={`Use sample: ${s.label}`}>
                      <img src={s.src} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                  <button onClick={() => fileRef.current?.click()} className="grid h-14 w-20 shrink-0 place-items-center rounded-xl border-2 border-dashed border-ink bg-white" aria-label="Upload another photo"><ImagePlus size={20} /></button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ---------------- ingredients + prefs ---------------- */}
        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-2xl font-black">Your ingredients</h3>
              <span className="label-mono rounded-full bg-butter px-2.5 py-1">{items.length}</span>
            </div>

            <div className="mt-4 flex min-h-[4.5rem] flex-wrap gap-2">
              <AnimatePresence initial={false}>
                {items.map((it) => (
                  <motion.span
                    layout
                    key={it.id}
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    onMouseEnter={() => setHover(it.id)}
                    onMouseLeave={() => setHover(null)}
                    className="chip pr-1.5"
                    style={{ borderColor: it.source === 'photo' ? colorFor(it.id) : '#1d1b16', background: it.source === 'photo' ? `${colorFor(it.id)}1a` : 'white' }}
                  >
                    <span aria-hidden>{it.ing.emoji}</span>
                    {it.ing.name}
                    {it.source === 'photo' && (
                      <span className="label-mono rounded-full bg-ink px-1.5 py-0.5 !text-[0.58rem] text-paper" title="Detected in photo">
                        ×{it.count} · {Math.round((it.conf ?? 0) * 100)}%
                      </span>
                    )}
                    {it.source === 'manual' && <span className="label-mono rounded-full border border-ink/40 px-1.5 py-0.5 !text-[0.58rem]">added</span>}
                    <button onClick={() => removeItem(it)} className="grid h-5 w-5 place-items-center rounded-full hover:bg-ink hover:text-paper" aria-label={`Remove ${it.ing.name}`}>
                      <X size={13} />
                    </button>
                  </motion.span>
                ))}
              </AnimatePresence>
              {items.length === 0 && (
                <p className="self-center text-sm text-ink-soft">
                  {phase === 'done' ? 'Nothing detected — lower the confidence or add items below.' : 'Upload a photo and detected ingredients will appear here. You can also add them by hand.'}
                </p>
              )}
            </div>

            <form
              className="mt-4 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                addIngredient(resolveIngredient(text))
              }}
            >
              <input
                list="ing-list"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Add anything: eggs, rice, tofu…"
                className="min-w-0 flex-1 rounded-full border-2 border-ink bg-white px-4 py-2.5 text-sm font-semibold placeholder:font-normal"
                aria-label="Add an ingredient"
              />
              <datalist id="ing-list">{INGREDIENTS.map((i) => <option key={i.id} value={i.name} />)}</datalist>
              <button type="submit" className="btn !px-4 bg-ink text-paper" aria-label="Add ingredient"><Plus size={18} /></button>
            </form>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {quick.slice(0, 12).map((i) => (
                <button key={i.id} onClick={() => addIngredient(i)} className="rounded-full border-2 border-ink/30 bg-white px-2.5 py-1 text-xs font-bold hover:border-ink hover:bg-butter">
                  {i.emoji} {i.name}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-ink-soft">
              The bundled COCO model recognises 10 food types. Tap to add things it can’t see — eggs, dairy, grains, sauces.
            </p>
          </div>

          <div className="card space-y-5 p-6">
            <h3 className="font-display text-2xl font-black">Cooking preferences</h3>

            <fieldset>
              <legend className="label-mono mb-2 text-ink-soft">Diet</legend>
              <div className="grid grid-cols-3 gap-2">
                {(['any', 'vegetarian', 'vegan'] as Diet[]).map((d) => (
                  <button key={d} onClick={() => setPrefs((p) => ({ ...p, diet: d }))} aria-pressed={prefs.diet === d} className={`rounded-xl border-2 border-ink px-2 py-2 text-sm font-bold capitalize ${prefs.diet === d ? 'bg-leaf text-white shadow-pop-sm' : 'bg-white'}`}>
                    {d === 'any' ? 'Anything' : d}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="label-mono mb-2 text-ink-soft">Time available</legend>
              <div className="grid grid-cols-3 gap-2">
                {([15, 30, 60] as const).map((t) => (
                  <button key={t} onClick={() => setPrefs((p) => ({ ...p, time: t }))} aria-pressed={prefs.time === t} className={`rounded-xl border-2 border-ink px-2 py-2 text-sm font-bold ${prefs.time === t ? 'bg-leaf text-white shadow-pop-sm' : 'bg-white'}`}>
                    {t === 60 ? '1 hour' : `${t} min`}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="label-mono mb-2 text-ink-soft">Mood</legend>
              <div className="grid grid-cols-2 gap-2">
                {MOODS.map((m) => (
                  <button key={m.id} onClick={() => setPrefs((p) => ({ ...p, mood: m.id }))} aria-pressed={prefs.mood === m.id} className={`rounded-xl border-2 border-ink px-2 py-2 text-sm font-bold ${prefs.mood === m.id ? 'bg-leaf text-white shadow-pop-sm' : 'bg-white'}`}>
                    {m.emoji} {m.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="flex items-center justify-between">
              <span className="label-mono text-ink-soft">Servings</span>
              <div className="flex items-center gap-3">
                <button onClick={() => setPrefs((p) => ({ ...p, servings: Math.max(1, p.servings - 1) }))} className="grid h-9 w-9 place-items-center rounded-full border-2 border-ink bg-white" aria-label="Fewer servings"><Minus size={16} /></button>
                <span className="font-display w-6 text-center text-2xl font-black" aria-live="polite">{prefs.servings}</span>
                <button onClick={() => setPrefs((p) => ({ ...p, servings: Math.min(8, p.servings + 1) }))} className="grid h-9 w-9 place-items-center rounded-full border-2 border-ink bg-white" aria-label="More servings"><Plus size={16} /></button>
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-3">
              <input type="checkbox" checked={prefs.staples} onChange={(e) => setPrefs((p) => ({ ...p, staples: e.target.checked }))} className="mt-1 h-5 w-5 accent-leaf" />
              <span className="text-sm leading-snug">
                <span className="font-bold">I have basic pantry staples</span>
                <span className="block text-ink-soft">Oil, salt, pepper, soy sauce, vinegar, sugar &amp; dried spices.</span>
              </span>
            </label>

            <button onClick={() => generate(false)} disabled={!items.length || rPhase === 'working' || busy} className="btn w-full bg-tomato py-4 text-lg text-paper">
              {rPhase === 'working' ? <Loader2 className="animate-spin" size={20} /> : <ChefHat size={21} />}
              {rPhase === 'working' ? 'Cooking up an idea…' : items.length ? `Make a recipe from ${items.length} ingredient${items.length === 1 ? '' : 's'}` : 'Add ingredients to start'}
            </button>
            <button onClick={() => setLlmOpen(true)} className="flex w-full items-center justify-center gap-2 text-sm font-bold text-ink-soft underline-offset-4 hover:text-ink hover:underline">
              <KeyRound size={15} /> {llmOn ? 'Using your LLM key — edit AI settings' : 'AI settings: connect your own LLM key (optional)'}
            </button>
          </div>
        </div>
      </div>
      <LlmSettings open={llmOpen} onClose={() => setLlmOpen(false)} onChange={setLlmOn} />

      {/* ---------------- recipe ---------------- */}
      <div ref={recipeRef} className="mt-12 scroll-mt-24">
        {rPhase === 'working' && (
          <div className="card grid min-h-[20rem] place-items-center p-10 text-center" role="status">
            <div>
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2.4, ease: 'linear' }} className="mx-auto grid h-20 w-20 place-items-center rounded-full border-2 border-dashed border-ink text-4xl">
                🍳
              </motion.div>
              <h3 className="font-display mt-6 text-3xl font-black">The chef is thinking</h3>
              <AnimatePresence mode="wait">
                <motion.p key={thinkIdx} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="mt-2 text-ink-soft">
                  {THINKING[thinkIdx]}
                </motion.p>
              </AnimatePresence>
              <div className="mx-auto mt-6 flex max-w-md flex-wrap justify-center gap-1.5">
                {items.map((i) => (
                  <span key={i.id} className="chip !text-xs">{i.ing.emoji} {i.ing.name}</span>
                ))}
              </div>
            </div>
          </div>
        )}
        {rPhase === 'done' && recipe && (
          <RecipeCard key={recipe.id} recipe={recipe} saved={savedIds.includes(recipe.id)} onToggleSave={() => onToggleSave(recipe)} onRegenerate={() => generate(true)} />
        )}
      </div>
    </section>
  )
}
