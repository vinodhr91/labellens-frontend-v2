'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, CheckCircle2, RotateCcw, Utensils, Users } from 'lucide-react'
import { findMetric, toNumber, type AnalysisResult } from '@/lib/scanner'
import { addProductToProfilePlate, getActiveProfileName } from '@/lib/storage'
import { ToyButton } from './toy-button'
import { VerdictStamp } from './verdict-stamp'
import { SugarBottle } from './sugar-bottle'
import { MiniMeter } from './mini-meter'
import { NutrientsGrid } from './nutrients-grid'
import { HiddenIngredients } from './hidden-ingredients'
import { Citations } from './citations'
import { Feedback } from './feedback'

function ratio(value: unknown, limit: unknown, unit: string) {
  const has = (v: unknown) => v != null && v !== ''
  if (!has(value) && !has(limit)) return undefined
  return `${has(value) ? value : '—'}${unit} / ${has(limit) ? limit : '—'}${unit}`
}

export function StepResults({
  result,
  profileName: initialProfileName,
  onRestart,
  onViewPlate,
  onPlateUpdated,
}: {
  result: AnalysisResult
  profileName?: string
  onRestart: () => void
  onViewPlate?: () => void
  onPlateUpdated?: () => void
}) {
  const profileName = initialProfileName || getActiveProfileName()

  // Determine initial age mode based on scanned demographic
  const [ageMode, setAgeMode] = useState<'adult' | 'child'>(() => {
    const demo = (result.demographic || '').toLowerCase()
    if (
      demo.includes('1-3') ||
      demo.includes('4-6') ||
      demo.includes('7-9') ||
      demo.includes('under') ||
      demo.includes('child')
    ) {
      return 'child'
    }
    return 'adult'
  })

  // State for Daily Plate action & Toast
  const [addedToPlate, setAddedToPlate] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Raw nutrient values from analysis
  const rawSugar = findMetric(result.breakdown, ['sugar', 'sugars', 'total_sugar', 'added_sugar'])
  const rawSatFat = findMetric(result.breakdown, ['saturated_fat', 'sat_fat', 'saturatedFat', 'saturated fat'])
  const rawSodium = findMetric(result.breakdown, ['sodium', 'salt'])

  // Actual nutrient values per serving
  const sugarGrams = toNumber(
    rawSugar?.value_g ??
      rawSugar?.grams ??
      (rawSugar?.percentage ? (toNumber(rawSugar.percentage) * toNumber(rawSugar.limit_g || 50)) / 100 : 0)
  )
  const satFatGrams = toNumber(
    rawSatFat?.value_g ??
      rawSatFat?.grams ??
      (rawSatFat?.percentage ? (toNumber(rawSatFat.percentage) * toNumber(rawSatFat.limit_g || 22)) / 100 : 0)
  )
  const sodiumMg = toNumber(
    rawSodium?.value_mg ??
      rawSodium?.mg ??
      (rawSodium?.percentage ? (toNumber(rawSodium.percentage) * toNumber(rawSodium.limit_mg || 2000)) / 100 : 0)
  )

  // Standard RDA limits for adult (FSSAI/WHO) vs child (ICMR-NIN)
  const limits =
    ageMode === 'adult'
      ? { sugar: 50, satFat: 22, sodium: 2000, label: 'Age 10 and over (Adult Limits)' }
      : { sugar: 42, satFat: 18, sodium: 1200, label: 'Age 7–9 (Child Limits)' }

  // Recalculated percentages based on active ageMode
  const sugarPct = Math.round((sugarGrams / limits.sugar) * 100 * 10) / 10
  const satFatPct = Math.round((satFatGrams / limits.satFat) * 100 * 10) / 10
  const sodiumPct = Math.round((sodiumMg / limits.sodium) * 100 * 10) / 10
  const sugarTeaspoons = Math.round((sugarGrams / 4.0) * 10) / 10

  // Dynamic verdict based on recalculation
  const flags: string[] = []
  if (sugarPct > 50) flags.push('High Sugar')
  if (satFatPct > 50) flags.push('High Saturated Fat')
  if (sodiumPct > 50) flags.push('High Sodium')

  const dynamicVerdict =
    flags.length > 0 ? `⚠️ EXCEEDS DAILY LIMIT: ${flags.join(', ')}` : `✅ WITHIN DAILY LIMITS`

  // Add to Profile's Plate handler
  const handleAddToPlate = () => {
    const res = addProductToProfilePlate(profileName, {
      product: result.product || 'Scanned Food Product',
      serving_size: result.serving_size,
      sugar_g: sugarGrams,
      sat_fat_g: satFatGrams,
      sodium_mg: sodiumMg,
    })

    if (res.success) {
      setAddedToPlate(true)
      setToastMessage(`🍽️ Added to ${profileName}'s Plate! (${res.totalItems} items today)`)
      if (onPlateUpdated) onPlateUpdated()
      setTimeout(() => setToastMessage(null), 4000)
    }
  }

  return (
    <section className="flex flex-col gap-6" aria-labelledby="results-title">
      <h2 id="results-title" className="sr-only">
        Scan results
      </h2>

      {/* Floating Success Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-5 left-4 right-4 z-50 mx-auto max-w-sm rounded-2xl border-3 border-toy-ink bg-toy-green px-4 py-3 text-white shadow-xl flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold">
              <CheckCircle2 className="size-5 shrink-0" />
              <span>{toastMessage}</span>
            </div>
            {onViewPlate && (
              <button
                type="button"
                onClick={onViewPlate}
                className="font-display shrink-0 rounded-lg border-2 border-white bg-white/20 px-2.5 py-1 text-xs font-black text-white hover:bg-white hover:text-toy-green transition-colors cursor-pointer"
              >
                View Plate
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col items-center gap-4">
        {/* Top Demographic Badge - Responsive & never cut off on mobile */}
        <div className="w-full max-w-full px-2 flex justify-center">
          <motion.span
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="font-display max-w-full text-center px-4 py-1.5 text-sm sm:text-base md:text-lg font-bold text-toy-ink rounded-full border-4 border-toy-ink bg-toy-yellow shadow-[0_3px_0_0_var(--toy-ink)] shrink-0 inline-flex items-center justify-center break-words text-balance"
          >
            {result.demographic ? `${result.demographic} · ${limits.label}` : limits.label}
          </motion.span>
        </div>

        {/* Age Toggle Switch: Child vs Adult */}
        <div className="flex flex-col items-center gap-1.5 w-full">
          <div className="flex items-center gap-1.5 text-toy-ink/75">
            <Users className="size-3.5" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Recalculate For</span>
          </div>
          <div className="inline-flex rounded-full border-3 border-toy-ink bg-white p-1 shadow-[0_3px_0_0_var(--toy-ink)]">
            <button
              type="button"
              onClick={() => setAgeMode('child')}
              className={`font-display cursor-pointer rounded-full px-4 py-1 text-xs sm:text-sm font-bold transition-all ${
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
              className={`font-display cursor-pointer rounded-full px-4 py-1 text-xs sm:text-sm font-bold transition-all ${
                ageMode === 'adult'
                  ? 'border-2 border-toy-ink bg-toy-yellow text-toy-ink shadow-[0_2px_0_0_var(--toy-ink)]'
                  : 'text-toy-ink/60 hover:text-toy-ink'
              }`}
            >
              🧑 Adult (10+)
            </button>
          </div>
        </div>

        {(result.product || result.serving_size) && (
          <div className="flex flex-col items-center gap-2">
            {result.product && result.product !== 'Unknown' && (
              <p className="font-display text-center text-2xl font-bold text-white [text-shadow:0_3px_0_var(--toy-ink)] text-balance">
                {result.product}
              </p>
            )}
            {result.serving_size && (
              <span className="font-display rounded-full border-[3px] border-toy-ink bg-white px-4 py-1 text-sm font-bold text-toy-ink">
                Serving Size: {result.serving_size}
              </span>
            )}
          </div>
        )}

        <VerdictStamp verdict={dynamicVerdict} />
      </div>

      {/* Main Sugar Kitchen Jar */}
      <SugarBottle
        percentage={sugarPct}
        teaspoons={sugarTeaspoons}
        grams={sugarGrams}
        limitG={limits.sugar}
      />

      {/* Saturated Fat Tube & Sodium Salt Shaker */}
      <div className="grid grid-cols-2 gap-4">
        <MiniMeter
          label="Saturated Fat"
          shape="tube"
          percentage={satFatPct}
          delay={0.15}
          detail={ratio(satFatGrams, limits.satFat, 'g')}
        />
        <MiniMeter
          label="Sodium"
          shape="salt"
          percentage={sodiumPct}
          delay={0.25}
          detail={ratio(sodiumMg, limits.sodium, 'mg')}
        />
      </div>

      {/* 3. Add to [Profile Name]'s Plate Button */}
      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
        <button
          type="button"
          onClick={handleAddToPlate}
          className={`toy-press font-display flex w-full items-center justify-center gap-2.5 rounded-2xl border-4 border-toy-ink py-4 text-lg font-bold shadow-[0_4px_0_0_var(--toy-ink)] transition-all cursor-pointer ${
            addedToPlate
              ? 'bg-toy-green text-white'
              : 'bg-toy-yellow text-toy-ink hover:brightness-105'
          }`}
        >
          {addedToPlate ? (
            <>
              <Check className="size-6 stroke-[3]" />
              <span>Added to {profileName}&apos;s Plate!</span>
            </>
          ) : (
            <>
              <Utensils className="size-6 stroke-[2.5]" />
              <span>🍽️ Add to {profileName}&apos;s Plate</span>
            </>
          )}
        </button>
      </motion.div>

      {result.other_nutrients && <NutrientsGrid nutrients={result.other_nutrients} />}

      {/* Clickable Hidden Ingredients with Explanations and Google News search */}
      <HiddenIngredients hidden={result.hidden_ingredients} raw={result.raw_ingredients} />

      {/* Pixar-style Scientific Sources Modal */}
      {result.citations && result.citations.length > 0 && <Citations citations={result.citations} />}

      <Feedback />

      <ToyButton variant="yellow" onClick={onRestart} className="w-full">
        <RotateCcw className="size-6" strokeWidth={3} aria-hidden="true" />
        Scan another
      </ToyButton>

      {result.disclaimer && (
        <p className="px-2 text-center text-xs leading-relaxed text-toy-ink/70 text-pretty">{result.disclaimer}</p>
      )}
    </section>
  )
}
