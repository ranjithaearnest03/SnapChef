import { motion } from 'framer-motion'
import { ArrowRight, Brain, Cpu, Lock, Rocket, Sparkles } from 'lucide-react'

const FLOW = [
  { k: '01', t: 'Photo', d: 'JPEG/PNG from camera or gallery' },
  { k: '02', t: 'Vision Engine', d: 'YOLOv8 + Multi-Region Color Segmentation' },
  { k: '03', t: 'NMS & Mapping', d: 'IoU 0.45 → Culinary Ingredient Profiles' },
  { k: '04', t: 'Pantry Lab', d: 'Review, stock inventory & select meal items' },
  { k: '05', t: 'LLM Chef', d: 'Custom recipe generated from chosen ingredients' },
]

const CARDS = [
  {
    icon: Cpu,
    title: 'High-Precision Client Vision',
    text: 'A hybrid vision pipeline combining YOLOv8n (ONNX Runtime Web / WebAssembly) and real-time color-space segmentation. Pre-processing, inference, confidence filtering, and non-max suppression run 100% on-device.',
  },
  {
    icon: Brain,
    title: 'Language: Constrained LLM Chef',
    text: 'Selected pantry ingredients, diet, time budget, servings, and mood feed into a structured prompt demanding strict JSON. If the cloud LLM is unreachable, an offline chef engine takes over.',
  },
  {
    icon: Lock,
    title: 'Privacy by Design',
    text: 'Your fridge photos are processed locally in your browser and never leave your device. Only plain-text ingredient names and preferences reach the language model.',
  },
]

export default function Tech() {
  return (
    <section id="tech" className="bg-ink text-paper">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <p className="label-mono text-butter">Under the hood</p>
        <h2 className="font-display mt-3 max-w-3xl text-4xl font-black leading-[1.02] tracking-tight sm:text-6xl">
          From pixels to a <span className="italic text-butter">plan</span>.
        </h2>

        <div className="mt-12 grid gap-3 lg:grid-cols-5">
          {FLOW.map((f, i) => (
            <motion.div
              key={f.k}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="relative rounded-2xl border-2 border-paper/30 bg-paper/5 p-5"
            >
              <span className="label-mono text-butter">{f.k}</span>
              <h3 className="font-display mt-1 text-2xl font-bold">{f.t}</h3>
              <p className="mt-1 text-sm text-paper/70">{f.d}</p>
              {i < FLOW.length - 1 && (
                <ArrowRight className="absolute -right-3.5 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-butter p-1 text-ink lg:block" size={26} />
              )}
            </motion.div>
          ))}
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {CARDS.map((c) => (
            <div key={c.title} className="rounded-3xl border-2 border-paper/30 p-7">
              <c.icon className="text-butter" size={28} />
              <h3 className="font-display mt-4 text-2xl font-bold leading-tight">{c.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-paper/75">{c.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border-2 border-butter/40 bg-paper/5 p-7">
            <Sparkles className="text-butter" size={28} />
            <h3 className="font-display mt-4 text-2xl font-bold">Smart Culinary Vision Engine</h3>
            <p className="mt-3 text-sm leading-relaxed text-paper/80">
              SnapChef analyzes bounding geometry and color signatures across HSV color spaces to accurately differentiate look-alike items (e.g. Tomatoes vs. Apples, Lemons vs. Oranges, Milk vs. Condiments) and detect pantry staples like eggs, potatoes, and greens without cloud dependence.
            </p>
          </div>
          <div className="rounded-3xl border-2 border-leaf bg-leaf/15 p-7">
            <Rocket className="text-mint" size={28} />
            <h3 className="font-display mt-4 text-2xl font-bold">Roadmap</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-paper/80">
              <li>Fine-tune YOLOv8 on dedicated fridge &amp; grocery datasets (100+ ingredient classes).</li>
              <li>Expiry-aware recipe prioritization: cook the oldest ingredients first.</li>
              <li>Weekly meal plans, shopping list delta, and comprehensive nutrition estimates.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}