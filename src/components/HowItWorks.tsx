import { motion } from 'framer-motion'
import { Camera, ChefHat, ShoppingBag } from 'lucide-react'

const STEPS = [
  {
    icon: Camera,
    title: 'Snap & Detect',
    text: 'Follow quick photo tips and snap your fridge or counter. Color-refined YOLOv8 identifies ingredients privately in your browser.',
    bg: 'bg-butter',
  },
  {
    icon: ShoppingBag,
    title: 'Pantry & Select',
    text: 'Detected foods are noted in your Pantry. Add multiple items in one go, manage quantities, and select what you want to cook with today.',
    bg: 'bg-mint',
  },
  {
    icon: ChefHat,
    title: 'Recipe Creator',
    text: 'The built-in recipe creator in your pantry crafts a delicious, timed, zero-waste meal using your exact selected ingredients.',
    bg: 'bg-blush',
  },
]

export default function HowItWorks() {
  return (
    <section id="how" className="border-y-2 border-ink bg-paper-2/70">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <p className="label-mono text-tomato">How it works</p>
        <h2 className="font-display mt-3 max-w-3xl text-4xl font-black leading-[1.02] tracking-tight sm:text-6xl">
          Three simple steps from <span className="italic">“what’s in my fridge?”</span> to cooking.
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