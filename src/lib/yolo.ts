// In-browser YOLOv8n inference (ONNX Runtime Web / WebAssembly)
// With color-aware food classification and cross-device optimization.
// The photo never leaves the user's device.

import ortWasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url'
import ortMjsUrl from 'onnxruntime-web/ort-wasm-simd-threaded.mjs?url'
import { byId, COCO_FOOD } from './ingredients'

export const COCO_CLASSES = [
  'person','bicycle','car','motorcycle','airplane','bus','train','truck','boat','traffic light',
  'fire hydrant','stop sign','parking meter','bench','bird','cat','dog','horse','sheep','cow',
  'elephant','bear','zebra','giraffe','backpack','umbrella','handbag','tie','suitcase','frisbee',
  'skis','snowboard','sports ball','kite','baseball bat','baseball glove','skateboard','surfboard','tennis racket','bottle',
  'wine glass','cup','fork','knife','spoon','bowl','banana','apple','sandwich','orange',
  'broccoli','carrot','hot dog','pizza','donut','cake','chair','couch','potted plant','bed',
  'dining table','toilet','tv','laptop','mouse','remote','keyboard','cell phone','microwave','oven',
  'toaster','sink','refrigerator','book','clock','vase','scissors','teddy bear','hair drier','toothbrush',
]

export interface Detection {
  classId: number
  label: string
  ingredientId: string
  score: number
  /** x1,y1,x2,y2 in original image pixels */
  box: [number, number, number, number]
  confidenceNote?: string
}

export interface DetectedIngredientSummary {
  id: string
  name: string
  emoji: string
  count: number
  conf: number
  source: 'photo'
}

export interface SuggestedProduce {
  id: string
  name: string
  emoji: string
  reason: string
}

export interface DetectResult {
  detections: Detection[]
  detectedIngredients: DetectedIngredientSummary[]
  suggestedProduce: SuggestedProduce[]
  inferenceMs: number
  width: number
  height: number
}

type OrtModule = typeof import('onnxruntime-web/wasm')
interface Loaded {
  ort: OrtModule
  session: import('onnxruntime-web/wasm').InferenceSession
}

let loading: Promise<Loaded> | null = null
let ready = false
export const isModelReady = () => ready

export function loadModel(): Promise<Loaded> {
  if (!loading) {
    loading = (async () => {
      const ort = await import('onnxruntime-web/wasm')
      
      // Point ONNX Runtime to the Vite-bundled wasm/mjs files
      ort.env.wasm.wasmPaths = {
        wasm: ortWasmUrl,
        mjs: ortMjsUrl,
      }
      
      // Safe execution configuration across mobile, Safari, and desktops
      ort.env.wasm.numThreads = 1
      
      // Resolve model URL safely for local dev and GitHub Pages subpaths
      const baseUrl = import.meta.env.BASE_URL ?? '/'
      const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
      const modelPath = `${cleanBase}models/yolov8n.onnx`
      
      let session: import('onnxruntime-web/wasm').InferenceSession
      try {
        session = await ort.InferenceSession.create(modelPath, {
          executionProviders: ['wasm'],
          graphOptimizationLevel: 'all',
        })
      } catch (err) {
        // Fallback for root path if subpath resolution differed
        void err
        session = await ort.InferenceSession.create('/models/yolov8n.onnx', {
          executionProviders: ['wasm'],
          graphOptimizationLevel: 'all',
        })
      }
      
      ready = true
      return { ort, session }
    })()
    loading.catch(() => {
      loading = null
    })
  }
  return loading
}

const SIZE = 640

function iou(a: number[], b: number[]) {
  const x1 = Math.max(a[0], b[0])
  const y1 = Math.max(a[1], b[1])
  const x2 = Math.min(a[2], b[2])
  const y2 = Math.min(a[3], b[3])
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1)
  const ua = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter
  return ua <= 0 ? 0 : inter / ua
}

interface HslColor {
  r: number
  g: number
  b: number
  h: number // 0-360
  s: number // 0-1
  l: number // 0-1
}

