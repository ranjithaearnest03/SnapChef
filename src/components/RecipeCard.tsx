import { motion } from 'framer-motion'
import { BookHeart, Check, ChefHat, Clock, Copy, Flame, Leaf, Printer, RefreshCw, Sparkles, Users } from 'lucide-react'
import { useState } from 'react'
import type { Recipe } from '../lib/recipe'
import CookMode from './CookMode'

interface Props {
  recipe: Recipe
  saved: boolean
  onToggleSave: () => void
  onRegenerate?: () => void
  busy?: boolean
}

function toText(r: Recipe) {
  return [
    r.title,
    r.tagline,
    `${r.minutes} min · serves ${r.servings} · ${r.difficulty}`,
    '',
    'INGREDIENTS',
    ...r.ingredients.map((i) => `- ${i.amount ? i.amount + ' ' : ''}${i.item}${i.have ? '' : ' (pantry)'}`),
    '',
    'STEPS',
    ...r.steps.map((s, i) => `${i + 1}. ${s.title}: ${s.text}`),
    r.tip ? `\nZero-waste tip: ${r.tip}` : '',
    '\nMade with SnapChef',
  ].join('\n')
}

export default function RecipeCard({ recipe: r, saved, onToggleSave, onRegenerate, busy }: Props) {
  const [cooking, setCooking] = useState(false)
  const [checked, setChecked] = useState<Record<number, boolean>>({})
  const [copied, setCopied] = useState(false)
  const pct = r.total ? Math.round((r.used / r.total) * 100) : 0

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(toText(r))
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <motion.article initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden">
      <div className="border-b-2 border-ink bg-butter p-6 sm:p-9">
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip">
            {r.source === 'llm' ? <Sparkles size={14} /> : <ChefHat size={14} />}
            {r.source === 'llm' ? 'Written by AI chef (LLM)' : 'Offline chef engine'}
          </span>
          {r.total > 0 && r.used > 0 && (
            <span className="chip bg-mint">
              <Leaf size={14} /> Uses {Math.min(r.used, r.total)} of {r.total} ingredients
            </span>
          )}
        </div>
        <h3 className="font-display mt-4 text-4xl font-black leading-[1.02] tracking-tight sm:text-6xl">{r.title}</h3>
        {r.tagline && <p className="mt-3 max-w-2xl text-lg font-medium text-ink/80">{r.tagline}</p>}
        <div className="mt-5 flex flex-wrap gap-2.5">
          <span className="chip"><Clock size={15} /> {r.minutes || '—'} min</span>
          <span className="chip"><Users size={15} /> Serves {r.servings}</span>
          <span className="chip"><Flame size={15} /> {r.difficulty}</span>
        </div>
        {r.total > 0 && (
          <div className="mt-5 max-w-md" aria-label={`Ingredient usage ${pct}%`}>
            <div className="h-3 overflow-hidden rounded-full border-2 border-ink bg-white">
              <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, pct)}%` }} transition={{ duration: 0.8, delay: 0.2 }} className="h-full bg-leaf" />
            </div>
          </div>
        )}
        {r.notice && (
          <p className="mt-4 max-w-2xl rounded-xl border-2 border-ink bg-white/70 px-4 py-2.5 text-sm leading-snug">{r.notice}</p>
        )}
        {r.skipped.length > 0 && (
          <p className="mt-4 text-sm font-semibold text-ink/75">Left out for your diet: {r.skipped.join(', ')}</p>
        )}
      </div>

      <div className="grid gap-0 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="border-b-2 border-ink p-6 sm:p-9 lg:border-b-0 lg:border-r-2">
          <h4 className="font-display text-3xl font-black">Ingredients</h4>
          <ul className="mt-4 space-y-2">
            {r.ingredients.map((ing, i) => (
              <li key={i}>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-transparent px-2 py-1.5 hover:border-ink/20">
                  <input type="checkbox" className="peer sr-only" checked={!!checked[i]} onChange={() => setChecked((c) => ({ ...c, [i]: !c[i] }))} />
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 border-ink bg-white peer-checked:bg-leaf peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-3 peer-focus-visible:outline-butter">
                    {checked[i] && <Check size={16} strokeWidth={3} />}
                  </span>
                  <span className={`leading-snug ${checked[i] ? 'text-ink-soft line-through' : ''}`}>
                    <span className="font-bold">{ing.amount}</span> {ing.item}
                    {!ing.have && <span className="label-mono ml-2 rounded-full border border-ink/30 px-1.5 py-0.5 !text-[0.6rem] text-ink-soft">pantry</span>}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          {r.tip && (
            <div className="mt-6 rounded-2xl border-2 border-ink bg-mint p-4">
              <p className="label-mono flex items-center gap-1.5"><Leaf size={14} /> Zero-waste tip</p>
              <p className="mt-1.5 text-sm leading-relaxed">{r.tip}</p>
            </div>
          )}
        </div>

        <div className="p-6 sm:p-9">
          <h4 className="font-display text-3xl font-black">Method</h4>
          <ol className="mt-5 space-y-5">
            {r.steps.map((s, i) => (
              <motion.li key={i} initial={{ opacity: 0, x: 16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: Math.min(i * 0.05, 0.3) }} className="flex gap-4">
                <span className="font-display grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-ink bg-tomato text-lg font-black text-paper shadow-pop-sm">{i + 1}</span>
                <div>
                  <p className="font-bold">
                    {s.title}
                    {s.minutes ? <span className="label-mono ml-2 text-ink-soft">~{s.minutes} min</span> : null}
                  </p>
                  <p className="mt-0.5 leading-relaxed text-ink-soft">{s.text}</p>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>

      <div className="no-print flex flex-wrap items-center gap-3 border-t-2 border-ink bg-paper-2 p-5 sm:px-9">
        <button onClick={() => setCooking(true)} className="btn bg-tomato text-paper"><ChefHat size={18} /> Start cooking</button>
        {onRegenerate && (
          <button onClick={onRegenerate} disabled={busy} className="btn bg-white"><RefreshCw size={17} className={busy ? 'animate-spin' : ''} /> Another idea</button>
        )}
        <button onClick={onToggleSave} className={`btn ${saved ? 'bg-butter' : 'bg-white'}`}><BookHeart size={17} /> {saved ? 'Saved' : 'Save'}</button>
        <button onClick={copy} className="btn bg-white">{copied ? <Check size={17} /> : <Copy size={17} />} {copied ? 'Copied' : 'Copy'}</button>
        <button onClick={() => window.print()} className="btn bg-white"><Printer size={17} /> Print</button>
      </div>

      {cooking && <CookMode recipe={r} onClose={() => setCooking(false)} />}
    </motion.article>
  )
}
