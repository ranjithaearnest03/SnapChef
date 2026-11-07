import { motion } from 'framer-motion'
import {
  ArrowDownCircle,
  Camera,
  CheckCircle2,
  Cpu,
  ImagePlus,
  Loader2,
  RotateCcw,
  Sparkles,
  Upload,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { colorFor, type Ingredient } from '../lib/ingredients'
import {
  detect,
  isModelReady,
  loadImage,
  loadModel,
  type DetectedIngredientSummary,
  type Detection,
  type SuggestedProduce,
} from '../lib/yolo'
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

export default function Studio({ onAddPhotoDetections, onAddSuggestedProduce }: Props) {
  const [img, setImg] = useState<{ url: string; w: number; h: number; name: string } | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState('')
  const [dets, setDets] = useState<Detection[]>([])
  const [detectedSummary, setDetectedSummary] = useState<DetectedIngredientSummary[]>([])
  const [suggested, setSuggested] = useState<SuggestedProduce[]>([])
  const [ms, setMs] = useState<number | null>(null)
  const [conf, setConf] = useState(0.25)
  const [hover, setHover] = useState<string | null>(null)
  const [drag, setDrag] = useState(false)
  const [pantryNotice, setPantryNotice] = useState(false)

  const runId = useRef(0)
  const fileRef = useRef<HTMLInputElement>(null)
  const camRef = useRef<HTMLInputElement>(null)
  const urlRef = useRef<string | null>(null)

  // Warm up the ONNX model in background
  useEffect(() => {
    const t = window.setTimeout(() => {
      loadModel().catch(() => undefined)
    }, 1500)
    return () => window.clearTimeout(t)
  }, [])

  const resetResults = () => {
    setDets([])
    setDetectedSummary([])
    setSuggested([])
    setMs(null)
    setPantryNotice(false)
  }

  const runDetection = useCallback(
    async (url: string, name: string) => {
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

        // Direct fast inference without artificial timeout delays
        const res = await detect(el, conf)
        if (id !== runId.current) return

        setDets(res.detections)
        setDetectedSummary(res.detectedIngredients)
        setSuggested(res.suggestedProduce)
        setMs(res.inferenceMs)
        setPhase('done')

        // Automatically sync detected ingredients to the user's pantry
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
      <p className="label-mono text-tomato">Ingredient Vision Scanner</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h2 className="font-display max-w-2xl text-4xl font-black leading-[1.02] tracking-tight sm:text-6xl">
            The SnapChef <span className="italic text-tomato">Vision Studio</span>
          </h2>
          <p className="mt-2 text-sm text-ink-soft max-w-xl">
            High-efficiency client-side ingredient detection. Your photo stays 100% private on your device.
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
        {/* Hidden inputs */}
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
            {/* Instruction List Before Uploading Photo */}
            <PhotoInstructions />

            {/* Drop Zone */}
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
              className={`card flex min-h-[26rem] flex-col items-center justify-center border-dashed p-8 text-center transition-colors ${
                drag ? 'bg-butter' : 'bg-card'
              }`}
            >
              <motion.div
                animate={{ rotate: [-4, 4, -4] }}
                transition={{ repeat: Infinity, duration: 4 }}
                className="grid h-24 w-24 place-items-center rounded-3xl border-2 border-ink bg-tomato text-paper shadow-pop"
              >
                <Camera size={44} />
              </motion.div>
              <h3 className="font-display mt-6 text-3xl font-black">Drop a photo of your fridge</h3>
              <p className="mt-2 max-w-sm text-ink-soft">
                Drag &amp; drop, paste from clipboard, or pick a photo. Works seamlessly on mobile and desktop.
              </p>

              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button className="btn bg-tomato text-paper" onClick={() => fileRef.current?.click()}>
                  <Upload size={18} /> Upload Photo
                </button>
                <button className="btn bg-white" onClick={() => camRef.current?.click()}>
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
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
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
                          className="label-mono absolute left-0 top-0 -translate-y-full whitespace-nowrap rounded-t-md px-1.5 py-0.5 !text-[0.62rem] font-bold text-white shadow-sm"
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
                  {phase === 'loading' && 'Initializing YOLOv8n vision engine...'}
                  {phase === 'detecting' && 'Running color-aware ingredient detection...'}
                  {phase === 'done' && (
                    <>
                      <Cpu size={16} className="text-leaf" />
                      Detected {visibleDets.length} item{visibleDets.length === 1 ? '' : 's'} in {ms} ms
                    </>
                  )}
                  {phase === 'error' && <span className="text-tomato-dark font-bold">{error}</span>}
                </p>
                <button onClick={clearPhoto} className="btn !px-4 !py-2 bg-white text-sm">
                  <RotateCcw size={15} /> New Photo
                </button>
              </div>

              {/* Confidence slider */}
              {phase === 'done' && (
                <div className="mt-4 rounded-2xl border-2 border-ink bg-paper p-4">
                  <label className="flex items-center justify-between gap-4 text-sm font-bold" htmlFor="conf">
                    Detection Confidence Filter
                    <span className="label-mono rounded-full bg-ink px-2.5 py-0.5 text-paper">
                      {Math.round(conf * 100)}%
                    </span>
                  </label>
                  <input
                    id="conf"
                    type="range"
                    min={15}
                    max={85}
                    value={Math.round(conf * 100)}
                    onChange={(e) => setConf(Number(e.target.value) / 100)}
                    className="mt-2 w-full accent-tomato"
                  />
                  <p className="mt-1 text-xs text-ink-soft">
                    Adjust slider to filter sensitivity. Lower values catch subtle items; higher values keep only high-certainty detections.
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

            {/* Right: Detection summary & Auto-Pantry Sync */}
            <div className="space-y-5">
              {/* Auto Pantry Notification */}
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
                        All detected items have been automatically noted in your Pantry below. You can select what to cook with and adjust quantities.
                      </p>
                      <button
                        onClick={scrollToPantry}
                        className="btn mt-3 !px-4 !py-1.5 bg-leaf text-white text-xs font-bold shadow-pop-sm"
                      >
                        <ArrowDownCircle size={15} /> Go to Pantry &amp; Select Ingredients
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Detected items list */}
              <div className="card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-display text-2xl font-black">Detected in Photo</h3>
                    <p className="text-xs text-ink-soft">Hover over an item to highlight its location</p>
                  </div>
                  <span className="label-mono rounded-full bg-butter px-2.5 py-1 font-bold">
                    {detectedSummary.length}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 min-h-[4rem]">
                  {detectedSummary.length === 0 ? (
                    <p className="text-sm text-ink-soft italic py-2">
                      {busy ? 'Scanning photo...' : 'No food items detected with current confidence filter. Try lowering confidence.'}
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

              {/* Smart Produce Suggestions */}
              {suggested.length > 0 && (
                <div className="card p-5 bg-card border-2 border-ink">
                  <div className="flex items-center gap-2">
                    <Sparkles size={18} className="text-tomato" />
                    <div>
                      <h4 className="font-display text-base font-black">
                        Also Spotted in Frame (One-Tap Add)
                      </h4>
                      <p className="text-xs text-ink-soft">
                        Color &amp; texture signatures suggest these additional ingredients:
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {suggested.map((s) => (
                      <button
                        key={s.id}
                        onClick={() =>
                          onAddSuggestedProduce({
                            id: s.id,
                            name: s.name,
                            emoji: s.emoji,
                            cat: 'veg',
                            per: 1,
                            unit: 'portion',
                          })
                        }
                        className="chip bg-white hover:bg-mint text-xs font-bold transition-transform hover:scale-105"
                        title={s.reason}
                      >
                        <span>{s.emoji}</span>
                        <span>+ {s.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}