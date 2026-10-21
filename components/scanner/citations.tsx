'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BookOpen, ChevronRight, ExternalLink, FileText, Lightbulb, X } from 'lucide-react'
import type { Citation } from '@/lib/scanner'

type NormalizedCitation = {
  name: string
  explanation: string
  url: string
}

function normalize(c: Citation, index: number): NormalizedCitation {
  if (typeof c === 'string') {
    return {
      name: c,
      explanation: 'Official dietary health recommendations and standard daily allowance guidelines.',
      url: 'https://www.who.int/publications/i/item/9789241549028',
    }
  }

  const name = c.name ?? c.source ?? c.title ?? `Source ${index + 1}`
  const explanation =
    c.explanation ??
    c.plain_english ??
    c.description ??
    'Official standard governing dietary reference intake and maximum daily consumption limits.'

  let url = c.url ?? c.link ?? ''
  if (!url) {
    if (name.includes('WHO')) {
      url = 'https://www.who.int/publications/i/item/9789241549028'
    } else if (name.includes('ICMR')) {
      url = 'https://www.nin.res.in'
    } else {
      url = 'https://www.fssai.gov.in'
    }
  }

  return { name, explanation, url }
}

export function Citations({ citations }: { citations: Citation[] }) {
  const [active, setActive] = useState<{ citation: NormalizedCitation; index: number } | null>(null)

  return (
    <article className="toy-block p-5" aria-labelledby="citations-title">
      <div className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg border-2 border-toy-ink bg-toy-yellow text-toy-ink">
          <BookOpen className="size-4" strokeWidth={2.5} />
        </span>
        <h3 id="citations-title" className="text-xl font-bold text-toy-ink">
          Scientific Sources
        </h3>
      </div>
      <p className="mt-1 text-sm font-semibold text-muted-foreground">
        Tap any governing guideline to inspect the scientific basis.
      </p>

      <ol className="mt-3 flex flex-col gap-2">
        {citations.map((raw, i) => {
          const c = normalize(raw, i)
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => setActive({ citation: c, index: i })}
                className="toy-press flex w-full items-center gap-3 rounded-2xl border-[3px] border-toy-ink bg-[#eef8ff] p-3 text-left text-sm transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-toy-yellow active:translate-y-0.5 cursor-pointer"
              >
                <span className="font-display flex size-7 shrink-0 items-center justify-center rounded-full border-[3px] border-toy-ink bg-toy-yellow text-sm font-bold text-toy-ink">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="font-display block font-bold text-toy-ink">{c.name}</span>
                  <span className="block truncate text-xs font-semibold text-toy-ink/70">
                    {c.explanation}
                  </span>
                </span>
                <ChevronRight className="size-5 shrink-0 text-toy-ink" strokeWidth={3} aria-hidden="true" />
              </button>
            </li>
          )
        })}
      </ol>

      {/* Pixar-style Modal for Scientific Sources */}
      <AnimatePresence>
        {active && (
          <CitationModal
            citation={active.citation}
            index={active.index}
            onClose={() => setActive(null)}
          />
        )}
      </AnimatePresence>
    </article>
  )
}

function CitationModal({
  citation,
  index,
  onClose,
}: {
  citation: NormalizedCitation
  index: number
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    dialogRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      previouslyFocused?.focus()
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-toy-ink/65 backdrop-blur-xs"
      onClick={onClose}
    >
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="citation-modal-title"
        tabIndex={-1}
        initial={{ y: 50, scale: 0.85, opacity: 0, rotate: -2 }}
        animate={{ y: 0, scale: 1, opacity: 1, rotate: 0 }}
        exit={{ y: 50, scale: 0.85, opacity: 0, rotate: 2 }}
        transition={{ type: 'spring', stiffness: 380, damping: 22 }}
        onClick={(e) => e.stopPropagation()}
        className="toy-block relative w-full max-w-sm bg-white p-6 shadow-2xl text-left focus:outline-none"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full border-2 border-toy-ink bg-muted text-toy-ink transition-transform hover:scale-110 cursor-pointer"
        >
          <X className="size-4" strokeWidth={3} aria-hidden="true" />
        </button>

        <div className="flex items-center gap-3 pr-8">
          <motion.span
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 14, delay: 0.08 }}
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl border-3 border-toy-ink bg-toy-yellow text-toy-ink shadow-[0_3px_0_0_var(--toy-ink)]"
            aria-hidden="true"
          >
            <Lightbulb className="size-6 text-toy-ink" strokeWidth={2.6} />
          </motion.span>
          <div>
            <span className="font-display rounded-md bg-toy-yellow/30 px-2 py-0.5 text-[10px] font-bold text-toy-ink">
              Official Reference #{index + 1}
            </span>
            <h4
              id="citation-modal-title"
              className="font-display mt-0.5 text-2xl font-bold leading-tight text-toy-ink"
            >
              {citation.name}
            </h4>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border-3 border-toy-ink bg-[#eef8ff] p-4 shadow-[0_2px_0_0_var(--toy-ink)]">
          <p className="font-display text-xs font-bold uppercase tracking-wider text-toy-orange">
            Plain-English Scientific Guidance
          </p>
          <p className="mt-1.5 text-sm font-semibold leading-relaxed text-toy-ink text-pretty">
            {citation.explanation}
          </p>
        </div>

        <div className="mt-5 flex flex-col gap-2.5">
          <a
            href={citation.url}
            target="_blank"
            rel="noopener noreferrer"
            className="toy-press font-display flex w-full items-center justify-center gap-2 rounded-2xl border-4 border-toy-ink bg-toy-yellow py-3 text-sm font-bold text-toy-ink shadow-[0_3px_0_0_var(--toy-ink)] hover:brightness-105 cursor-pointer"
          >
            <FileText className="size-4 stroke-[2.5]" />
            <span>📄 Read Official Document</span>
            <ExternalLink className="size-3.5 stroke-[2.5]" />
          </a>

          <button
            type="button"
            onClick={onClose}
            className="font-display w-full rounded-xl border-2 border-toy-ink bg-muted py-2 text-sm font-bold text-toy-ink transition-colors hover:bg-muted/80 cursor-pointer"
          >
            Got it!
          </button>
        </div>
      </motion.div>
    </div>
  )
}
