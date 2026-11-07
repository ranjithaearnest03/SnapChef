import { motion } from 'framer-motion'
import {
  ArrowDownCircle,
  Camera,
  CheckCircle2,
  Cpu,
  ImagePlus,
  Info,
  KeyRound,
  Loader2,
  RotateCcw,
  Sparkles,
  Upload,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { colorFor, type Ingredient } from '../lib/ingredients'
import { loadLlmConfig } from '../lib/recipe'
import { detectIngredients } from '../lib/vision'
import type { DetectedIngredientSummary, Detection } from '../lib/yolo'
import LlmSettings from './LlmSettings'
import PhotoInstructions from './PhotoInstructions'

const SAMPLES = [
  { src: '/samples/market-table.jpg', label: 'Fruit stand' },
  { src: '/samples/veg.jpg', label: 'Veg & fruit' },
  { src: '/samples/haul.jpg', label: 'Grocery haul' },
  { src: '/samples/fruit.jpg', label: 'Fruit bowl' },
]

type Phase = 'idle' | 'loading' | 'detecting' | 'done' | 'error'

interface Props {
  onAddPhotoDetections: (items: DetectedIngredientSummary[]) => void
  onAddSuggestedProduce: (ing: Ingredient) => void
}

export default function Studio({ onAddPhotoDetections }: Props) {
  const [img, setImg] = useState<{ url: string; w: number; h: number; name: string } | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState('')
  const [dets, setDets] = useState<Detection[]>([])
  const [detectedSummary, setDetectedSummary] = useState<DetectedIngredientSummary[]>([])
  const [ms, setMs] = useState<number | null>(null)
  const [conf, setConf] = useState(0.20)
  const [hover, setHover] = useState<string | null>(null)
  const [drag, setDrag] = useState(false)
  const [pantryNotice, setPantryNotice] = useState(false)
  const [engineName, setEngineName] = useState('')
  const [isAiEngine, setIsAiEngine] = useState(false)
  const [llmOpen, setLlmOpen] = useState(false)
  const [hasAiKey, setHasAiKey] = useState(() => !!loadLlmConfig())

  const runId = useRef(0)
  const fileRef = useRef<HTMLInputElement>(null)
  const camRef = useRef<HTMLInputElement>(null)
  const urlRef = useRef<string | null>(null)

  const resetResults = () => {
    setDets([])
    setDetectedSummary([])
    setMs(null)
    setPantryNotice(false)
  }

  const runDetection = useCallback(
    async (url: string, name: string) => {
      const id = ++runId.current
      resetResults()
      setError('')
      try {
        const el = new Image()
        el.crossOrigin = 'anonymous'
        await new Promise((res, rej) => {
          el.onload = () => res(el)
          el.onerror = () => rej(new Error('Could not read image file.'))
          el.src = url
        })

        if (id !== runId.current) return
        setImg({ url, w: el.naturalWidth, h: el.naturalHeight, name })
        setPhase('detecting')

        // High-performance multimodal AI vision + local fallback
        const res = await detectIngredients(el, conf)
        if (id !== runId.current) return

        setDets(res.detections)
        setDetectedSummary(res.detectedIngredients)
        setEngineName(res.engineName)
        setIsAiEngine(res.engine !== 'local')
        setMs(res.inferenceMs)
        setPhase('done')

        // Automatically sync detected ingredients to pantry
        if (res.detectedIngredients.length > 0) {
          onAddPhotoDetections(res.detectedIngredients)
          setPantryNotice(true)
        }
      } catch (e) {
        if (id !== runId.current) return
        setError(e instanceof Error ? e.message : 'Something went wrong while analysing the photo.')
        setPhase('error')
      }
    },
    [conf, onAddPhotoDetections],
  )

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

  const handleSamplePick = (src: string, label: string) => {
    if (urlRef.current?.startsWith('blob:')) URL.revokeObjectURL(urlRef.current)
    urlRef.current = src
    void runDetection(src, label)
  }

  // Paste image from clipboard
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

  const busy = phase === 'loading' || phase === 'detecting'
  const visibleDets = dets.filter((d) => d.score >= conf)

  const scrollToPantry = () => {
    const el = document.getElementById('pantry')
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <section id="studio" className="mx-auto max-w-7xl scroll-mt-16 px-4 py-20 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="label-mono text-tomato">Powerhouse Vision Scanner</p>
        <button
          onClick={() => setLlmOpen(true)}
          className={`btn !px-3.5 !py-1 text-xs font-bold ${hasAiKey ? 'bg-mint text-leaf-dark' : 'bg-butter'}`}
        >
          <Sparkles size={14} />
          {hasAiKey ? 'AI Vision Active' : 'Enable 99%+ AI Vision (Free Key)'}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h2 className="font-display max-w-2xl text-4xl font-black leading-[1.02] tracking-tight sm:text-6xl">
            The SnapChef <span className="italic text-tomato">Vision Studio</span>
          </h2>
          <p className="mt-2 text-sm text-ink-soft max-w-xl">
            High-efficiency culinary detection. Uses multimodal AI vision and on-device neural acceleration.
          </p>
        </div>

        <ol className="flex items-center gap-2 text-sm font-bold" aria-label="Progress">
          {[
            { n: 1, label: 'Snap & Detect' },
            { n: 2, label: 'Stock Pantry' },
            { n: 3, label: 'Cook Recipe' },
          ].map((s, i) => (
            <li key={s.n} className="flex items-center gap-2">
              <span
                className={`grid h-8 w-8 place-items-center rounded-full border-2 border-ink transition-colors ${
                  i === 0 && img ? 'bg-leaf text-white' : i === 0 ? 'bg-butter' : 'bg-white'
                }`}
              >
                {s.n}
              </span>
              <span className={`hidden sm:inline ${i === 0 ? 'text-ink font-bold' : 'text-ink-soft'}`}>
                {s.label}
              </span>
              {i < 2 && <span className="h-0.5 w-4 bg-ink/30" />}
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-8">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => handleFile(e.target.files?.[0])}
          aria-label="Upload a photo"
        />
        <input
          ref={camRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(e) => handleFile(e.target.files?.[0])}
          aria-label="Take a photo with camera"
        />

        {!img ? (
          <div>
            <PhotoInstructions />

            {/* Uploading Block */}
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
              className={`card flex min-h-[30rem] flex-col items-center justify-center border-dashed p-8 text-center transition-colors ${
                drag ? 'bg-butter' : 'bg-card'
              }`}
            >
              <motion.div
                animate={{ rotate: [-4, 4, -4] }}
                transition={{ repeat: Infinity, duration: 4 }}
                className="grid h-20 w-20 place-items-center rounded-3xl border-2 border-ink bg-tomato text-paper shadow-pop"
              >
                <Camera size={38} />
              </motion.div>
              <h3 className="font-display mt-5 text-3xl font-black">Upload a Photo of Your Food</h3>
              <p className="mt-1.5 max-w-md text-sm text-ink-soft">
                Drag &amp; drop, paste from clipboard, or pick a file. Works with fridge shelves, pantry, or countertop.
              </p>

              {/* Instructions inside the uploading block */}
              <div className="my-6 w-full max-w-lg rounded-2xl border-2 border-ink bg-white p-5 text-left shadow-pop-sm">
                <p className="label-mono font-bold text-tomato flex items-center gap-2">
                  <Info size={16} /> Guidelines for Best Accuracy:
                </p>
                <ul className="mt-3 space-y-2 text-sm font-bold text-ink">
                  <li className="flex items-start gap-2.5">
                    <span className="text-tomato font-black text-base leading-tight">•</span>
                    <span>Make sure each picture has not more than 10 items.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-tomato font-black text-base leading-tight">•</span>
                    <span>Make sure the food items are clearly visible.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-tomato font-black text-base leading-tight">•</span>
                    <span>The food items shall not be packed in covers.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-tomato font-black text-base leading-tight">•</span>
                    <span>Upload each compartment separately for better results.</span>
                  </li>
                </ul>
              </div>

              <div className="flex flex-wrap justify-center gap-3">
                <button className="btn bg-tomato text-paper font-bold" onClick={() => fileRef.current?.click()}>
                  <Upload size={18} /> Upload Photo
                </button>
                <button className="btn bg-white font-bold" onClick={() => camRef.current?.click()}>
                  <Camera size={18} /> Take Photo
                </button>
              </div>

              {phase === 'error' && (
                <p className="mt-4 rounded-xl bg-blush px-4 py-2 text-sm font-semibold text-tomato-dark" role="alert">
                  {error}
                </p>
              )}

              <div className="mt-8 w-full border-t-2 border-dashed border-ink/20 pt-6">
                <p className="label-mono text-ink-soft">No photo handy? Try a sample</p>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {SAMPLES.map((s) => (
                    <button
                      key={s.src}
                      onClick={() => handleSamplePick(s.src, s.label)}
                      className="group overflow-hidden rounded-2xl border-2 border-ink bg-white shadow-pop-sm transition-transform hover:-translate-y-1"
                      aria-label={`Use sample: ${s.label}`}
                    >
                      <img
                        src={s.src}
                        alt=""
                        loading="lazy"
                        className="aspect-[4/3] w-full object-cover transition-transform group-hover:scale-105"
                      />
                      <span className="block px-2 py-1.5 text-xs font-bold">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            {/* Left: Photo with bounding boxes */}
            <div className="card overflow-hidden p-3">
              <div className="relative overflow-hidden rounded-2xl bg-paper-2">
                <img
                  src={img.url}
                  alt={`Uploaded photo: ${img.name}`}
                  className="block max-h-[70vh] w-full object-contain"
                  style={{ aspectRatio: `${img.w} / ${img.h}` }}
                />
                {busy && (
                  <>
                    <div className="scanline" />
                    <div className="absolute inset-0 bg-ink/10" />
                  </>
                )}

                {/* Bounding boxes */}
                {phase === 'done' &&
                  visibleDets.map((d, i) => {
                    const c = colorFor(d.ingredientId)
                    const dim = hover && hover !== d.ingredientId
                    return (
                      <motion.div
                        key={`${d.classId}-${i}-${d.box[0]}`}
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: dim ? 0.2 : 1, scale: 1 }}
                        transition={{ delay: Math.min(i * 0.04, 0.4) }}
                        className="pointer-events-none absolute rounded-md border-[3px]"
                        style={{
                          left: `${(d.box[0] / img.w) * 100}%`,
                          top: `${(d.box[1] / img.h) * 100}%`,
                          width: `${((d.box[2] - d.box[0]) / img.w) * 100}%`,
                          height: `${((d.box[3] - d.box[1]) / img.h) * 100}%`,
                          borderColor: c,
                          backgroundColor: hover === d.ingredientId ? `${c}33` : undefined,
                        }}
                      >
                        <span
                          className="label-mono absolute left-0 top-0 -translate-y-full whitespace-nowrap rounded-t-md px-1.5 py-0.5 !text-[0.65rem] font-black text-white shadow-sm"
                          style={{ backgroundColor: c }}
                        >
                          {d.label} {Math.round(d.score * 100)}%
                        </span>
                      </motion.div>
                    )
                  })}
              </div>

              {/* Status bar */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 px-1">
                <p className="flex items-center gap-2 text-sm font-semibold" aria-live="polite">
                  {busy && <Loader2 size={16} className="animate-spin text-tomato" />}
                  {phase === 'detecting' && 'Running culinary detection...'}
                  {phase === 'done' && (
                    <>
                      {isAiEngine ? (
                        <span className="flex items-center gap-1.5 text-leaf font-bold">
                          <Sparkles size={16} /> {engineName}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-ink font-semibold">
                          <Cpu size={16} className="text-leaf" /> {engineName}
                        </span>
                      )}
                      <span>• {visibleDets.length} item{visibleDets.length === 1 ? '' : 's'} in {ms} ms</span>
                    </>
                  )}
                  {phase === 'error' && <span className="text-tomato-dark font-bold">{error}</span>}
                </p>
                <button onClick={clearPhoto} className="btn !px-4 !py-2 bg-white text-sm font-bold">
                  <RotateCcw size={15} /> New Photo
                </button>
              </div>

              {/* Confidence filter slider */}
              {phase === 'done' && (
                <div className="mt-4 rounded-2xl border-2 border-ink bg-paper p-4">
                  <label className="flex items-center justify-between gap-4 text-sm font-bold" htmlFor="conf">
                    Detection Sensitivity
                    <span className="label-mono rounded-full bg-ink px-2.5 py-0.5 text-paper">
                      {Math.round(conf * 100)}%
                    </span>
                  </label>
                  <input
                    id="conf"
                    type="range"
                    min={12}
                    max={85}
                    value={Math.round(conf * 100)}
                    onChange={(e) => setConf(Number(e.target.value) / 100)}
                    className="mt-2 w-full accent-tomato"
                  />
                  <p className="mt-1 text-xs text-ink-soft">
                    Adjust slider to show or hide lower-certainty detections.
                  </p>
                </div>
              )}

              {/* Sample thumb strip */}
              <div className="mt-4 px-1 pb-1">
                <p className="label-mono text-ink-soft">Try another sample photo</p>
                <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                  {SAMPLES.map((s) => (
                    <button
                      key={s.src}
                      onClick={() => handleSamplePick(s.src, s.label)}
                      className="h-14 w-20 shrink-0 overflow-hidden rounded-xl border-2 border-ink hover:scale-105 transition-transform"
                      aria-label={`Use sample: ${s.label}`}
                    >
                      <img src={s.src} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="grid h-14 w-20 shrink-0 place-items-center rounded-xl border-2 border-dashed border-ink bg-white hover:bg-butter"
                    aria-label="Upload another photo"
                  >
                    <ImagePlus size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Detected items summary & auto-sync to pantry */}
            <div className="space-y-5">
              {/* Upgrade to AI Vision banner if currently using local fallback */}
              {!isAiEngine && phase === 'done' && (
                <div className="card p-4 bg-butter border-2 border-ink shadow-pop-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-bold leading-tight">
                      <span className="flex items-center gap-1 text-tomato font-black mb-0.5">
                        <Sparkles size={14} /> Want 99%+ Detection on All Groceries?
                      </span>
                      Connect a free Gemini API key to recognize any brand, cut produce &amp; dairy.
                    </div>
                    <button
                      onClick={() => setLlmOpen(true)}
                      className="btn !px-3 !py-1 bg-white text-xs font-black shrink-0"
                    >
                      <KeyRound size={13} /> Add Free Key
                    </button>
                  </div>
                </div>
              )}

              {/* Auto-Sync Notification */}
              {pantryNotice && (
                <div className="card p-5 bg-mint border-2 border-leaf shadow-pop">
                  <div className="flex items-start gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border-2 border-ink bg-white text-leaf">
                      <CheckCircle2 size={20} />
                    </span>
                    <div className="flex-1">
                      <h4 className="font-display text-lg font-black text-leaf-dark">
                        Items Saved to Your Pantry!
                      </h4>
                      <p className="text-xs text-ink-soft mt-0.5">
                        All {detectedSummary.length} detected items have been automatically recorded in your Pantry inventory below.
                      </p>
                      <button
                        onClick={scrollToPantry}
                        className="btn mt-3 !px-4 !py-1.5 bg-leaf text-white text-xs font-bold shadow-pop-sm"
                      >
                        <ArrowDownCircle size={15} /> Jump to Pantry &amp; Choose Recipe
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Detected items list */}
              <div className="card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-display text-2xl font-black">Detected Food Items</h3>
                    <p className="text-xs text-ink-soft">Hover over an item to locate it in the photo</p>
                  </div>
                  <span className="label-mono rounded-full bg-butter px-2.5 py-1 font-bold">
                    {detectedSummary.length}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 min-h-[4rem]">
                  {detectedSummary.length === 0 ? (
                    <p className="text-sm text-ink-soft italic py-2">
                      {busy ? 'Analyzing photo...' : 'No food items detected. Try another photo or adjust sensitivity.'}
                    </p>
                  ) : (
                    detectedSummary.map((it) => (
                      <span
                        key={it.id}
                        onMouseEnter={() => setHover(it.id)}
                        onMouseLeave={() => setHover(null)}
                        className="chip cursor-pointer bg-white font-bold transition-all hover:bg-butter hover:scale-105"
                      >
                        <span>{it.emoji}</span>
                        <span>{it.name}</span>
                        {it.count > 1 && (
                          <span className="rounded-full bg-ink px-1.5 py-0.2 text-[0.65rem] text-paper">
                            x{it.count}
                          </span>
                        )}
                        <span className="text-[0.65rem] opacity-60">
                          {Math.round(it.conf * 100)}%
                        </span>
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <LlmSettings
        open={llmOpen}
        onClose={() => setLlmOpen(false)}
        onChange={(connected) => setHasAiKey(connected)}
      />
    </section>
  )
}