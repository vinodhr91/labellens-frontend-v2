'use client'

import { motion } from 'framer-motion'

function stampColor(verdict: string) {
  const v = verdict.toLowerCase()
  if (/(exceed|high|danger|avoid|over|❌|🚫|🔴|🚨)/.test(v)) return 'var(--toy-red)'
  if (/(moderate|caution|close|near|medium|⚠|⚠️)/.test(v)) return 'var(--toy-orange)'
  return 'var(--toy-green)'
}

export function VerdictStamp({ verdict }: { verdict: string }) {
  const color = stampColor(verdict)
  return (
    <motion.div
      initial={{ scale: 3.2, rotate: -22, opacity: 0 }}
      animate={{ scale: 1, rotate: -5, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 520, damping: 14, mass: 1.4, delay: 0.25 }}
      className="w-full"
    >
      <motion.p
        role="status"
        animate={{ x: [0, -6, 6, -4, 4, 0] }}
        transition={{ delay: 0.55, duration: 0.35 }}
        style={{ color, borderColor: color }}
        className="font-display mx-auto w-fit max-w-full rounded-2xl border-[6px] border-double bg-white/95 px-5 py-3 text-center text-2xl font-bold uppercase leading-tight tracking-wide shadow-[0_10px_0_0_rgb(30_42_74/0.25)] text-balance"
      >
        {verdict}
      </motion.p>
    </motion.div>
  )
}
