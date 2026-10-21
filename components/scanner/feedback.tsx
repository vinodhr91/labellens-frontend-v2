'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ThumbsDown, ThumbsUp, X } from 'lucide-react'
import { ToyButton } from './toy-button'

const REASONS = ['Numbers are wrong', 'Missed ingredients', 'Other'] as const

export function Feedback() {
  const [status, setStatus] = useState<'idle' | 'up' | 'down-sent'>('idle')
  const [open, setOpen] = useState(false)

  return (
    <article className="toy-block p-5 text-center" aria-labelledby="feedback-title">
      <h3 id="feedback-title" className="text-xl font-bold text-toy-ink">
        Was this accurate?
      </h3>
      {status === 'idle' ? (
        <div className="mt-4 flex justify-center gap-4">
          <ToyButton variant="green" onClick={() => setStatus('up')} aria-label="Yes, accurate" className="size-20 p-0">
            <ThumbsUp className="size-9" strokeWidth={2.5} aria-hidden="true" />
          </ToyButton>
          <ToyButton variant="red" onClick={() => setOpen(true)} aria-label="No, not accurate" className="size-20 p-0">
            <ThumbsDown className="size-9" strokeWidth={2.5} aria-hidden="true" />
          </ToyButton>
        </div>
      ) : (
        <motion.p
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="font-display mt-3 text-lg font-semibold text-toy-green"
          role="status"
        >
          {status === 'up' ? 'Yay! Thanks for the thumbs up!' : 'Thanks! Your feedback helps us get better.'}
        </motion.p>
      )}

      <AnimatePresence>
        {open && (
          <FeedbackModal
            onClose={() => setOpen(false)}
            onSubmit={() => {
              setOpen(false)
              setStatus('down-sent')
            }}
          />
        )}
      </AnimatePresence>
    </article>
  )
}

function FeedbackModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (reasons: string[]) => void }) {
  const [selected, setSelected] = useState<string[]>([])
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    dialogRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
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
        aria-labelledby="modal-title"
        tabIndex={-1}
        initial={{ y: 80, scale: 0.9 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 80, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 360, damping: 24 }}
        onClick={(e) => e.stopPropagation()}
        className="toy-block w-full max-w-sm p-5 text-left focus:outline-none"
      >
        <div className="flex items-center justify-between">
          <h4 id="modal-title" className="font-display text-xl font-bold text-toy-ink">
            What went wrong?
          </h4>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-9 items-center justify-center rounded-full border-[3px] border-toy-ink bg-white text-toy-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-toy-yellow"
          >
            <X className="size-5" strokeWidth={3} aria-hidden="true" />
          </button>
        </div>

        <form
          className="mt-4 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit(selected)
          }}
        >
          <fieldset className="flex flex-col gap-2">
            <legend className="sr-only">Select all that apply</legend>
            {REASONS.map((reason) => {
              const checked = selected.includes(reason)
              return (
                <label
                  key={reason}
                  className={`font-display flex cursor-pointer items-center gap-3 rounded-2xl border-[3px] border-toy-ink px-4 py-3 text-lg font-semibold text-toy-ink transition-colors focus-within:ring-4 focus-within:ring-toy-yellow ${
                    checked ? 'bg-toy-yellow' : 'bg-[#eef8ff]'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={() =>
                      setSelected((prev) => (checked ? prev.filter((r) => r !== reason) : [...prev, reason]))
                    }
                  />
                  <span
                    className={`flex size-7 shrink-0 items-center justify-center rounded-lg border-[3px] border-toy-ink ${
                      checked ? 'bg-toy-green' : 'bg-white'
                    }`}
                    aria-hidden="true"
                  >
                    {checked && <Check className="size-4 text-white" strokeWidth={4} />}
                  </span>
                  {reason}
                </label>
              )
            })}
          </fieldset>
          <ToyButton type="submit" disabled={selected.length === 0} className="mt-2 w-full">
            Submit
          </ToyButton>
        </form>
      </motion.div>
    </motion.div>
  )
}
