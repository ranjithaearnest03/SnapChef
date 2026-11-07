import { motion } from 'framer-motion'

const STATS = [
  { big: '1.05 bn', unit: 'tonnes', text: 'of food was wasted worldwide in 2022 — about 19% of all food available to consumers.', bg: 'bg-blush' },
  { big: '60%', unit: 'of it', text: 'came from households — more than restaurants and retail combined. The fix starts in our kitchens.', bg: 'bg-butter' },
  { big: '8–10%', unit: 'of emissions', text: 'of global greenhouse gases are linked to food that is grown, shipped… and never eaten.', bg: 'bg-mint' },
]

export default function Impact() {
  return (
    <section id="why" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
        <div>
          <p className="label-mono text-tomato">The problem</p>
          <h2 className="font-display mt-3 text-4xl font-black leading-[1.02] tracking-tight sm:text-6xl">
            We don’t lack food.<br />We lack <span className="italic text-tomato">a plan</span> for it.
          </h2>
        </div>
        <p className="max-w-xl text-lg leading-relaxed text-ink-soft">
          Busy people stare into a full fridge and still order takeout. Recipe sites ask you to type every ingredient — decision fatigue wins, and the spinach quietly dies. SnapChef removes that friction: one snapshot in, one cookable answer out.
        </p>
      </div>
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {STATS.map((s, i) => (
          <motion.div
            key={s.big}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ delay: i * 0.1 }}
            className={`card ${s.bg} p-7`}
            style={{ rotate: i === 1 ? '1deg' : i === 0 ? '-1deg' : '0.5deg' }}
          >
            <p className="font-display text-6xl font-black leading-none tracking-tight">{s.big}</p>
            <p className="label-mono mt-2">{s.unit}</p>
            <p className="mt-4 leading-snug">{s.text}</p>
          </motion.div>
        ))}
      </div>
      <p className="label-mono mt-6 text-ink-soft">Source: UNEP Food Waste Index Report 2024</p>
    </section>
  )
}
