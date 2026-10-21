'use client'

import { useId } from 'react'
import { motion } from 'framer-motion'
import { levelColor } from '@/lib/scanner'

type Shape = 'bottle' | 'tube'

const SHAPES: Record<Shape, { viewBox: string; path: string; top: number; bottom: number; cap?: React.ReactNode }> = {
  bottle: {
    viewBox: '0 0 120 220',
    path: 'M45 18 H75 V42 Q75 52 86 60 Q102 72 102 94 V194 Q102 212 84 212 H36 Q18 212 18 194 V94 Q18 72 34 60 Q45 52 45 42 Z',
    top: 50,
    bottom: 212,
  },
  tube: {
    viewBox: '0 0 120 220',
    path: 'M30 18 H90 V178 Q90 212 60 212 Q30 212 30 178 Z',
    top: 18,
    bottom: 212,
  },
}

const WAVE = 'M0 0 Q15 -7 30 0 T60 0 T90 0 T120 0 T150 0 T180 0 T210 0 T240 0 V400 H0 Z'

export function LiquidGauge({
  percentage,
  shape = 'bottle',
  className,
  label,
}: {
  percentage: number
  shape?: Shape
  className?: string
  label: string
}) {
  const clipId = `gauge-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const { viewBox, path, top, bottom } = SHAPES[shape]
  // Ensure minimum 5% visual fill if value > 0 so the liquid is visible above the bottom curve
  const visualPct = percentage > 0 ? Math.max(5, Math.min(100, percentage)) : 0
  const level = bottom - ((bottom - top) * visualPct) / 100
  const { fill } = levelColor(percentage)

  return (
    <svg viewBox={viewBox} className={className} role="img" aria-label={`${label}: ${Math.round(percentage)}% of daily limit`}>
      <defs>
        <clipPath id={clipId}>
          <path d={path} />
        </clipPath>
      </defs>

      <path d={path} fill="#ffffff" />
      <g clipPath={`url(#${clipId})`}>
        <motion.g initial={{ y: bottom + 10 }} animate={{ y: level }} transition={{ duration: 2, ease: [0.22, 1, 0.36, 1], delay: 0.4 }}>
          <g transform="translate(0 -2)">
            <motion.path
              d={WAVE}
              fill={fill}
              opacity={0.5}
              animate={{ x: [-60, 0] }}
              transition={{ duration: 2.4, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
            />
          </g>
          <g transform="translate(0 4)">
            <motion.path
              d={WAVE}
              fill={fill}
              animate={{ x: [0, -60] }}
              transition={{ duration: 1.6, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
            />
          </g>
        </motion.g>
        <rect x="0" y="0" width="26" height="220" fill="#ffffff" opacity={0.25} transform="translate(30 0)" />
      </g>
      <path d={path} fill="none" stroke="var(--toy-ink)" strokeWidth={7} strokeLinejoin="round" />
      {shape === 'bottle' ? (
        <rect x="39" y="4" width="42" height="18" rx="5" fill="var(--toy-yellow)" stroke="var(--toy-ink)" strokeWidth={6} />
      ) : (
        <rect x="22" y="10" width="76" height="12" rx="5" fill="var(--toy-yellow)" stroke="var(--toy-ink)" strokeWidth={6} />
      )}
    </svg>
  )
}