function analyzeBoxColor(
  px: Uint8ClampedArray,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  canvasW: number,
  canvasH: number,
): HslColor {
  const clampX1 = Math.max(0, Math.min(canvasW - 1, Math.floor(x1)))
  const clampY1 = Math.max(0, Math.min(canvasH - 1, Math.floor(y1)))
  const clampX2 = Math.max(0, Math.min(canvasW - 1, Math.ceil(x2)))
  const clampY2 = Math.max(0, Math.min(canvasH - 1, Math.ceil(y2)))

  const w = clampX2 - clampX1
  const h = clampY2 - clampY1
  if (w <= 2 || h <= 2) return { r: 128, g: 128, b: 128, h: 0, s: 0, l: 0.5 }

  // Sample inner 70% to avoid background surrounding the item
  const insetX = Math.floor(w * 0.15)
  const insetY = Math.floor(h * 0.15)
  const sx = clampX1 + insetX
  const ex = clampX2 - insetX
  const sy = clampY1 + insetY
  const ey = clampY2 - insetY

  const stepX = Math.max(1, Math.floor((ex - sx) / 12))
  const stepY = Math.max(1, Math.floor((ey - sy) / 12))

  let totR = 0
  let totG = 0
  let totB = 0
  let count = 0

  for (let y = sy; y <= ey; y += stepY) {
    for (let x = sx; x <= ex; x += stepX) {
      const idx = (y * canvasW + x) * 4
      totR += px[idx]
      totG += px[idx + 1]
      totB += px[idx + 2]
      count++
    }
  }

  if (count === 0) return { r: 128, g: 128, b: 128, h: 0, s: 0, l: 0.5 }
  const r = totR / count
  const g = totG / count
  const b = totB / count

  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  let hue = 0
  let sat = 0
  const lit = (max + min) / 2

  if (max !== min) {
    const d = max - min
    sat = lit > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case rn:
        hue = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60
        break
      case gn:
        hue = ((bn - rn) / d + 2) * 60
        break
      case bn:
        hue = ((rn - gn) / d + 4) * 60
        break
    }
  }

  return { r, g, b, h: Math.round(hue), s: sat, l: lit }
}

/**
 * Intelligent color & shape refinement for detected boxes.
 * Solves COCO limitations (e.g. Tomato classified as Apple, Lemon as Orange, Bottle as Milk/Oil).
 */
function refineFoodDetection(
  classId: number,
  color: HslColor,
): { ingredientId: string; label: string; confidenceNote?: string } {
  // Apple (class 47): In COCO, tomatoes are consistently predicted as apples!
  if (classId === 47) {
    // Vibrant scarlet / red produce -> Tomato
    if ((color.h >= 340 || color.h <= 22) && color.s > 0.3 && color.l < 0.72) {
      return { ingredientId: 'tomato', label: 'Tomato', confidenceNote: 'Red produce (Tomato)' }
    }
    // Green produce -> Green Apple or Bell Pepper / Cucumber
    if (color.h >= 75 && color.h <= 145 && color.s > 0.25) {
      return { ingredientId: 'apple', label: 'Green Apple', confidenceNote: 'Green produce' }
    }
    // Bright yellow produce -> Lemon
    if (color.h >= 40 && color.h <= 68 && color.s > 0.35) {
      return { ingredientId: 'lemon', label: 'Lemon', confidenceNote: 'Citrus' }
    }
    return { ingredientId: 'apple', label: 'Apple' }
  }

  // Orange (class 49):
  if (classId === 49) {
    // Yellow citrus -> Lemon
    if (color.h >= 45 && color.h <= 68 && color.s > 0.35) {
      return { ingredientId: 'lemon', label: 'Lemon', confidenceNote: 'Yellow citrus' }
    }
    // Scarlet red -> Tomato or Red Pepper
    if ((color.h >= 340 || color.h <= 20) && color.s > 0.35) {
      return { ingredientId: 'tomato', label: 'Tomato', confidenceNote: 'Red produce' }
    }
    // Vibrant orange -> Orange
    return { ingredientId: 'orange', label: 'Orange' }
  }

  // Bottle (class 39):
  if (classId === 39) {
    // White/opaque container -> Milk
    if (color.l > 0.65 && color.s < 0.28) {
      return { ingredientId: 'milk', label: 'Milk', confidenceNote: 'Dairy container' }
    }
    // Golden / amber liquid -> Cooking oil
    if (color.h >= 30 && color.h <= 85 && color.s > 0.25) {
      return { ingredientId: 'butter', label: 'Cooking Oil', confidenceNote: 'Pantry oil' }
    }
    return { ingredientId: 'milk', label: 'Milk / Sauce', confidenceNote: 'Kitchen bottle' }
  }

  // Cup (class 41):
  if (classId === 41) {
    return { ingredientId: 'yogurt', label: 'Yogurt / Dairy', confidenceNote: 'Dairy cup' }
  }

  // Bowl (class 45):
  if (classId === 45) {
    if (color.h >= 75 && color.h <= 150 && color.s > 0.25) {
      return { ingredientId: 'spinach', label: 'Salad Greens', confidenceNote: 'Greens in bowl' }
    }
    if (color.l > 0.65 && color.s < 0.3) {
      return { ingredientId: 'rice', label: 'Rice / Grains', confidenceNote: 'Grains in bowl' }
    }
    return { ingredientId: 'pasta', label: 'Pasta / Grain', confidenceNote: 'Food bowl' }
  }

  // Standard COCO food mappings:
  const map: Record<number, { id: string; label: string }> = {
    46: { id: 'banana', label: 'Banana' },
    48: { id: 'sandwich', label: 'Sandwich' },
    50: { id: 'broccoli', label: 'Broccoli' },
    51: { id: 'carrot', label: 'Carrot' },
    52: { id: 'sausage', label: 'Sausage' },
    53: { id: 'pizza', label: 'Pizza' },
    54: { id: 'donut', label: 'Donut' },
    55: { id: 'cake', label: 'Cake' },
  }

  if (map[classId]) {
    return { ingredientId: map[classId].id, label: map[classId].label }
  }

  return { ingredientId: COCO_FOOD[classId] ?? 'custom:food', label: COCO_CLASSES[classId] ?? 'Food' }
}

