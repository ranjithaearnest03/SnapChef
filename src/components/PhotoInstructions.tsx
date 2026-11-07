import { CheckCircle2, ChevronDown, ChevronUp, Eye, Lightbulb, PackageOpen, Sparkles } from 'lucide-react'
import { useState } from 'react'

export default function PhotoInstructions() {
  const [open, setOpen] = useState(true)

  const tips = [
    {
      icon: Lightbulb,
      title: 'Bright Lighting',
      desc: 'Use clear kitchen light or daylight. Avoid dark shadows or high-contrast glare.',
      bg: 'bg-butter',
    },
    {
      icon: PackageOpen,
      title: 'Unpack & Spread',
      desc: 'Take produce out of opaque bags and space items slightly apart so none are hidden.',
      bg: 'bg-mint',
    },
    {
      icon: Eye,
      title: 'Angle from Above',
      desc: 'Hold your camera directly overhead or at 45° overlooking the shelf or counter.',
      bg: 'bg-blush',
    },
    {
      icon: Sparkles,
      title: 'Multiple Photos',
      desc: 'Snap different shelves or counters — all items accumulate in your Pantry below!',
      bg: 'bg-paper-2',
    },
  ]

  return (
    <div className="card mb-6 overflow-hidden border-2 border-ink bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-xl border-2 border-ink bg-butter shadow-pop-sm">
            <CheckCircle2 size={18} className="text-ink" />
          </span>
          <div>
            <h4 className="font-display text-lg font-black tracking-tight">Photo Guide for Best AI Detection</h4>
            <p className="text-xs text-ink-soft">Follow these quick tips before snapping to help YOLO detect every ingredient accurately</p>
          </div>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="btn !px-3 !py-1 bg-white text-xs"
          aria-expanded={open}
        >
          {open ? (
            <>
              Hide tips <ChevronUp size={14} />
            </>
          ) : (
            <>
              View tips <ChevronDown size={14} />
            </>
          )}
        </button>
      </div>

      {open && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {tips.map((t, idx) => (
            <div
              key={t.title}
              className="relative rounded-xl border-2 border-ink bg-white p-3.5 shadow-pop-sm transition-transform hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-2">
                <span className={`grid h-7 w-7 place-items-center rounded-lg border-2 border-ink ${t.bg}`}>
                  <t.icon size={15} />
                </span>
                <span className="label-mono font-bold text-ink">0{idx + 1}. {t.title}</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-ink-soft">{t.desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}