import { motion } from 'framer-motion'
import { ArrowRight, Brain, Cpu, Lock, Rocket, ShieldAlert } from 'lucide-react'

const FLOW = [
  { k: '01', t: 'Photo', d: 'JPEG/PNG from camera or gallery' },
  { k: '02', t: 'YOLOv8n', d: '640×640 letterbox → 8,400 candidate boxes' },
  { k: '03', t: 'NMS + mapping', d: 'IoU 0.45 → COCO classes → ingredients' },
  { k: '04', t: 'You review', d: 'Add, remove, set diet & time' },
  { k: '05', t: 'LLM chef', d: 'Constrained JSON recipe, strict ingredient list' },
]

const CARDS = [
  {
    icon: Cpu,
    title: 'Vision: YOLOv8, in your browser',
    text: 'A YOLOv8n network (ONNX, 12.7 MB) runs through ONNX Runtime Web / WebAssembly. Pre-processing, inference, confidence filtering and class-aware non-max suppression are implemented client-side — no GPU server, no upload.',
  },
  {
    icon: Brain,
    title: 'Language: a constrained LLM chef',
    text: 'Detected ingredients, diet, time budget, servings and mood go into a structured prompt that demands strict JSON (title, timed steps, amounts, zero-waste tip). If the LLM is unreachable, a deterministic offline chef engine takes over.',
  },
  {
    icon: Lock,
    title: 'Privacy by design',
    text: 'Your fridge photo is processed locally and never leaves the device. Only the plain-text ingredient list is sent to the language model.',
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

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border-2 border-tomato bg-tomato/10 p-7">
            <ShieldAlert className="text-tomato" size={28} />
            <h3 className="font-display mt-4 text-2xl font-bold">Honest limitations</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-paper/80">
              <li>The bundled weights are COCO-pretrained, which only know 10 food classes (apple, banana, orange, broccoli, carrot, sandwich, hot dog, pizza, donut, cake). Eggs, milk, rice or sauces must be added with one tap.</li>
              <li>Items hidden behind others or in opaque packaging can’t be seen — the review step exists for this reason.</li>
              <li>Quantities are estimated from servings, not measured from the photo.</li>
            </ul>
          </div>
          <div className="rounded-3xl border-2 border-leaf bg-leaf/15 p-7">
            <Rocket className="text-mint" size={28} />
            <h3 className="font-display mt-4 text-2xl font-bold">Roadmap</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-paper/80">
              <li>Fine-tune YOLOv8 on a fridge &amp; pantry dataset (100+ ingredient classes) — the pipeline is already model-agnostic, just swap the .onnx.</li>
              <li>Expiry-aware prioritisation: cook the oldest ingredients first.</li>
              <li>Weekly meal plans, shopping gaps and nutrition estimates.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
