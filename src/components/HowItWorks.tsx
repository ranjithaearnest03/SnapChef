import { motion } from 'framer-motion'
import { Camera, ChefHat, ScanSearch } from 'lucide-react'

const STEPS = [
  { icon: Camera, title: 'Snap', text: 'Take or upload a photo of your fridge, pantry or countertop. No typing, no forms.', bg: 'bg-butter' },
  { icon: ScanSearch, title: 'Detect', text: 'YOLOv8 finds every food item in the frame and turns boxes into a clean ingredient list you can tweak.', bg: 'bg-mint' },
  { icon: ChefHat, title: 'Cook', text: 'An LLM chef writes a step-by-step recipe from what you actually have — scaled, timed, diet-aware.', bg: 'bg-blush' },
]

export default function HowItWorks() {
  return (
    <section id="how" className="border-y-2 border-ink bg-paper-2/70">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <p className="label-mono text-tomato">How it works</p>
        <h2 className="font-display mt-3 max-w-3xl text-4xl font-black leading-[1.02] tracking-tight sm:text-6xl">
          Three taps from <span className="italic">“what’s for dinner?”</span> to cooking.
        </h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12 }}
              className="card relative p-7"
            >
              <span className="font-display absolute right-5 top-3 text-7xl font-black text-ink/10">{i + 1}</span>
              <span className={`grid h-14 w-14 place-items-center rounded-2xl border-2 border-ink shadow-pop-sm ${s.bg}`}>
                <s.icon size={26} />
              </span>
              <h3 className="font-display mt-5 text-3xl font-black">{s.title}</h3>
              <p className="mt-2 leading-relaxed text-ink-soft">{s.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
