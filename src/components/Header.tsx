import { BookHeart, Camera } from 'lucide-react'

interface Props {
  saved: number
  onOpenCookbook: () => void
}

export default function Header({ saved, onOpenCookbook }: Props) {
  return (
    <header className="sticky top-0 z-40 border-b-2 border-ink bg-paper/90 backdrop-blur no-print">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <a href="#top" className="flex items-center gap-2.5" aria-label="SnapChef home">
          <span className="grid h-10 w-10 place-items-center rounded-full border-2 border-ink bg-tomato text-paper shadow-pop-sm">
            <Camera size={20} strokeWidth={2.4} />
          </span>
          <span className="font-display text-2xl font-black tracking-tight">SnapChef</span>
        </a>
        <nav className="hidden items-center gap-7 text-sm font-semibold md:flex">
          <a className="hover:text-tomato" href="#why">The problem</a>
          <a className="hover:text-tomato" href="#how">How it works</a>
          <a className="hover:text-tomato" href="#studio">Try it</a>
          <a className="hover:text-tomato" href="#tech">Under the hood</a>
        </nav>
        <button onClick={onOpenCookbook} className="btn bg-butter !px-4 !py-2 text-sm" aria-label="Open saved recipes">
          <BookHeart size={17} />
          <span className="hidden sm:inline">Cookbook</span>
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1 text-xs text-paper">{saved}</span>
        </button>
      </div>
    </header>
  )
}
