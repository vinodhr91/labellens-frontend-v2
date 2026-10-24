'use client'

import { useEffect } from 'react'
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion'
import { levelColor, toNumber } from '@/lib/scanner'
import { SpoonPourBottle } from './spoon-pour-bottle'

export function SugarBottle({
  percentage,
  teaspoons,
  grams,
  limitG,
  wholePackTeaspoons,
}: {
  percentage: number
  teaspoons?: number | string
  grams?: number | string
  limitG?: number | string
  wholePackTeaspoons?: number | null
}) {
  const { fill, label } = levelColor(percentage)
  const tsp = teaspoons != null ? Math.round(toNumber(teaspoons) * 10) / 10 : null

  return (
    <article className="toy-block p-5" aria-labelledby="sugar-title">
      <div className="flex items-center justify-between">
        <h3 id="sugar-title" className="text-2xl font-bold text-toy-ink">
          Sugar
        </h3>
        <span
          className="font-display rounded-full border-[3px] border-toy-ink px-3 py-0.5 text-sm font-bold text-white"
          style={{ backgroundColor: fill }}
        >
          {label}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-4">
        <SpoonPourBottle percentage={percentage} color={fill} className="h-64 w-auto shrink-0" />
        <div className="flex min-w-0 flex-col">
          <span
            className="font-display text-7xl font-bold leading-none text-toy-ink tabular-nums"
            style={{ textShadow: `0 4px 0 ${fill}` }}
          >
            {tsp == null ? '—' : <CountUp value={tsp} />}
          </span>
          <span className="font-display mt-1 text-xl font-bold text-toy-ink">teaspoons</span>
          {limitG != null && limitG !== '' && (
            <span className="font-display mt-2 w-fit rounded-full border-[3px] border-toy-ink bg-[#eef8ff] px-3 py-0.5 text-sm font-bold text-toy-ink">
              Limit: {limitG}g
            </span>
          )}
          {wholePackTeaspoons != null && wholePackTeaspoons > 0 && (
            <span className="font-display mt-1 text-xs sm:text-sm font-bold text-toy-ink">
              Whole Pack: <strong className="text-toy-red font-black">{wholePackTeaspoons} teaspoons</strong>
            </span>
          )}
          <span className="mt-3 text-sm font-semibold text-muted-foreground">
            <strong className="text-toy-ink">{Math.round(percentage)}%</strong> of the daily limit
            {grams != null && ` · ${grams} g`}
          </span>
        </div>
      </div>
    </article>
  )
}

function CountUp({ value }: { value: number }) {
  const reduce = useReducedMotion()
  const count = useMotionValue(reduce ? value : 0)
  const display = useTransform(count, (v): string => (Number.isInteger(value) ? String(Math.round(v)) : v.toFixed(1)))

  useEffect(() => {
    if (reduce) {
      count.set(value)
      return
    }
    const controls = animate(count, value, { duration: 1.8, delay: 0.9, ease: 'easeOut' })
    return () => controls.stop()
  }, [count, value, reduce])

  return <motion.span>{display}</motion.span>
}
