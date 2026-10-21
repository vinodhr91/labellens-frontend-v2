'use client'

import { useId } from 'react'
import { motion } from 'framer-motion'
import { levelColor } from '@/lib/scanner'

type Shape = 'bottle' | 'tube' | 'salt'

const SHAPES: Record<Shape, { viewBox: string; path: string; top: number; bottom: number }> = {
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
  salt: {
    viewBox: '0 0 120 220',
    path: 'M42 46 H78 V54 Q84 54 84 62 L96 200 Q98 212 84 212 H36 Q22 212 24 200 L36 62 Q36 54 42 54 Z',
    top: 52,
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
        <pattern id={`salt-grain-${clipId}`} width="8" height="8" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1" fill="white" opacity="0.6" />
          <circle cx="6" cy="6" r="1.1" fill="white" opacity="0.5" />
          <circle cx="6" cy="2" r="0.8" fill="white" opacity="0.4" />
        </pattern>
      </defs>

      <path d={path} fill="#ffffff" />
      <g clipPath={`url(#${clipId})`}>
        <motion.g initial={{ y: bottom + 10 }} animate={{ y: level }} transition={{ duration: 2, ease: [0.22, 1, 0.36, 1], delay: 0.4 }}>
          <g transform="translate(0 -2)">
            <motion.path
              d={WAVE}
              fill={fill}
              opacity={0.65}
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
          {shape === 'salt' && (
            <rect x="0" y="0" width="120" height="220" fill={`url(#salt-grain-${clipId})`} />
          )}
        </motion.g>
        <rect x="0" y="0" width="26" height="220" fill="#ffffff" opacity={0.25} transform="translate(30 0)" />
      </g>
      <path d={path} fill="none" stroke="var(--toy-ink)" strokeWidth={7} strokeLinejoin="round" />
      {shape === 'bottle' && (
        <rect x="39" y="4" width="42" height="18" rx="5" fill="var(--toy-yellow)" stroke="var(--toy-ink)" strokeWidth={6} />
      )}
      {shape === 'tube' && (
        <rect x="22" y="10" width="76" height="12" rx="5" fill="var(--toy-yellow)" stroke="var(--toy-ink)" strokeWidth={6} />
      )}
      {shape === 'salt' && (
        <g>
          {/* Domed metal shaker cap */}
          <path
            d="M36 46 H84 V36 C84 20 74 14 60 14 C46 14 36 20 36 36 Z"
            fill="#dbe5ed"
            stroke="var(--toy-ink)"
            strokeWidth={6}
            strokeLinejoin="round"
          />
          {/* Shaker holes */}
          <circle cx="60" cy="24" r="2.8" fill="var(--toy-ink)" />
          <circle cx="49" cy="31" r="2.4" fill="var(--toy-ink)" />
          <circle cx="71" cy="31" r="2.4" fill="var(--toy-ink)" />
          <circle cx="55" cy="38" r="2.2" fill="var(--toy-ink)" />
          <circle cx="65" cy="38" r="2.2" fill="var(--toy-ink)" />
          {/* Metal shine highlight */}
          <path d="M44 26 C48 20 54 18 60 18" stroke="white" strokeWidth={2.5} strokeLinecap="round" />
          {/* Fluted glass shaker facets */}
          <line x1="48" y1="74" x2="42" y2="198" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.65" />
          <line x1="72" y1="74" x2="78" y2="198" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
        </g>
      )}
    </svg>
  )
}