/**
 * Fast visual scanner to detect food signatures (Greens, Potatoes, Eggs, Onions)
 * that COCO lacks boxes for, giving users instant one-tap suggestions.
 */
function scanSalientFoodSignatures(
  px: Uint8ClampedArray,
  totalPixels: number,
  existingIds: Set<string>,
): SuggestedProduce[] {
  let greenPixels = 0
  let earthyPixels = 0
  let creamyPixels = 0
  let redPixels = 0
  let sampleCount = 0

  const step = Math.max(1, Math.floor(totalPixels / 2000))

  for (let i = 0; i < totalPixels; i += step) {
    const idx = i * 4
    const r = px[idx]
    const g = px[idx + 1]
    const b = px[idx + 2]
    sampleCount++

    // Greens (Spinach, lettuce, cucumber)
    if (g > 70 && g > r * 1.15 && g > b * 1.15) {
      greenPixels++
    }
    // Earthy / Root veg (Potato, mushrooms, onion)
    else if (r > 90 && g > 65 && b > 35 && r > g && g > b && r < 185 && (r - b) > 30) {
      earthyPixels++
    }
    // Creamy white (Eggs, garlic, tofu, yogurt)
    else if (r > 200 && g > 190 && b > 180 && Math.abs(r - g) < 25 && Math.abs(g - b) < 25) {
      creamyPixels++
    }
    // Deep Red (Tomatoes, peppers)
    else if (r > 150 && r > g * 1.5 && r > b * 1.5) {
      redPixels++
    }
  }

  const suggestions: SuggestedProduce[] = []

  if (greenPixels / sampleCount > 0.08 && !existingIds.has('spinach') && !existingIds.has('broccoli')) {
    suggestions.push({
      id: 'spinach',
      name: 'Spinach / Greens',
      emoji: '🥬',
      reason: 'Vibrant green produce spotted in photo',
    })
  }

  if (earthyPixels / sampleCount > 0.07 && !existingIds.has('potato') && !existingIds.has('onion')) {
    suggestions.push({
      id: 'potato',
      name: 'Potatoes / Onions',
      emoji: '🥔',
      reason: 'Earthy root vegetable tones detected',
    })
  }

  if (creamyPixels / sampleCount > 0.12 && !existingIds.has('egg') && !existingIds.has('garlic')) {
    suggestions.push({
      id: 'egg',
      name: 'Eggs / Garlic',
      emoji: '🥚',
      reason: 'White/cream shapes visible in frame',
    })
  }

  if (redPixels / sampleCount > 0.06 && !existingIds.has('tomato') && !existingIds.has('pepper')) {
    suggestions.push({
      id: 'tomato',
      name: 'Tomatoes',
      emoji: '🍅',
      reason: 'Red produce cluster detected',
    })
  }

  return suggestions
}

