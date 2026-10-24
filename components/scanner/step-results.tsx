'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Check, CheckCircle2, RotateCcw, Utensils, Users, X } from 'lucide-react'
import { findMetric, toNumber, type AnalysisResult, type ProductAnalysis } from '@/lib/scanner'
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

function calculateNutrients(
  productData: ProductAnalysis,
  limits: { sugar: number; satFat: number; sodium: number }
) {
  const rawSugar = findMetric(productData.breakdown, ['sugar', 'sugars', 'total_sugar', 'added_sugar'])
  const rawSatFat = findMetric(productData.breakdown, ['saturated_fat', 'sat_fat', 'saturatedFat', 'saturated fat'])
  const rawSodium = findMetric(productData.breakdown, ['sodium', 'salt'])

  const sugarGrams = toNumber(
    rawSugar?.value_g ??
      rawSugar?.grams ??
      (rawSugar?.percentage ? (toNumber(rawSugar.percentage) * toNumber(rawSugar.limit_g || limits.sugar)) / 100 : 0)
  )
  const satFatGrams = toNumber(
    rawSatFat?.value_g ??
      rawSatFat?.grams ??
      (rawSatFat?.percentage ? (toNumber(rawSatFat.percentage) * toNumber(rawSatFat.limit_g || limits.satFat)) / 100 : 0)
  )
  const sodiumMg = toNumber(
    rawSodium?.value_mg ??
      rawSodium?.mg ??
      (rawSodium?.percentage ? (toNumber(rawSodium.percentage) * toNumber(rawSodium.limit_mg || limits.sodium)) / 100 : 0)
  )

  const sugarPct = Math.round((sugarGrams / limits.sugar) * 100 * 10) / 10
  const satFatPct = Math.round((satFatGrams / limits.satFat) * 100 * 10) / 10
  const sodiumPct = Math.round((sodiumMg / limits.sodium) * 100 * 10) / 10
  const sugarTeaspoons = Math.round((sugarGrams / 4.0) * 10) / 10

  const maxPct = Math.max(sugarPct, satFatPct, sodiumPct)
  let dynamicVerdict: string
  if (limits.sugar === 0 && (sugarGrams > 0 || sodiumMg > 0)) {
    dynamicVerdict = '🚨 NOT RECOMMENDED FOR INFANTS'
  } else if (maxPct > 100) {
    dynamicVerdict = '🚨 EXCEEDS DAILY LIMITS'
  } else if (maxPct >= 25) {
    dynamicVerdict = '⚠️ MODERATE LEVELS'
  } else {
    dynamicVerdict = '✅ WITHIN DAILY LIMITS'
  }

  return {
    sugarGrams,
    satFatGrams,
    sodiumMg,
    sugarPct,
    satFatPct,
    sodiumPct,
    sugarTeaspoons,
    dynamicVerdict,
  }
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

  // 4-Way Selector for exact age brackets (1-3, 4-6, 7-9, 10+)
  const [selectedAgeBracket, setSelectedAgeBracket] = useState<AgeBracket>(profileAgeBracket)

  // Standard RDA limits for selected bracket (from ICMR-NIN / WHO / FSSAI)
  const limits = AGE_BRACKET_CONFIG[selectedAgeBracket]

  // Badge text: Show active profile name, or '(What-If)' if age toggle is flipped to a different bracket
  const isWhatIf = selectedAgeBracket !== profileAgeBracket
  const badgeText = isWhatIf
    ? `Breakdown for: ${limits.name} (What-If)`
    : `Breakdown for: ${profileName}`

  // Toast and Mismatch modal state
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [pendingAdd, setPendingAdd] = useState<{
    name: string
    sugarG: number
    satFatG: number
    sodiumMg: number
    servingSize?: string
  } | null>(null)

  // Single scan added state
  const [singleAdded, setSingleAdded] = useState(false)

  // Check if compare mode
  const productA = result.product_a || result
  const productB = result.product_b || null
  const isCompareMode = Boolean(productB)

  // Calculate metrics for Product A and Product B
  const calcsA = calculateNutrients(productA, limits)
  const calcsB = productB ? calculateNutrients(productB, limits) : null

  // Execute add to profile plate
  const performAddToPlate = (
    productName: string,
    sugarG: number,
    satFatG: number,
    sodiumMg: number,
    servingSize?: string
  ) => {
    const res = addProductToProfilePlate(profileName, {
      product: productName || 'Scanned Food Product',
      serving_size: servingSize,
      sugar_g: sugarG,
      sat_fat_g: satFatG,
      sodium_mg: sodiumMg,
    })

    if (res.success) {
      setToastMessage(`🍽️ Added "${productName}" to ${profileName}'s Plate! (${res.totalItems} items today)`)
      if (onPlateUpdated) onPlateUpdated()
      setTimeout(() => setToastMessage(null), 4000)
    }
  }

  // Trigger add to plate with mismatch check
  const handleRequestAddToPlate = (
    productName: string,
    sugarG: number,
    satFatG: number,
    sodiumMg: number,
    servingSize?: string
  ) => {
    if (selectedAgeBracket !== profileAgeBracket) {
      setPendingAdd({ name: productName, sugarG, satFatG, sodiumMg, servingSize })
      return
    }
    performAddToPlate(productName, sugarG, satFatG, sodiumMg, servingSize)
  }

  return (
    <section className="flex flex-col gap-4 sm:gap-6" aria-labelledby="results-title">
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

      <div className="flex flex-col items-center gap-3">
        {/* Top Profile / Demographic Badge */}
        <div className="w-full max-w-full px-2 flex justify-center">
          <motion.span
            key={badgeText}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="font-display max-w-full text-center px-4 py-1.5 text-xs sm:text-sm md:text-base font-bold text-toy-ink rounded-full border-3 sm:border-4 border-toy-ink bg-toy-yellow shadow-[0_3px_0_0_var(--toy-ink)] shrink-0 inline-flex items-center justify-center break-words text-balance"
          >
            {badgeText}
          </motion.span>
        </div>

        {/* 4-Way Age Selector: 1-3, 4-6, 7-9, 10+ */}
        <div className="flex flex-col items-center gap-1 w-full">
          <div className="flex items-center gap-1.5 text-toy-ink/75">
            <Users className="size-3.5" />
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Recalculate For Age</span>
          </div>
          <div className="grid grid-cols-4 gap-1 w-full max-w-sm rounded-2xl border-3 border-toy-ink bg-white p-1 shadow-[0_3px_0_0_var(--toy-ink)]">
            {(['1-3', '4-6', '7-9', '10+'] as const).map((bracket) => {
              const active = selectedAgeBracket === bracket
              return (
                <button
                  key={bracket}
                  type="button"
                  onClick={() => setSelectedAgeBracket(bracket)}
                  className={`font-display cursor-pointer rounded-xl py-1 sm:py-1.5 text-center text-xs font-bold transition-all ${
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
      </div>

      {/* RESULTS DISPLAY: 2-COLUMN SIDE-BY-SIDE COMPARE OR SINGLE SCAN */}
      {isCompareMode && productB && calcsB ? (
        <div className="flex flex-col gap-4">
          {/* Side-by-Side 2-Column Split: Fits on single mobile screen without scrolling */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full items-stretch">
            {/* Left Column: Product A */}
            <CompareProductColumn
              tag="Product A"
              badgeBg="bg-toy-yellow"
              productData={productA}
              calcs={calcsA}
              limits={limits}
              profileName={profileName}
              onAddToPlate={(name, sugar, fat, sodium, serving) =>
                handleRequestAddToPlate(name, sugar, fat, sodium, serving)
              }
            />

            {/* Right Column: Product B */}
            <CompareProductColumn
              tag="Product B"
              badgeBg="bg-[#eef8ff]"
              productData={productB}
              calcs={calcsB}
              limits={limits}
              profileName={profileName}
              onAddToPlate={(name, sugar, fat, sodium, serving) =>
                handleRequestAddToPlate(name, sugar, fat, sodium, serving)
              }
            />
          </div>

          {/* Hidden Ingredients summary if either product has flags */}
          {(productA.hidden_ingredients?.length || productB.hidden_ingredients?.length) ? (
            <div className="flex flex-col gap-2">
              {productA.hidden_ingredients && productA.hidden_ingredients.length > 0 && (
                <div className="toy-block p-3 bg-white">
                  <p className="text-xs font-bold text-toy-ink mb-1 flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-toy-yellow border border-toy-ink" />
                    <span>Product A Hidden Ingredients:</span>
                  </p>
                  <HiddenIngredients hidden={productA.hidden_ingredients} raw={productA.raw_ingredients} />
                </div>
              )}
              {productB.hidden_ingredients && productB.hidden_ingredients.length > 0 && (
                <div className="toy-block p-3 bg-white">
                  <p className="text-xs font-bold text-toy-ink mb-1 flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-[#eef8ff] border border-toy-ink" />
                    <span>Product B Hidden Ingredients:</span>
                  </p>
                  <HiddenIngredients hidden={productB.hidden_ingredients} raw={productB.raw_ingredients} />
                </div>
              )}
            </div>
          ) : null}
        </div>
      ) : (
        /* Single Scan Results */
        <div className="flex flex-col gap-6">
          {(productA.product || productA.serving_size) && (
            <div className="flex flex-col items-center gap-2">
              {productA.product && productA.product !== 'Unknown' && (
                <p className="font-display text-center text-2xl font-bold text-white [text-shadow:0_3px_0_var(--toy-ink)] text-balance">
                  {productA.product}
                </p>
              )}
              {productA.serving_size && (
                <span className="font-display rounded-full border-[3px] border-toy-ink bg-white px-4 py-1 text-sm font-bold text-toy-ink">
                  Serving Size: {productA.serving_size}
                </span>
              )}
            </div>
          )}

          <VerdictStamp verdict={calcsA.dynamicVerdict} />

          <SugarBottle
            percentage={calcsA.sugarPct}
            teaspoons={calcsA.sugarTeaspoons}
            grams={calcsA.sugarGrams}
            limitG={limits.sugar}
          />

          <div className="grid grid-cols-2 gap-4">
            <MiniMeter
              label="Saturated Fat"
              shape="tube"
              percentage={calcsA.satFatPct}
              delay={0.15}
              detail={ratio(calcsA.satFatGrams, limits.satFat, 'g')}
            />
            <MiniMeter
              label="Sodium"
              shape="salt"
              percentage={calcsA.sodiumPct}
              delay={0.25}
              detail={ratio(calcsA.sodiumMg, limits.sodium, 'mg')}
            />
          </div>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <button
              type="button"
              onClick={() => {
                handleRequestAddToPlate(
                  productA.product || 'Scanned Food Product',
                  calcsA.sugarGrams,
                  calcsA.satFatGrams,
                  calcsA.sodiumMg,
                  productA.serving_size
                )
                setSingleAdded(true)
                setTimeout(() => setSingleAdded(false), 3000)
              }}
              className={`toy-press font-display flex w-full items-center justify-center gap-2.5 rounded-2xl border-4 border-toy-ink py-4 text-lg font-bold shadow-[0_4px_0_0_var(--toy-ink)] transition-all cursor-pointer ${
                singleAdded
                  ? 'bg-toy-green text-white'
                  : 'bg-toy-yellow text-toy-ink hover:brightness-105'
              }`}
            >
              {singleAdded ? (
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

          {productA.other_nutrients && <NutrientsGrid nutrients={productA.other_nutrients} />}

          <HiddenIngredients hidden={productA.hidden_ingredients} raw={productA.raw_ingredients} />
        </div>
      )}

      {/* Mismatch Confirmation Modal */}
      <AnimatePresence>
        {pendingAdd && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-toy-ink/65 backdrop-blur-xs"
            onClick={() => setPendingAdd(null)}
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
                onClick={() => setPendingAdd(null)}
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

              <p className="mt-4 text-sm sm:text-base font-semibold leading-relaxed text-toy-ink text-pretty">
                You are viewing limits for {limits.name}, but your active profile is {profileName}. Add &ldquo;{pendingAdd.name}&rdquo; to {profileName}&apos;s plate?
              </p>

              <div className="mt-6 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    performAddToPlate(
                      pendingAdd.name,
                      pendingAdd.sugarG,
                      pendingAdd.satFatG,
                      pendingAdd.sodiumMg,
                      pendingAdd.servingSize
                    )
                    setPendingAdd(null)
                  }}
                  className="toy-press font-display flex w-full items-center justify-center gap-2 rounded-2xl border-4 border-toy-ink bg-toy-yellow py-3 text-base font-bold text-toy-ink shadow-[0_4px_0_0_var(--toy-ink)] hover:brightness-105 cursor-pointer"
                >
                  <Check className="size-5 stroke-[3]" />
                  <span>Yes, add for {profileName}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPendingAdd(null)}
                  className="font-display w-full rounded-xl border-2 border-toy-ink bg-muted py-2.5 text-sm font-bold text-toy-ink transition-colors hover:bg-muted/80 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Citations & Feedback */}
      {result.citations && result.citations.length > 0 && <Citations citations={result.citations} />}

      <Feedback />

      <ToyButton variant="yellow" onClick={onRestart} className="w-full">
        <RotateCcw className="size-6" strokeWidth={3} aria-hidden="true" />
        Scan another
      </ToyButton>

      {result.disclaimer && (
        <p className="px-2 text-center text-xs leading-relaxed text-toy-ink/70 text-pretty">
          {result.disclaimer}
        </p>
      )}
    </section>
  )
}

function getBarColor(pct: number) {
  if (pct > 100) return 'bg-toy-red'
  if (pct >= 25) return 'bg-toy-orange'
  return 'bg-toy-green'
}

function getTextColor(pct: number) {
  if (pct > 100) return 'text-toy-red'
  if (pct >= 25) return 'text-toy-orange'
  return 'text-toy-green'
}

function CompactVerdictBadge({ verdict }: { verdict: string }) {
  const isExceed = /(exceed|🚨)/i.test(verdict)
  const isModerate = /(moderate|high|⚠️)/i.test(verdict)

  let badgeColor = 'bg-toy-green text-white'
  let text = '✅ WITHIN'

  if (isExceed) {
    badgeColor = 'bg-toy-red text-white'
    text = '🚨 EXCEEDS'
  } else if (isModerate) {
    badgeColor = 'bg-toy-orange text-white'
    text = '⚠️ MODERATE'
  }

  return (
    <div
      className={`font-display rounded-lg border-2 border-toy-ink px-1.5 py-1 text-center text-[11px] sm:text-xs font-black uppercase tracking-wider shadow-[0_2px_0_0_var(--toy-ink)] ${badgeColor}`}
    >
      {text}
    </div>
  )
}

function CompactNutrientBar({
  icon,
  label,
  valueText,
  pct,
  delay = 0,
}: {
  icon: string
  label: string
  valueText: string
  pct: number
  delay?: number
}) {
  const barColor = getBarColor(pct)
  const textColor = getTextColor(pct)
  const fillWidth = Math.min(Math.max(pct, pct > 0 ? 5 : 0), 100)

  return (
    <div className="flex flex-col gap-0.5 w-full">
      <div className="flex items-center justify-between text-[11px] sm:text-xs font-bold leading-tight">
        <span className="text-toy-ink flex items-center gap-1 truncate">
          <span>{icon}</span>
          <span className="truncate">{label}</span>
        </span>
        <span className={`font-black shrink-0 ${textColor}`}>
          {pct}%
        </span>
      </div>

      {/* Progress Track */}
      <div className="h-2.5 sm:h-3 w-full overflow-hidden rounded-full border-[1.5px] border-toy-ink bg-slate-100 shadow-inner">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${fillWidth}%` }}
          transition={{ duration: 0.6, delay, ease: 'easeOut' }}
          className={`h-full rounded-full ${barColor}`}
        />
      </div>

      <div className="text-[10px] font-semibold text-muted-foreground leading-none text-right">
        {valueText}
      </div>
    </div>
  )
}

function CompareProductColumn({
  tag,
  badgeBg,
  productData,
  calcs,
  limits,
  profileName,
  onAddToPlate,
}: {
  tag: string
  badgeBg: string
  productData: ProductAnalysis
  calcs: ReturnType<typeof calculateNutrients>
  limits: { sugar: number; satFat: number; sodium: number }
  profileName: string
  onAddToPlate: (
    name: string,
    sugarG: number,
    satFatG: number,
    sodiumMg: number,
    servingSize?: string
  ) => void
}) {
  const [added, setAdded] = useState(false)
  const hiddenCount = productData.hidden_ingredients?.length || 0

  return (
    <div className="toy-block flex flex-col justify-between gap-2.5 p-2.5 sm:p-3.5 bg-white shadow-md">
      {/* Top: Tag, Product Name & Verdict */}
      <div className="flex flex-col gap-1.5 text-center">
        <div className="flex items-center justify-center">
          <span
            className={`font-display inline-flex items-center rounded-full border-2 border-toy-ink px-2 py-0.5 text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-toy-ink shadow-[0_1.5px_0_0_var(--toy-ink)] ${badgeBg}`}
          >
            {tag}
          </span>
        </div>

        <h3
          title={productData.product || tag}
          className="font-display text-xs sm:text-sm font-bold leading-snug text-toy-ink line-clamp-2 min-h-[2.2rem] flex items-center justify-center text-balance"
        >
          {productData.product || tag}
        </h3>

        {/* Compact Verdict Badge at top of column */}
        <CompactVerdictBadge verdict={calcs.dynamicVerdict} />

        {productData.serving_size && (
          <span className="text-[9px] sm:text-[10px] font-semibold text-muted-foreground truncate">
            Serving: {productData.serving_size}
          </span>
        )}
      </div>

      {/* Middle: Compact Horizontal Progress Bars */}
      <div className="flex flex-col gap-2 pt-0.5">
        <CompactNutrientBar
          icon="🍬"
          label="Sugar"
          valueText={`${calcs.sugarGrams}g (${calcs.sugarTeaspoons} tsp)`}
          pct={calcs.sugarPct}
          delay={0.1}
        />

        <CompactNutrientBar
          icon="🧈"
          label="Sat Fat"
          valueText={`${calcs.satFatGrams}g / ${limits.satFat}g`}
          pct={calcs.satFatPct}
          delay={0.2}
        />

        <CompactNutrientBar
          icon="🧂"
          label="Sodium"
          valueText={`${calcs.sodiumMg}mg / ${limits.sodium}mg`}
          pct={calcs.sodiumPct}
          delay={0.3}
        />
      </div>

      {/* Hidden count badge (if any) */}
      {hiddenCount > 0 && (
        <div className="flex items-center justify-center pt-0.5">
          <span className="text-[9px] font-bold text-toy-red bg-toy-red/10 border border-toy-red/30 rounded-md px-1.5 py-0.5 truncate">
            ⚠️ {hiddenCount} hidden ingredient{hiddenCount > 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Bottom: Add to Plate Button */}
      <button
        type="button"
        onClick={() => {
          onAddToPlate(
            productData.product || tag,
            calcs.sugarGrams,
            calcs.satFatGrams,
            calcs.sodiumMg,
            productData.serving_size
          )
          setAdded(true)
          setTimeout(() => setAdded(false), 3000)
        }}
        className={`toy-press font-display flex w-full items-center justify-center gap-1 rounded-xl border-2 border-toy-ink py-1.5 text-xs font-bold shadow-[0_2px_0_0_var(--toy-ink)] transition-all cursor-pointer ${
          added
            ? 'bg-toy-green text-white'
            : 'bg-toy-yellow text-toy-ink hover:brightness-105 active:scale-95'
        }`}
      >
        {added ? (
          <>
            <Check className="size-3.5 stroke-[3]" />
            <span>Added!</span>
          </>
        ) : (
          <>
            <Utensils className="size-3 stroke-[2.5]" />
            <span className="truncate">Add to Plate</span>
          </>
        )}
      </button>
    </div>
  )
}
