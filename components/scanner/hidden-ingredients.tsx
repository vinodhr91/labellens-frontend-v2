'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, ExternalLink, Newspaper, X } from 'lucide-react'
import {
  extractHiddenIngredients,
  HIDDEN_INGREDIENTS_DB,
  type AnalysisResult,
  type HiddenIngredientItem,
} from '@/lib/scanner'

type NormalizedHidden = {
  name: string
  meaning: string
}

export function HiddenIngredients({
  hidden,
  raw,
}: {
  hidden?: (HiddenIngredientItem | string)[]
  raw?: AnalysisResult['raw_ingredients']
}) {
  const [selected, setSelected] = useState<NormalizedHidden | null>(null)

  // Consolidate backend returned hidden_ingredients and raw extracted ingredients
  const items: NormalizedHidden[] = []
  const seen = new Set<string>()

  if (hidden && Array.isArray(hidden)) {
    for (const h of hidden) {
      if (typeof h === 'string') {
        const lower = h.toLowerCase().trim()
        if (!seen.has(lower)) {
          seen.add(lower)
          items.push({
            name: h,
            meaning:
              HIDDEN_INGREDIENTS_DB[lower] ||
              'A processed additive or sweetener used to enhance taste or texture. Excess intake is linked to metabolic strain.',
          })
        }
      } else if (h && typeof h === 'object' && h.name) {
        const lower = h.name.toLowerCase().trim()
        if (!seen.has(lower)) {
          seen.add(lower)
          items.push({
            name: h.name,
            meaning:
              h.meaning ||
              HIDDEN_INGREDIENTS_DB[lower] ||
              'A processed additive or sweetener used to enhance taste or texture. Excess intake is linked to metabolic strain.',
          })
        }
      }
    }
  }

  // Fallback to extracting from raw ingredients text if backend list wasn't populated
  if (items.length === 0 && raw) {
    const extracted = extractHiddenIngredients(raw)
    for (const name of extracted) {
      const lower = name.toLowerCase().trim()
      if (!seen.has(lower)) {
        seen.add(lower)
        items.push({
          name,
          meaning:
            HIDDEN_INGREDIENTS_DB[lower] ||
            'A processed additive or sweetener used to enhance taste or texture. Excess intake is linked to metabolic strain.',
        })
      }
    }
  }

  return (
    <article className="toy-block p-5" aria-labelledby="hidden-title">
      <div className="flex items-center justify-between">
        <h3 id="hidden-title" className="text-xl font-bold text-toy-ink">
          Hidden Ingredients
        </h3>
        {items.length > 0 && (
          <span className="text-xs font-bold text-muted-foreground">Tap any pill to learn more</span>
        )}
      </div>

      {items.length > 0 ? (
        <>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            Sneaky sugars, starches, and fats we spotted:
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {items.map((item, i) => (
              <motion.li
                key={item.name}
                initial={{ scale: 0, rotate: -12 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 14, delay: 0.4 + i * 0.08 }}
              >
                <button
                  type="button"
                  onClick={() => setSelected(item)}
                  className="font-display inline-flex cursor-pointer items-center gap-1.5 rounded-full border-[3px] border-toy-ink bg-toy-red px-3.5 py-1 text-sm font-bold text-white shadow-[0_4px_0_0_var(--toy-ink)] transition-transform hover:scale-105 hover:brightness-110 active:scale-95 active:shadow-[0_1px_0_0_var(--toy-ink)]"
                  title="Click to view explanation and news"
                >
                  <AlertTriangle className="size-4 shrink-0" strokeWidth={3} aria-hidden="true" />
                  <span>{item.name}</span>
                </button>
              </motion.li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-2 flex items-center gap-2 font-semibold text-toy-green">
          <CheckCircle2 className="size-5" strokeWidth={3} aria-hidden="true" />
          No hidden sugars or palmolein spotted.
        </p>
      )}

      {/* Modal for Ingredient Explanation & Google News */}
      <AnimatePresence>
        {selected && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-toy-ink/60 backdrop-blur-xs"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ scale: 0.88, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.88, opacity: 0, y: 16 }}
              transition={{ type: 'spring', stiffness: 380, damping: 26 }}
              className="toy-block relative w-full max-w-sm bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-ingredient-name"
            >
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full border-2 border-toy-ink bg-muted text-toy-ink transition-transform hover:scale-110"
                aria-label="Close dialog"
              >
                <X className="size-4" strokeWidth={3} />
              </button>

              <div className="flex items-center gap-2.5 pr-8">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border-3 border-toy-ink bg-toy-red text-white shadow-[0_2px_0_0_var(--toy-ink)]">
                  <AlertTriangle className="size-5" strokeWidth={3} />
                </span>
                <h4 id="modal-ingredient-name" className="font-display text-2xl font-bold leading-tight text-toy-ink">
                  {selected.name}
                </h4>
              </div>

              <div className="mt-4 rounded-xl border-2 border-toy-ink/20 bg-[#fff9ed] p-3.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-toy-orange">
                  Plain-English Explanation
                </p>
                <p className="mt-1.5 text-sm font-semibold leading-relaxed text-toy-ink">
                  {selected.meaning}
                </p>
              </div>

              <div className="mt-5 flex flex-col gap-2.5">
                <a
                  href={`https://news.google.com/search?q=${encodeURIComponent(selected.name + ' health risks food')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="toy-press font-display flex items-center justify-center gap-2 rounded-xl border-3 border-toy-ink bg-toy-yellow px-4 py-2.5 text-sm font-bold text-toy-ink shadow-[0_3px_0_0_var(--toy-ink)] transition-transform hover:brightness-105"
                >
                  <Newspaper className="size-4 shrink-0" strokeWidth={2.5} />
                  <span>Search Google News</span>
                  <ExternalLink className="size-3.5 shrink-0" strokeWidth={2.5} />
                </a>

                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="font-display w-full rounded-xl border-2 border-toy-ink bg-muted py-2 text-sm font-bold text-toy-ink transition-colors hover:bg-muted/80"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </article>
  )
}
