'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, Plus, Trash2, UtensilsCrossed } from 'lucide-react'
import {
  getTodayPlateItems,
  getActiveProfileName,
  removePlateItem,
  clearTodayPlate,
  type PlateItem,
} from '@/lib/storage'
import { SugarBottle } from './sugar-bottle'
import { MiniMeter } from './mini-meter'
import { ToyButton } from './toy-button'

export function DailyPlateDashboard({
  profileName: initialProfileName,
  onNavigateToScan,
}: {
  profileName?: string
  onNavigateToScan: () => void
}) {
  const [items, setItems] = useState<PlateItem[]>([])
  const profileName = initialProfileName || getActiveProfileName()

  useEffect(() => {
    setItems(getTodayPlateItems(profileName))
  }, [profileName])

  // Standard RDA benchmarks: 50g sugar (25g is 50% full), 22g sat fat, 2000mg sodium
  const limits = {
    sugar: 50,
    satFat: 22,
    sodium: 2000,
  }

  // Calculate sum of all items added to the plate today
  const totalSugar = items.reduce((acc, i) => acc + (i.sugar_g || 0), 0)
  const totalSatFat = items.reduce((acc, i) => acc + (i.sat_fat_g || 0), 0)
  const totalSodium = items.reduce((acc, i) => acc + (i.sodium_mg || 0), 0)

  // 25g sugar = 50% full (totalSugar / 50 * 100)
  const sugarPct = Math.round((totalSugar / limits.sugar) * 100 * 10) / 10
  const satFatPct = Math.round((totalSatFat / limits.satFat) * 100 * 10) / 10
  const sodiumPct = Math.round((totalSodium / limits.sodium) * 100 * 10) / 10
  const totalTeaspoons = Math.round((totalSugar / 4.0) * 10) / 10

  const handleRemove = (id: string) => {
    const updated = removePlateItem(id, profileName)
    setItems(updated)
  }

  const handleClear = () => {
    if (confirm(`Clear all items from ${profileName}'s plate today?`)) {
      clearTodayPlate(profileName)
      setItems([])
    }
  }

  // Exceeded indicators
  const exceeded: string[] = []
  if (sugarPct > 100) exceeded.push('Sugar')
  if (satFatPct > 100) exceeded.push('Saturated Fat')
  if (sodiumPct > 100) exceeded.push('Sodium')

  return (
    <section className="flex flex-col gap-6 pb-20" aria-labelledby="dashboard-title">
      {/* 1. Header: Today's Plate for [Profile Name] (Age Toggle REMOVED) */}
      <div className="toy-block flex flex-col items-center gap-2.5 p-5 text-center">
        <div className="flex items-center gap-2">
          <span className="flex size-10 items-center justify-center rounded-2xl border-3 border-toy-ink bg-toy-yellow text-toy-ink shadow-[0_3px_0_0_var(--toy-ink)]">
            <UtensilsCrossed className="size-5" />
          </span>
          <h2 id="dashboard-title" className="font-display text-2xl sm:text-3xl font-bold text-toy-ink text-balance">
            Today&apos;s Plate for {profileName}
          </h2>
        </div>

        <p className="text-sm font-semibold text-muted-foreground">
          Combined daily intake from packaged foods scanned today.
        </p>

        {items.length > 0 && (
          <div
            className={`font-display mt-1 w-full rounded-2xl border-3 border-toy-ink px-4 py-2 text-xs sm:text-sm font-bold shadow-[0_3px_0_0_var(--toy-ink)] ${
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
              : '✅ Packaged food intake within daily limits'}
          </div>
        )}
      </div>

      {/* 2. Big Sugar Jar - Fills up based on sum of all items today (25g = 50% full) */}
      <SugarBottle
        percentage={sugarPct}
        teaspoons={totalTeaspoons}
        grams={Math.round(totalSugar * 10) / 10}
        limitG={limits.sugar}
      />

      {/* 3. Salt Shaker and Saturated Fat Tube */}
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

      {/* 4. Below the jars: List the scanned items (e.g., 'Hershey's Syrup - 4.8 tsp') */}
      <div className="toy-block p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-bold text-toy-ink">
            Scanned Items ({items.length})
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
            <p className="font-display text-base font-bold text-toy-ink">No items on {profileName}&apos;s plate yet!</p>
            <p className="text-xs font-semibold text-muted-foreground max-w-xs">
              Scan a food label in the scanner and tap &quot;Add to {profileName}&apos;s Plate&quot;.
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
                  className="flex items-center justify-between rounded-xl border-2 border-toy-ink bg-[#f8fbff] p-3 text-toy-ink shadow-[0_2px_0_0_var(--toy-ink)]"
                >
                  <div className="flex flex-col min-w-0 pr-2">
                    {/* Display item as requested: Product Name - X tsp */}
                    <span className="font-display font-bold text-base text-toy-ink truncate">
                      {item.product} - {item.teaspoons} tsp
                    </span>
                    <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] font-bold text-muted-foreground">
                      <span className="rounded bg-toy-yellow/30 px-1.5 py-0.5 text-toy-ink">
                        🍬 {item.sugar_g}g sugar
                      </span>
                      <span className="rounded bg-toy-orange/20 px-1.5 py-0.5 text-toy-ink">
                        🧈 {item.sat_fat_g}g fat
                      </span>
                      <span className="rounded bg-sky-200 px-1.5 py-0.5 text-toy-ink">
                        🧂 {item.sodium_mg}mg salt
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

      {/* 5. Required Disclaimer at the Bottom */}
      <div className="toy-block border-3 bg-[#fff9ed] p-4 text-center">
        <div className="flex items-center justify-center gap-1.5 text-toy-orange font-bold text-xs uppercase tracking-wider mb-1">
          <AlertCircle className="size-4" />
          <span>Tracker Disclaimer</span>
        </div>
        <p className="text-xs font-semibold leading-relaxed text-toy-ink/80 text-pretty">
          This total reflects only packaged foods scanned by LabelLens. Home-cooked meals and unlabelled foods are not included.
        </p>
      </div>
    </section>
  )
}
