import { motion } from 'framer-motion'
import { ArrowDown, Sparkles } from 'lucide-react'

// Real YOLOv8n detections on /samples/market-table.jpg (score >= 0.5), as % of the image.
const BOXES = [
  { label: 'orange', c: 0.79, x1: 23.4, y1: 41.5, x2: 36.1, y2: 56.1, color: '#d98a00' },
  { label: 'apple', c: 0.77, x1: 78.9, y1: 61.7, x2: 92.7, y2: 82.4, color: '#e8412a' },
  { label: 'apple', c: 0.74, x1: 76.1, y1: 43.8, x2: 90.7, y2: 62.5, color: '#e8412a' },
  { label: 'banana', c: 0.59, x1: 44.6, y1: 62.3, x2: 80.8, y2: 95.3, color: '#2f7d4f' },
  { label: 'orange', c: 0.52, x1: 25.6, y1: 55.0, x2: 37.9, y2: 70.5, color: '#d98a00' },
]

const MARQUEE = ['No typing', 'No takeout', 'Less waste', 'One photo', 'Real recipes', 'Cook what you have', 'Runs in your browser']

export default function Hero() {
  return (
    <section id="top" className="relative overflow-hidden">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pb-24 lg:pt-20">
        <div>
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="chip bg-mint"
          >
            <Sparkles size={15} /> Computer vision × LLM chef
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.6 }}
            className="font-display mt-5 text-[2.9rem] font-black leading-[0.95] tracking-tight sm:text-7xl lg:text-[5.4rem]"
          >
            Snap your fridge.{' '}
            <span className="relative inline-block italic text-tomato">
              Get dinner.
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 14" fill="none" preserveAspectRatio="none" aria-hidden>
                <path d="M3 9c40-8 80 6 120-1s100-6 174 1" stroke="#1d1b16" strokeWidth="4" strokeLinecap="round" />
              </svg>
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-7 max-w-xl text-lg leading-relaxed text-ink-soft sm:text-xl"
          >
            Stop typing ingredient lists. Upload one photo — a YOLOv8 vision model spots what you have, and an AI chef writes a step-by-step recipe from <em>only</em> that.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-9 flex flex-wrap items-center gap-4"
          >
            <a href="#studio" className="btn bg-tomato text-paper text-lg">
              Snap a photo <ArrowDown size={20} />
            </a>
            <a href="#how" className="btn bg-card">See how it works</a>
          </motion.div>
          <motion.dl
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t-2 border-ink/20 pt-6"
          >
            {[
              ['1 photo', 'replaces manual entry'],
              ['<1 s', 'on-device detection'],
              ['0 uploads', 'your photo stays local'],
            ].map(([a, b]) => (
              <div key={a}>
                <dt className="font-display text-2xl font-black">{a}</dt>
                <dd className="text-xs leading-snug text-ink-soft">{b}</dd>
              </div>
            ))}
          </motion.dl>
        </div>

        <motion.div
          initial={{ opacity: 0, rotate: 6, y: 30 }}
          animate={{ opacity: 1, rotate: 2, y: 0 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 80, damping: 14 }}
          className="relative mx-auto w-full max-w-xl"
        >
          <div className="card relative overflow-hidden !rounded-[2rem] p-3 shadow-pop-lg">
            <div className="relative overflow-hidden rounded-[1.4rem] bg-paper-2">
              <img src="/samples/market-table.jpg" alt="Fruit and vegetables with detection boxes" className="block w-full" />
              <div className="scanline" />
              {BOXES.map((b, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.9 + i * 0.18 }}
                  className="absolute rounded-md border-[3px]"
                  style={{ left: `${b.x1}%`, top: `${b.y1}%`, width: `${b.x2 - b.x1}%`, height: `${b.y2 - b.y1}%`, borderColor: b.color }}
                >
                  <span
                    className="label-mono absolute -top-0.5 left-0 -translate-y-full whitespace-nowrap rounded-t-md px-1.5 py-0.5 !text-[0.6rem] text-white"
                    style={{ background: b.color }}
                  >
                    {b.label} {b.c.toFixed(2)}
                  </span>
                </motion.div>
              ))}
            </div>
            <div className="flex items-center justify-between px-3 pb-1 pt-3">
              <span className="label-mono text-ink-soft">YOLOv8n · 5 objects found</span>
              <span className="label-mono rounded-full bg-leaf px-2.5 py-1 text-white">→ recipe</span>
            </div>
          </div>
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
            className="card absolute -bottom-6 -left-4 hidden max-w-[15rem] !rounded-2xl bg-butter p-4 sm:block"
          >
            <p className="label-mono">AI chef says</p>
            <p className="font-display mt-1 text-lg font-bold leading-tight">“Skillet-caramelised apples & bananas with an orange glaze.”</p>
          </motion.div>
        </motion.div>
      </div>

      <div className="overflow-hidden border-y-2 border-ink bg-ink py-3 text-paper" aria-hidden>
        <div className="marquee flex w-max gap-10 whitespace-nowrap">
          {[...MARQUEE, ...MARQUEE, ...MARQUEE, ...MARQUEE].map((t, i) => (
            <span key={i} className="font-display flex items-center gap-10 text-xl font-bold italic">
              {t} <span className="text-butter">✺</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
