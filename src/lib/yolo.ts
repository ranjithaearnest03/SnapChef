// In-browser YOLOv8n inference (ONNX Runtime Web / WebAssembly).
// The photo never leaves the user's device.

// ✅ FIX: Import the WASM and MJS files directly from node_modules with ?url
import ortWasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url'
import ortMjsUrl from 'onnxruntime-web/ort-wasm-simd-threaded.mjs?url'

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
  score: number
  /** x1,y1,x2,y2 in original image pixels */
  box: [number, number, number, number]
}

export interface DetectResult {
  detections: Detection[]
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
      
      // ✅ FIX: Tell ONNX Runtime where the Vite-bundled files are
      ort.env.wasm.wasmPaths = {
        wasm: ortWasmUrl,
        mjs: ortMjsUrl,
      }
      
      ort.env.wasm.numThreads = 1
      const session = await ort.InferenceSession.create('/models/yolov8n.onnx', {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
      })
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

export async function detect(img: HTMLImageElement, minConf = 0.15): Promise<DetectResult> {
  const { ort, session } = await loadModel()
  const W = img.naturalWidth
  const H = img.naturalHeight

  // Letterbox to 640x640 (keeps aspect ratio, grey padding) – same as Ultralytics preprocessing.
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
  const px = ctx.getImageData(0, 0, SIZE, SIZE).data

  const plane = SIZE * SIZE
  const input = new Float32Array(3 * plane)
  for (let i = 0; i < plane; i++) {
    input[i] = px[i * 4] / 255
    input[plane + i] = px[i * 4 + 1] / 255
    input[2 * plane + i] = px[i * 4 + 2] / 255
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
    const cx = data[i]
    const cy = data[N + i]
    const w = data[2 * N + i]
    const h = data[3 * N + i]
    const x1 = Math.max(0, (cx - w / 2 - dx) / scale)
    const y1 = Math.max(0, (cy - h / 2 - dy) / scale)
    const x2 = Math.min(W, (cx + w / 2 - dx) / scale)
    const y2 = Math.min(H, (cy + h / 2 - dy) / scale)
    if (x2 - x1 < 4 || y2 - y1 < 4) continue
    cands.push({ classId: best, label: COCO_CLASSES[best] ?? String(best), score: bestScore, box: [x1, y1, x2, y2] })
  }

  // Class-aware non-max suppression
  cands.sort((a, b) => b.score - a.score)
  const kept: Detection[] = []
  for (const c of cands) {
    if (kept.every((k) => k.classId !== c.classId || iou(k.box, c.box) < 0.45)) kept.push(c)
  }

  return { detections: kept, inferenceMs: Math.round(t1 - t0), width: W, height: H }
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not read that image file.'))
    img.src = url
  })
}