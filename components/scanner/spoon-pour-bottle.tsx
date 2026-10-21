'use client'

import { useId } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

const JAR_PATH =
  'M58 74 H142 V86 C148 86 152 90 152 98 V238 C152 248 144 252 134 252 H66 C56 252 48 248 48 238 V98 C48 90 52 86 58 86 Z'
const FILL_BOTTOM = 252
const FILL_TOP = 98
const FILL_RANGE = FILL_BOTTOM - FILL_TOP

const TILT_START = 0.5
const POUR_START = 0.9
const POUR_DURATION = 1.8

const GRAINS = [
  { x: 86, delay: 0 },
  { x: 91, delay: 0.12 },
  { x: 88, delay: 0.24 },
  { x: 93, delay: 0.36 },
  { x: 87, delay: 0.48 },
  { x: 90, delay: 0.6 },
]

export function SpoonPourBottle({
  percentage,
  color,
  className,
}: {
  percentage: number
  color: string
  className?: string
}) {
  const uid = useId().replace(/:/g, '')
  const reduce = useReducedMotion()
  const pct = Math.max(0, Math.min(100, percentage))
  const fillHeight = (FILL_RANGE * pct) / 100
  const fillY = FILL_BOTTOM - fillHeight

  return (
    <svg
      viewBox="0 0 200 262"
      className={className}
      role="img"
      aria-label={`Sugar jar filled to ${Math.round(percentage)}% of the daily limit`}
    >
      <defs>
        <clipPath id={`jar-${uid}`}>
          <path d={JAR_PATH} />
        </clipPath>
        <pattern id={`grain-${uid}`} width="10" height="10" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="3" r="1.3" fill="white" opacity="0.55" />
          <circle cx="7" cy="8" r="1.1" fill="white" opacity="0.4" />
          <circle cx="8" cy="2" r="0.8" fill="white" opacity="0.35" />
        </pattern>
      </defs>

      <path d={JAR_PATH} fill="#eef8ff" />

      <g clipPath={`url(#jar-${uid})`}>
        <motion.rect
          x="44"
          width="112"
          initial={reduce ? false : { y: FILL_BOTTOM, height: 0 }}
          animate={{ y: fillY, height: fillHeight }}
          transition={{ delay: reduce ? 0 : POUR_START, duration: reduce ? 0 : POUR_DURATION, ease: 'easeOut' }}
          fill={color}
        />
        <motion.rect
          x="44"
          width="112"
          initial={reduce ? false : { y: FILL_BOTTOM, height: 0 }}
          animate={{ y: fillY, height: fillHeight }}
          transition={{ delay: reduce ? 0 : POUR_START, duration: reduce ? 0 : POUR_DURATION, ease: 'easeOut' }}
          fill={`url(#grain-${uid})`}
        />
        <line
          x1="48"
          x2="152"
          y1={FILL_TOP}
          y2={FILL_TOP}
          stroke="var(--toy-ink)"
          strokeWidth="2.5"
          strokeDasharray="6 5"
          opacity="0.4"
        />
      </g>

      {/* Jar Outer Outline */}
      <path d={JAR_PATH} fill="none" stroke="var(--toy-ink)" strokeWidth="6" strokeLinejoin="round" />

      {/* Cylindrical Kitchen Jar Lid with Grips */}
      <rect x="52" y="60" width="96" height="15" rx="4" fill="white" stroke="var(--toy-ink)" strokeWidth="5" />
      <line x1="72" y1="63" x2="72" y2="72" stroke="var(--toy-ink)" strokeWidth="2" strokeLinecap="round" opacity="0.35" />
      <line x1="86" y1="63" x2="86" y2="72" stroke="var(--toy-ink)" strokeWidth="2" strokeLinecap="round" opacity="0.35" />
      <line x1="100" y1="63" x2="100" y2="72" stroke="var(--toy-ink)" strokeWidth="2" strokeLinecap="round" opacity="0.35" />
      <line x1="114" y1="63" x2="114" y2="72" stroke="var(--toy-ink)" strokeWidth="2" strokeLinecap="round" opacity="0.35" />
      <line x1="128" y1="63" x2="128" y2="72" stroke="var(--toy-ink)" strokeWidth="2" strokeLinecap="round" opacity="0.35" />

      {/* Glass Cylindrical Body Highlights */}
      <path d="M56 106 V230" stroke="white" strokeWidth="6" strokeLinecap="round" opacity="0.75" />
      <path d="M66 118 V216" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />

      {!reduce &&
        GRAINS.map((g, i) => (
          <motion.circle
            key={i}
            cx={g.x}
            r="3.2"
            fill="white"
            stroke="var(--toy-ink)"
            strokeWidth="1.5"
            initial={{ cy: 60, opacity: 0 }}
            animate={{ cy: [60, Math.max(fillY, 110)], opacity: [0, 1, 1, 0] }}
            transition={{
              delay: POUR_START + g.delay,
              duration: 0.55,
              ease: 'easeIn',
              repeat: 2,
              repeatDelay: 0.15,
            }}
          />
        ))}

      {!reduce && (
        <motion.g
          initial={{ x: 60, y: -40, rotate: 0, opacity: 0 }}
          animate={{
            x: [60, 0, 0, 0, 30],
            y: [-40, 0, 0, 0, -30],
            rotate: [0, 0, -22, -22, 0],
            opacity: [0, 1, 1, 1, 0],
          }}
          transition={{
            duration: POUR_START + POUR_DURATION + 0.6,
            times: [0, TILT_START / 3.3, POUR_START / 3.3, (POUR_START + POUR_DURATION) / 3.3, 1],
            ease: 'easeInOut',
          }}
          style={{ originX: 0.96, originY: 0.5 }}
          aria-hidden="true"
        >
          <Spoon />
        </motion.g>
      )}
    </svg>
  )
}

function Spoon() {
  return (
    <g>
      <rect x="108" y="16" width="86" height="10" rx="5" fill="#c9d6e3" stroke="var(--toy-ink)" strokeWidth="4" />
      <ellipse cx="94" cy="21" rx="20" ry="12" fill="#e4edf5" stroke="var(--toy-ink)" strokeWidth="4" />
      <ellipse cx="92" cy="17" rx="12" ry="5" fill="white" />
      <circle cx="86" cy="17" r="2.4" fill="white" stroke="var(--toy-ink)" strokeWidth="1.2" />
      <circle cx="93" cy="15" r="2.4" fill="white" stroke="var(--toy-ink)" strokeWidth="1.2" />
      <circle cx="99" cy="17" r="2.4" fill="white" stroke="var(--toy-ink)" strokeWidth="1.2" />
      <path d="M118 19 H180" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
    </g>
  )
}
