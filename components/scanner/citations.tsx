'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight, ExternalLink, Lightbulb, X } from 'lucide-react'
import type { Citation } from '@/lib/scanner'
import { ToyButton } from './toy-button'

type NormalizedCitation = {
  title: string
  source?: string
  url?: string
  plainEnglish?: string
}

function normalize(c: Citation): NormalizedCitation {
  if (typeof c === 'string') {
    const isUrl = /^https?:\/\//.test(c)
    return { title: c, url: isUrl ? c : undefined }
  }
  return {
    source: c.source ?? c.name,
    title: c.title ?? c.description ?? c.source ?? c.name ?? 'Source',
    url: c.url ?? c.link,
    plainEnglish: c.plain_english,
  }
}

export function Citations({ citations }: { citations: Citation[] }) {
  const [active, setActive] = useState<{ citation: NormalizedCitation; index: number } | null>(null)

  return (
    <article className="toy-block p-5" aria-labelledby="citations-title">
      <h3 id="citations-title" className="text-xl font-bold text-toy-ink">
        Scientific Sources
      </h3>
      <p className="mt-1 text-sm font-semibold text-muted-foreground">Tap a source to see what it means.</p>
      <ol className="mt-3 flex flex-col gap-2">
        {citations.map((raw, i) => {
          const c = normalize(raw)
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => setActive({ citation: c, index: i })}
                className="toy-press flex w-full items-center gap-3 rounded-2xl border-[3px] border-toy-ink bg-[#eef8ff] p-3 text-left text-sm transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-toy-yellow active:translate-y-0.5"
              >
                <span className="font-display flex size-7 shrink-0 items-center justify-center rounded-full border-[3px] border-toy-ink bg-toy-yellow text-sm font-bold text-toy-ink">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  {c.source && c.source !== c.title && (
                    <span className="font-display block font-bold text-toy-ink">{c.source}</span>
                  )}
                  <span className="block break-words font-semibold text-toy-ink/80">{c.title}</span>
                </span>
                <ChevronRight className="size-5 shrink-0 text-toy-ink" strokeWidth={3} aria-hidden="true" />
              </button>
            </li>
          )
        })}
      </ol>

      <AnimatePresence>
        {active && (
          <CitationModal citation={active.citation} index={active.index} onClose={() => setActive(null)} />
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-toy-ink/50 p-4 sm:items-center"
      onClick={onClose}
    >
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="citation-modal-title"
        aria-describedby="citation-modal-body"
        tabIndex={-1}
        initial={{ y: 80, scale: 0.85, rotate: -2 }}
        animate={{ y: 0, scale: 1, rotate: 0 }}
        exit={{ y: 80, scale: 0.85, rotate: 2 }}
        transition={{ type: 'spring', stiffness: 360, damping: 22 }}
        onClick={(e) => e.stopPropagation()}
        className="toy-block relative w-full max-w-md p-5 text-left focus:outline-none"
      >
        <div className="flex items-start gap-3">
          <motion.span
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 12, delay: 0.1 }}
            className="flex size-12 shrink-0 items-center justify-center rounded-2xl border-[3px] border-toy-ink bg-toy-yellow text-toy-ink"
            aria-hidden="true"
          >
            <Lightbulb className="size-6" strokeWidth={2.75} />
          </motion.span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-bold text-muted-foreground">Source {index + 1}</p>
            <h4
              id="citation-modal-title"
              className="font-display break-words text-lg font-bold leading-tight text-toy-ink"
            >
              {citation.source && citation.source !== citation.title ? citation.source : citation.title}
            </h4>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-9 shrink-0 items-center justify-center rounded-full border-[3px] border-toy-ink bg-white text-toy-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-toy-yellow"
          >
            <X className="size-5" strokeWidth={3} aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 rounded-2xl border-[3px] border-toy-ink bg-[#eef8ff] p-4">
          <p className="font-display text-sm font-bold text-toy-ink">In plain English</p>
          <p id="citation-modal-body" className="mt-1 text-base leading-relaxed text-toy-ink text-pretty">
            {citation.plainEnglish ?? 'No simple summary is available for this source yet.'}
          </p>
        </div>

        {citation.source && citation.source !== citation.title && (
          <p className="mt-3 break-words text-xs font-semibold text-muted-foreground">{citation.title}</p>
        )}

        <div className="mt-4 flex flex-col gap-2">
          {citation.url && (
            <a
              href={citation.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-display inline-flex items-center justify-center gap-1.5 text-sm font-bold text-[#1f6fd1] underline underline-offset-2"
            >
              Read the full source
              <ExternalLink className="size-4" aria-hidden="true" />
            </a>
          )}
          <ToyButton variant="yellow" onClick={onClose} className="w-full">
            Got it!
          </ToyButton>
        </div>
      </motion.div>
    </motion.div>
  )
}
