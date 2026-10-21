'use client'

import { motion } from 'framer-motion'
import { levelColor } from '@/lib/scanner'
import { LiquidGauge } from './liquid-gauge'

export function MiniMeter({
  label,
  percentage,
  delay = 0,
  detail,
  shape = 'tube',
}: {
  label: string
  percentage: number
  delay?: number
  detail?: string
  shape?: 'bottle' | 'tube' | 'salt'
}) {
  const { fill } = levelColor(percentage)
  return (
    <motion.article
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20, delay }}
      className="toy-block flex flex-col items-center gap-2 p-4"
    >
      <h3 className="text-lg font-bold text-toy-ink">{label}</h3>
      <LiquidGauge percentage={percentage} shape={shape} label={label} className="h-32 w-auto" />
      <span className="font-display text-3xl font-bold" style={{ color: fill }}>
        {Math.round(percentage)}%
      </span>
      <span className="-mt-2 text-xs font-semibold text-muted-foreground">of daily limit</span>
      {detail && (
        <span className="font-display rounded-full border-[3px] border-toy-ink bg-[#eef8ff] px-3 py-0.5 text-sm font-bold text-toy-ink">
          {detail}
        </span>
      )}
    </motion.article>
  )
}
