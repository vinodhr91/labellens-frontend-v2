'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, Clock, Plus, RotateCcw, Trash2, UtensilsCrossed, Users } from 'lucide-react'
import {
  getTodayPlateItems,
  removePlateItem,
  clearTodayPlate,
  type PlateItem,
} from '@/lib/storage'
import { SugarBottle } from './sugar-bottle'
import { MiniMeter } from './mini-meter'
import { ToyButton } from './toy-button'

export function DailyPlateDashboard({
  onNavigateToScan,
}: {
  onNavigateToScan: () => void
}) {
  const [items, setItems] = useState<PlateItem[]>([])
  const [ageMode, setAgeMode] = useState<'adult' | 'child'>('adult')

  useEffect(() => {
    setItems(getTodayPlateItems())
  }, [])

  const limits =
    ageMode === 'adult'
      ? { sugar: 50, satFat: 22, sodium: 2000, label: 'Adult (10+)' }
      : { sugar: 42, satFat: 18, sodium: 1200, label: 'Child (7–9)' }

  // Sum up totals
  const totalSugar = items.reduce((acc, i) => acc + (i.sugar_g || 0), 0)
  const totalSatFat = items.reduce((acc, i) => acc + (i.sat_fat_g || 0), 0)
  const totalSodium = items.reduce((acc, i) => acc + (i.sodium_mg || 0), 0)

  const sugarPct = Math.round((totalSugar / limits.sugar) * 100 * 10) / 10
  const satFatPct = Math.round((totalSatFat / limits.satFat) * 100 * 10) / 10
  const sodiumPct = Math.round((totalSodium / limits.sodium) * 100 * 10) / 10
  const totalTeaspoons = Math.round((totalSugar / 4.0) * 10) / 10

  const handleRemove = (id: string) => {
    const updated = removePlateItem(id)
    setItems(updated)
  }

  const handleClear = () => {
    if (confirm("Clear all items from today's plate?")) {
      clearTodayPlate()
      setItems([])
    }
  }

  // Aggregate verdict
  const exceeded: string[] = []
  if (sugarPct > 100) exceeded.push('Sugar')
  if (satFatPct > 100) exceeded.push('Saturated Fat')
  if (sodiumPct > 100) exceeded.push('Sodium')

  return (
    <section className="flex flex-col gap-6 pb-20" aria-labelledby="dashboard-title">
      {/* Dashboard Top Header */}
      <div className="toy-block flex flex-col items-center gap-3 p-5 text-center">
        <div className="flex items-center gap-2">
          <span className="flex size-10 items-center justify-center rounded-2xl border-3 border-toy-ink bg-toy-yellow text-toy-ink shadow-[0_3px_0_0_var(--toy-ink)]">
            <UtensilsCrossed className="size-5" />
          </span>
          <h2 id="dashboard-title" className="font-display text-3xl font-bold text-toy-ink">
            {"Today's Plate"}
          </h2>
        </div>

        <p className="text-sm font-semibold text-muted-foreground">
          Combined daily intake from all packaged foods you scanned today.
        </p>

        {/* Age Toggle: Child vs Adult */}
        <div className="flex flex-col items-center gap-1.5 pt-1">
          <div className="flex items-center gap-1 text-toy-ink/75 text-xs font-bold uppercase tracking-wider">
            <Users className="size-3.5" />
            <span>Target Daily Limits</span>
          </div>
          <div className="inline-flex rounded-full border-3 border-toy-ink bg-white p-1 shadow-[0_3px_0_0_var(--toy-ink)]">
            <button
              type="button"
              onClick={() => setAgeMode('child')}
              className={`font-display cursor-pointer rounded-full px-3.5 py-1 text-xs font-bold transition-all ${
                ageMode === 'child'
                  ? 'border-2 border-toy-ink bg-toy-yellow text-toy-ink shadow-[0_2px_0_0_var(--toy-ink)]'
                  : 'text-toy-ink/60 hover:text-toy-ink'
              }`}
            >
              👶 Child (7–9)
            </button>
            <button
              type="button"
              onClick={() => setAgeMode('adult')}
              className={`font-display cursor-pointer rounded-full px-3.5 py-1 text-xs font-bold transition-all ${
                ageMode === 'adult'
                  ? 'border-2 border-toy-ink bg-toy-yellow text-toy-ink shadow-[0_2px_0_0_var(--toy-ink)]'
                  : 'text-toy-ink/60 hover:text-toy-ink'
              }`}
            >
              🧑 Adult (10+)
            </button>
          </div>
        </div>

        {/* Overall Status Banner */}
        {items.length > 0 && (
          <div
            className={`font-display mt-2 w-full rounded-2xl border-3 border-toy-ink px-4 py-2 text-sm font-bold shadow-[0_3px_0_0_var(--toy-ink)] ${
              exceeded.length > 0
                ? 'bg-toy-red text-white'
                : sugarPct > 70 || satFatPct > 70 || sodiumPct > 70
                ? 'bg-toy-orange text-white'
                : 'bg-toy-green text-white'
            }`}
          >
            {exceeded.length > 0
              ? `🚨 Exceeded 100% daily limit in ${exceeded.join(' & ')}!`
              : sugarPct > 70 || satFatPct > 70 || sodiumPct > 70
              ? '⚠️ Reaching high intake for packaged snacks today'
              : '✅ Packaged food intake within daily RDA guidelines'}
          </div>
        )}
      </div>

      {/* Aggregate Containers: Sugar Jar */}
      <SugarBottle
        percentage={sugarPct}
        teaspoons={totalTeaspoons}
        grams={Math.round(totalSugar * 10) / 10}
        limitG={limits.sugar}
      />

      {/* Aggregate Containers: Saturated Fat Tube & Salt Shaker */}
      <div className="grid grid-cols-2 gap-4">
        <MiniMeter
          label="Saturated Fat"
          shape="tube"
          percentage={satFatPct}
          delay={0.15}
          detail={`${Math.round(totalSatFat * 10) / 10}g / ${limits.satFat}g`}
        />
        <MiniMeter
          label="Sodium"
          shape="salt"
          percentage={sodiumPct}
          delay={0.25}
          detail={`${Math.round(totalSodium)}mg / ${limits.sodium}mg`}
        />
      </div>

      {/* Scanned Foods List */}
      <div className="toy-block p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-bold text-toy-ink">
            Foods on Plate ({items.length})
          </h3>
          {items.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="text-xs font-bold text-toy-red hover:underline cursor-pointer"
            >
              Clear All
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="my-6 flex flex-col items-center gap-3 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl border-3 border-toy-ink bg-muted text-muted-foreground">
              <UtensilsCrossed className="size-7" />
            </span>
            <p className="font-display text-base font-bold text-toy-ink">Your plate is currently empty!</p>
            <p className="text-xs font-semibold text-muted-foreground max-w-xs">
              Scan a food label in the scanner and tap &quot;Add to Today&apos;s Plate&quot; to see your daily total rise.
            </p>
            <ToyButton onClick={onNavigateToScan} variant="yellow" className="mt-2 text-sm py-2 px-5">
              <Plus className="size-4" strokeWidth={3} />
              Scan a Food Now
            </ToyButton>
          </div>
        ) : (
          <ul className="mt-4 flex flex-col gap-2.5">
            <AnimatePresence>
              {items.map((item) => (
                <motion.li
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center justify-between rounded-xl border-2 border-toy-ink bg-[#f8fbff] p-3 text-toy-ink"
                >
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="font-display font-bold text-sm truncate">{item.product}</span>
                    <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] font-bold text-muted-foreground">
                      <span className="rounded bg-toy-yellow/30 px-1.5 py-0.5 text-toy-ink">
                        🍬 {item.sugar_g}g sugar
                      </span>
                      <span className="rounded bg-toy-orange/20 px-1.5 py-0.5 text-toy-ink">
                        🧈 {item.sat_fat_g}g fat
                      </span>
                      <span className="rounded bg-sky-200 px-1.5 py-0.5 text-toy-ink">
                        🧂 {item.sodium_mg}mg sodium
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemove(item.id)}
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg border-2 border-toy-ink/20 text-muted-foreground hover:border-toy-red hover:bg-toy-red/10 hover:text-toy-red transition-colors cursor-pointer"
                    title="Remove item from plate"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      {/* MANDATORY DISCLAIMER AS REQUESTED */}
      <div className="toy-block border-3 bg-[#fff9ed] p-4 text-center">
        <div className="flex items-center justify-center gap-1.5 text-toy-orange font-bold text-xs uppercase tracking-wider mb-1">
          <AlertCircle className="size-4" />
          <span>Tracker Scope</span>
        </div>
        <p className="text-xs font-semibold leading-relaxed text-toy-ink/80 text-pretty">
          &quot;This total reflects only packaged foods scanned by LabelLens. Home-cooked meals and unlabelled foods are not included.&quot;
        </p>
      </div>
    </section>
  )
}
