import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  Hash,
  PackageX,
  SplitSquareVertical,
} from 'lucide-react'
import { useState } from 'react'

export default function PhotoInstructions() {
  const [open, setOpen] = useState(true)

  const tips = [
    {
      icon: Hash,
      title: 'Max 10 Items',
      desc: 'Make sure each picture has not more than 10 items for maximum detection accuracy.',
      bg: 'bg-butter',
    },
    {
      icon: Eye,
      title: 'Clearly Visible',
      desc: 'Make sure the food items are clearly visible under good light without heavy shadows.',
      bg: 'bg-mint',
    },
    {
      icon: PackageX,
      title: 'No Covers or Bags',
      desc: 'The food items shall not be packed in covers or opaque plastic bags.',
      bg: 'bg-blush',
    },
    {
      icon: SplitSquareVertical,
      title: 'Separate Compartments',
      desc: 'Upload each compartment separately (e.g. door shelf, veg tray, freezer) for better results.',
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
            <h4 className="font-display text-lg font-black tracking-tight">
              Photo Upload Instructions
            </h4>
            <p className="text-xs text-ink-soft">
              Follow these 4 rules before snapping to ensure accurate AI detection
            </p>
          </div>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="btn !px-3 !py-1 bg-white text-xs font-bold"
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