'use client'

import { motion } from 'framer-motion'
import { Check, Crown, Sparkles, X } from 'lucide-react'

export function PaywallModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-toy-ink/65 backdrop-blur-xs"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.88, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.88, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 380, damping: 25 }}
        className="toy-block relative w-full max-w-sm bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="paywall-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full border-2 border-toy-ink bg-muted text-toy-ink transition-transform hover:scale-110 cursor-pointer"
          aria-label="Close paywall modal"
        >
          <X className="size-4" strokeWidth={3} />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="relative flex size-14 items-center justify-center rounded-2xl border-4 border-toy-ink bg-toy-yellow shadow-[0_4px_0_0_var(--toy-ink)]">
            <Crown className="size-8 text-toy-ink" strokeWidth={2.5} />
            <Sparkles className="absolute -right-2 -top-2 size-5 text-toy-orange animate-bounce" />
          </div>

          <h3 id="paywall-title" className="font-display mt-4 text-2xl font-bold text-toy-ink">
            Upgrade to LabelLens Pro
          </h3>
          <p className="mt-1 text-sm font-semibold text-muted-foreground text-pretty">
            Upgrade to LabelLens Pro to track multiple family members and unlock personalized nutrition limits.
          </p>

          <div className="mt-5 w-full rounded-2xl border-3 border-toy-ink bg-[#fef7ee] p-4 text-left">
            <p className="text-xs font-bold uppercase tracking-wider text-toy-orange">Pro Family Benefits:</p>
            <ul className="mt-2.5 flex flex-col gap-2 text-sm font-bold text-toy-ink">
              <li className="flex items-center gap-2">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-toy-green text-white">
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
                <span>Track unlimited family member profiles</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-toy-green text-white">
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
                <span>Personalized ICMR/WHO caps for each child</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-toy-green text-white">
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
                <span>Combined Daily Plate family history</span>
              </li>
            </ul>
          </div>

          <div className="mt-6 flex w-full flex-col gap-2.5">
            <button
              type="button"
              onClick={() => {
                alert('🎉 Pro checkout demo! Pro tier unlocked for your testing session.')
                onClose()
              }}
              className="toy-press font-display flex w-full items-center justify-center gap-2 rounded-2xl border-4 border-toy-ink bg-toy-yellow py-3.5 text-base font-bold text-toy-ink shadow-[0_4px_0_0_var(--toy-ink)] hover:brightness-105 cursor-pointer"
            >
              <Crown className="size-5" />
              <span>Unlock LabelLens Pro · ₹199/mo</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="font-display py-2 text-sm font-bold text-muted-foreground hover:text-toy-ink cursor-pointer"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
