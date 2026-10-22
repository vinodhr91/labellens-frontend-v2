'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Check, CheckCircle2, RotateCcw, Utensils, Users, X } from 'lucide-react'
import { findMetric, toNumber, type AnalysisResult } from '@/lib/scanner'
import { addProductToProfilePlate, getActiveProfile, getActiveProfileName } from '@/lib/storage'
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

export type AgeBracket = '1-3' | '4-6' | '7-9' | '10+'

const AGE_BRACKET_CONFIG: Record<
  AgeBracket,
  { sugar: number; satFat: number; sodium: number; label: string; name: string }
> = {
  '1-3': { sugar: 27, satFat: 12, sodium: 800, label: 'Age 1–3', name: 'Toddler (1–3)' },
  '4-6': { sugar: 34, satFat: 15, sodium: 1000, label: 'Age 4–6', name: 'Child (4–6)' },
  '7-9': { sugar: 42, satFat: 18, sodium: 1200, label: 'Age 7–9', name: 'Child (7–9)' },
  '10+': { sugar: 50, satFat: 22, sodium: 2000, label: 'Age 10 and over', name: 'Adult (10+)' },
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
  const activeProfile = getActiveProfile()

  // Category of the active profile (1-3, 4-6, 7-9, 10+)
  const profileAgeBracket: AgeBracket = (() => {
    const raw = (activeProfile?.age_group || '').toLowerCase()
    if (raw.includes('1-3') || raw.includes('under')) return '1-3'
    if (raw.includes('4-6')) return '4-6'
    if (raw.includes('7-9')) return '7-9'
    if (raw.includes('10')) return '10+'
    const demo = (result.demographic || '').toLowerCase()
    if (demo.includes('1-3') || demo.includes('under')) return '1-3'
    if (demo.includes('4-6')) return '4-6'
    if (demo.includes('7-9')) return '7-9'
    return '10+'
  })()

  // BUG-19: 4-Way Selector for exact age brackets (1-3, 4-6, 7-9, 10+)
  const [selectedAgeBracket, setSelectedAgeBracket] = useState<AgeBracket>(profileAgeBracket)

  // Standard RDA limits for selected bracket (from ICMR-NIN / WHO / FSSAI)
  const limits = AGE_BRACKET_CONFIG[selectedAgeBracket]

  // Badge text: Show active profile name, or '(What-If)' if age toggle is flipped to a different bracket
  const isWhatIf = selectedAgeBracket !== profileAgeBracket
  const badgeText = isWhatIf
    ? `Breakdown for: ${limits.name} (What-If)`
    : `Breakdown for: ${profileName}`

  // State for Daily Plate action & Toast
  const [addedToPlate, setAddedToPlate] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [showMismatchModal, setShowMismatchModal] = useState(false)

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

  // Recalculated percentages based on active 4-way selectedAgeBracket
  const sugarPct = Math.round((sugarGrams / limits.sugar) * 100 * 10) / 10
  const satFatPct = Math.round((satFatGrams / limits.satFat) * 100 * 10) / 10
  const sodiumPct = Math.round((sodiumMg / limits.sodium) * 100 * 10) / 10
  const sugarTeaspoons = Math.round((sugarGrams / 4.0) * 10) / 10

  // Verdict Banner Color Logic:
  // - If the highest metric percentage is > 100%, show Red banner: '🚨 EXCEEDS DAILY LIMITS'
  // - If the highest metric percentage is between 25% and 100% (inclusive), show Orange banner: '⚠️ HIGH LEVELS DETECTED'
  // - If the highest metric percentage is < 25%, show Green banner: '✅ WITHIN DAILY LIMITS'
  const maxPct = Math.max(sugarPct, satFatPct, sodiumPct)
  let dynamicVerdict: string
  if (maxPct > 100) {
    dynamicVerdict = '🚨 EXCEEDS DAILY LIMITS'
  } else if (maxPct >= 25) {
    dynamicVerdict = '⚠️ HIGH LEVELS DETECTED'
  } else {
    dynamicVerdict = '✅ WITHIN DAILY LIMITS'
  }

  // Execute add to profile plate
  const performAddToPlate = () => {
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

  // Handle click on Add to Plate button with mismatch check
  const handleAddToPlateClick = () => {
    // Check if user toggled to a different age group than profile
    const isMismatch = selectedAgeBracket !== profileAgeBracket
    if (isMismatch) {
      setShowMismatchModal(true)
      return
    }
    performAddToPlate()
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
        {/* Top Profile / Demographic Badge - Responsive & never cut off on mobile */}
        <div className="w-full max-w-full px-2 flex justify-center">
          <motion.span
            key={badgeText}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="font-display max-w-full text-center px-4 py-1.5 text-sm sm:text-base md:text-lg font-bold text-toy-ink rounded-full border-4 border-toy-ink bg-toy-yellow shadow-[0_3px_0_0_var(--toy-ink)] shrink-0 inline-flex items-center justify-center break-words text-balance"
          >
            {badgeText}
          </motion.span>
        </div>

        {/* BUG-19: 4-Way Age Selector: 1-3, 4-6, 7-9, 10+ */}
        <div className="flex flex-col items-center gap-1.5 w-full">
          <div className="flex items-center gap-1.5 text-toy-ink/75">
            <Users className="size-3.5" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Recalculate For Age</span>
          </div>
          <div className="grid grid-cols-4 gap-1 w-full max-w-sm rounded-2xl border-3 border-toy-ink bg-white p-1 shadow-[0_3px_0_0_var(--toy-ink)]">
            {(['1-3', '4-6', '7-9', '10+'] as const).map((bracket) => {
              const active = selectedAgeBracket === bracket
              return (
                <button
                  key={bracket}
                  type="button"
                  onClick={() => setSelectedAgeBracket(bracket)}
                  className={`font-display cursor-pointer rounded-xl py-1.5 text-center text-xs sm:text-sm font-bold transition-all ${
                    active
                      ? 'border-2 border-toy-ink bg-toy-yellow text-toy-ink shadow-[0_2px_0_0_var(--toy-ink)]'
                      : 'text-toy-ink/60 hover:text-toy-ink'
                  }`}
                >
                  {bracket === '10+' ? '10+ yrs' : `${bracket} yrs`}
                </button>
              )
            })}
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
          onClick={handleAddToPlateClick}
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

      {/* Mismatch Confirmation Modal */}
      <AnimatePresence>
        {showMismatchModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-toy-ink/65 backdrop-blur-xs"
            onClick={() => setShowMismatchModal(false)}
          >
            <motion.div
              initial={{ scale: 0.88, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.88, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 380, damping: 25 }}
              className="toy-block relative w-full max-w-sm bg-white p-6 shadow-2xl text-left"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="mismatch-title"
            >
              <button
                type="button"
                onClick={() => setShowMismatchModal(false)}
                className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full border-2 border-toy-ink bg-muted text-toy-ink transition-transform hover:scale-110 cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="size-4" strokeWidth={3} />
              </button>

              <div className="flex items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border-3 border-toy-ink bg-toy-orange text-white shadow-[0_2px_0_0_var(--toy-ink)]">
                  <AlertTriangle className="size-6" strokeWidth={2.7} />
                </span>
                <h4 id="mismatch-title" className="font-display text-xl font-bold text-toy-ink">
                  Confirm Add to Plate
                </h4>
              </div>

              {/* Exact user requested text */}
              <p className="mt-4 text-sm sm:text-base font-semibold leading-relaxed text-toy-ink text-pretty">
                You are viewing limits for {limits.name}, but your active profile is {profileName}. Add this to {profileName}&apos;s plate?
              </p>

              {/* Requested Buttons: [ Yes ] and [ Cancel ] */}
              <div className="mt-6 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    performAddToPlate()
                    setShowMismatchModal(false)
                  }}
                  className="toy-press font-display flex w-full items-center justify-center gap-2 rounded-2xl border-4 border-toy-ink bg-toy-yellow py-3 text-base font-bold text-toy-ink shadow-[0_4px_0_0_var(--toy-ink)] hover:brightness-105 cursor-pointer"
                >
                  <Check className="size-5 stroke-[3]" />
                  <span>Yes</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowMismatchModal(false)}
                  className="font-display w-full rounded-xl border-2 border-toy-ink bg-muted py-2.5 text-sm font-bold text-toy-ink transition-colors hover:bg-muted/80 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
