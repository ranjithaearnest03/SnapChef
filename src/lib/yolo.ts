// In-browser YOLOv8n inference (ONNX Runtime Web / WebAssembly)
// High efficiency, clean bounding boxes, no hallucinated color blobs.
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

// Recognized food classes in the COCO model
export const COCO_FOOD_SET = new Set([39, 41, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55])

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

export interface DetectResult {
  detections: Detection[]
  detectedIngredients: DetectedIngredientSummary[]
  suggestedProduce: []
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
      
      ort.env.wasm.wasmPaths = {
        wasm: ortWasmUrl,
        mjs: ortMjsUrl,
      }
      
      ort.env.wasm.numThreads = 1
      
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

export async function detect(img: HTMLImageElement, minConf = 0.22): Promise<DetectResult> {
  const { ort, session } = await loadModel()
  const W = img.naturalWidth
  const H = img.naturalHeight

  // Letterbox to 640x640 (keeps aspect ratio)
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
    if (!COCO_FOOD_SET.has(best)) continue

    const cx = data[i]
    const cy = data[N + i]
    const w = data[2 * N + i]
    const h = data[3 * N + i]

    const ox1 = Math.max(0, (cx - w / 2 - dx) / scale)
    const oy1 = Math.max(0, (cy - h / 2 - dy) / scale)
    const ox2 = Math.min(W, (cx + w / 2 - dx) / scale)
    const oy2 = Math.min(H, (cy + h / 2 - dy) / scale)

    if (ox2 - ox1 < 10 || oy2 - oy1 < 10) continue

    const ingId = COCO_FOOD[best] ?? 'misc'
    const ing = byId(ingId)

    cands.push({
      classId: best,
      label: ing?.name ?? COCO_CLASSES[best] ?? 'Food',
      ingredientId: ingId,
      score: bestScore,
      box: [ox1, oy1, ox2, oy2],
    })
  }

  // Non-max suppression
  cands.sort((a, b) => b.score - a.score)
  const kept: Detection[] = []
  for (const c of cands) {
    if (kept.every((k) => k.ingredientId !== c.ingredientId || iou(k.box, c.box) < 0.45)) {
      kept.push(c)
    }
  }

  // Aggregate detected items
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

  return {
    detections: kept.slice(0, 10),
    detectedIngredients: [...ingMap.values()],
    suggestedProduce: [],
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
    img.onerror = () => reject(new Error('Could not read image file. Please try another image.'))
    img.src = url
  })
}