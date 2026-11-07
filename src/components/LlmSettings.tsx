import { AnimatePresence, motion } from 'framer-motion'
import { KeyRound, ShieldCheck, X } from 'lucide-react'
import { useState } from 'react'
import { LLM_PRESETS, loadLlmConfig, saveLlmConfig, type LlmConfig } from '../lib/recipe'

interface Props {
  open: boolean
  onClose: () => void
  onChange: (connected: boolean) => void
}

export default function LlmSettings({ open, onClose, onChange }: Props) {
  const existing = loadLlmConfig()
  const [cfg, setCfg] = useState<LlmConfig>(existing ?? { baseUrl: LLM_PRESETS[0].baseUrl, model: LLM_PRESETS[0].model, apiKey: '' })

  const save = () => {
    const ok = cfg.apiKey.trim() && cfg.baseUrl.trim() && cfg.model.trim()
    saveLlmConfig(ok ? { ...cfg, apiKey: cfg.apiKey.trim() } : null)
    onChange(!!ok)
    onClose()
  }
  const clear = () => {
    saveLlmConfig(null)
    setCfg({ ...cfg, apiKey: '' })
    onChange(false)
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] grid place-items-center bg-ink/60 p-4" onClick={onClose}>
          <motion.div
            initial={{ y: 30, scale: 0.96 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 30, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="card w-full max-w-lg p-7"
            role="dialog"
            aria-modal="true"
            aria-label="AI settings"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="label-mono text-tomato">AI settings</p>
                <h3 className="font-display mt-1 text-3xl font-black">Connect your own LLM</h3>
              </div>
              <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full border-2 border-ink bg-white" aria-label="Close"><X /></button>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              Any OpenAI-compatible API works. Your key is stored only in this browser and sent straight to the provider you choose — never to SnapChef.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {LLM_PRESETS.map((p) => (
                <button key={p.label} onClick={() => setCfg((c) => ({ ...c, baseUrl: p.baseUrl, model: p.model }))} className={`chip ${cfg.baseUrl === p.baseUrl ? '!bg-butter' : ''}`}>{p.label}</button>
              ))}
            </div>

            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="label-mono text-ink-soft">Base URL</span>
                <input value={cfg.baseUrl} onChange={(e) => setCfg({ ...cfg, baseUrl: e.target.value })} className="mt-1 w-full rounded-xl border-2 border-ink bg-white px-3 py-2 text-sm font-semibold" />
              </label>
              <label className="block">
                <span className="label-mono text-ink-soft">Model</span>
                <input value={cfg.model} onChange={(e) => setCfg({ ...cfg, model: e.target.value })} className="mt-1 w-full rounded-xl border-2 border-ink bg-white px-3 py-2 text-sm font-semibold" />
              </label>
              <label className="block">
                <span className="label-mono text-ink-soft">API key</span>
                <input type="password" autoComplete="off" value={cfg.apiKey} onChange={(e) => setCfg({ ...cfg, apiKey: e.target.value })} placeholder="sk-…" className="mt-1 w-full rounded-xl border-2 border-ink bg-white px-3 py-2 text-sm font-semibold" />
              </label>
            </div>

            <p className="mt-4 flex items-start gap-2 text-xs text-ink-soft"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-leaf" /> Only the ingredient names and your preferences are sent — your photo stays on your device.</p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button onClick={save} className="btn bg-tomato text-paper"><KeyRound size={17} /> Save &amp; use</button>
              {existing && <button onClick={clear} className="btn bg-white">Remove key</button>}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