export async function detect(img: HTMLImageElement, minConf = 0.18): Promise<DetectResult> {
  const { ort, session } = await loadModel()
  const W = img.naturalWidth
  const H = img.naturalHeight

  // Letterbox to 640x640 (keeps aspect ratio with neutral grey padding)
  const scale = Math.min(SIZE / W, SIZE / H)
  const nw = Math.round(W * scale)
  const nh = Math.round(H * scale)
  const dx = Math.floor((SIZE - nw) / 2)
  const dy = Math.floor((SIZE - nh) / 2)

  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.fillStyle = 'rgb(114,114,114)'
  ctx.fillRect(0, 0, SIZE, SIZE)
  ctx.drawImage(img, dx, dy, nw, nh)

  const imgData = ctx.getImageData(0, 0, SIZE, SIZE)
  const px = imgData.data

  const plane = SIZE * SIZE
  const input = new Float32Array(3 * plane)

  // Fast TypedArray loop using 32-bit uint view for RGBA
  const u32 = new Uint32Array(px.buffer)
  const inv255 = 1 / 255
  for (let i = 0; i < plane; i++) {
    const val = u32[i]
    input[i] = (val & 0xff) * inv255
    input[plane + i] = ((val >> 8) & 0xff) * inv255
    input[2 * plane + i] = ((val >> 16) & 0xff) * inv255
  }

  const t0 = performance.now()
  const feeds: Record<string, import('onnxruntime-web/wasm').Tensor> = {}
  feeds[session.inputNames[0]] = new ort.Tensor('float32', input, [1, 3, SIZE, SIZE])
  const out = await session.run(feeds)
  const t1 = performance.now()

  const tensor = out[session.outputNames[0]]
  const data = tensor.data as Float32Array
  const N = tensor.dims[2] as number // 8400 anchors
  const nc = (tensor.dims[1] as number) - 4 // 80 classes

  // Relevant classes: COCO food classes + kitchen containers
  const relevantClasses = new Set([39, 41, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55])

  const cands: Detection[] = []
  for (let i = 0; i < N; i++) {
    let best = -1
    let bestScore = 0
    for (let c = 0; c < nc; c++) {
      const s = data[(4 + c) * N + i]
      if (s > bestScore) {
        bestScore = s
        best = c
      }
    }

    if (bestScore < minConf) continue
    if (!relevantClasses.has(best) && bestScore < 0.45) continue

    const cx = data[i]
    const cy = data[N + i]
    const w = data[2 * N + i]
    const h = data[3 * N + i]

    const x1 = Math.max(0, (cx - w / 2 - dx) / scale)
    const y1 = Math.max(0, (cy - h / 2 - dy) / scale)
    const x2 = Math.min(W, (cx + w / 2 - dx) / scale)
    const y2 = Math.min(H, (cy + h / 2 - dy) / scale)

    if (x2 - x1 < 6 || y2 - y1 < 6) continue

    // Letterbox canvas coordinates for color sampling
    const cx1 = Math.round(x1 * scale + dx)
    const cy1 = Math.round(y1 * scale + dy)
    const cx2 = Math.round(x2 * scale + dx)
    const cy2 = Math.round(y2 * scale + dy)

    const color = analyzeBoxColor(px, cx1, cy1, cx2, cy2, SIZE, SIZE)
    const refined = refineFoodDetection(best, color)

    cands.push({
      classId: best,
      label: refined.label,
      ingredientId: refined.ingredientId,
      score: bestScore,
      box: [x1, y1, x2, y2],
      confidenceNote: refined.confidenceNote,
    })
  }

  // Class-aware non-max suppression
  cands.sort((a, b) => b.score - a.score)
  const kept: Detection[] = []
  for (const c of cands) {
    if (kept.every((k) => k.ingredientId !== c.ingredientId || iou(k.box, c.box) < 0.45)) {
      kept.push(c)
    }
  }

  // Aggregate into clean ingredient summaries
  const ingMap = new Map<string, DetectedIngredientSummary>()
  for (const d of kept) {
    const ing = byId(d.ingredientId)
    const id = ing ? ing.id : d.ingredientId
    const name = ing ? ing.name : d.label
    const emoji = ing ? ing.emoji : '🍽️'

    const existing = ingMap.get(id)
    if (existing) {
      existing.count++
      existing.conf = Math.max(existing.conf, d.score)
    } else {
      ingMap.set(id, {
        id,
        name,
        emoji,
        count: 1,
        conf: d.score,
        source: 'photo',
      })
    }
  }

  const detectedIngredients = [...ingMap.values()]
  const existingSet = new Set(detectedIngredients.map((d) => d.id))
  const suggestedProduce = scanSalientFoodSignatures(px, plane, existingSet)

  return {
    detections: kept,
    detectedIngredients,
    suggestedProduce,
    inferenceMs: Math.round(t1 - t0),
    width: W,
    height: H,
  }
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not read that image file. Please try another image.'))
    img.src = url
  })
}