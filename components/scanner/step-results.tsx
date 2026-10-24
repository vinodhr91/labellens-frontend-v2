'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, CheckCircle2, RotateCcw, Utensils, Users, X } from 'lucide-react'
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

function parseGramsOrMl(str: string | undefined): number | null {
  if (!str) return null
  const m = str.match(/([0-9.]+)\s*(g|gm|gram|grams|ml|milliliter)/i)
  if (m) {
    const val = parseFloat(m[1])
    return isNaN(val) ? null : val
  }
  const numOnly = parseFloat(str.replace(/[^0-9.]/g, ''))
  return !isNaN(numOnly) && numOnly > 0 ? numOnly : null
}

function calculateWholePackMetrics(
  productData: ProductAnalysis,
  calcs: { sugarGrams: number; satFatGrams: number; sodiumMg: number }
): {
  servings: number
  sugarTsp: number
  satFatGrams: number
  sodiumMg: number
} | null {
  const p = productData as Record<string, unknown>
  let servings: number | null = null

  const directServings = toNumber(p.servings_per_pack || p.total_servings || p.servings)
  if (directServings > 1) {
    servings = directServings
  } else {
    const netWeightStr = String(p.net_weight || p.net_quantity || p.pack_weight || p.weight || '').trim()
    const servingSizeStr = String(p.serving_size || '').trim()

    if (netWeightStr && netWeightStr.toLowerCase() !== 'unknown') {
      const netWeightNum = parseGramsOrMl(netWeightStr)
      const servingSizeNum = parseGramsOrMl(servingSizeStr)
      if (netWeightNum && servingSizeNum && servingSizeNum > 0 && netWeightNum > servingSizeNum) {
        servings = netWeightNum / servingSizeNum
      }
    }
  }

  if (!servings || servings <= 1) return null

  const sugarTsp = Math.round(((calcs.sugarGrams / 4.0) * servings) * 10) / 10
  const satFatGrams = Math.round((calcs.satFatGrams * servings) * 10) / 10
  const sodiumMg = Math.round(calcs.sodiumMg * servings)

  return {
    servings: Math.round(servings * 10) / 10,
    sugarTsp,
    satFatGrams,
    sodiumMg,
  }
}

function getProductTotalServings(productData: ProductAnalysis): number | null {
  const p = productData as Record<string, unknown>
  const directServings = toNumber(p.servings_per_pack || p.total_servings || p.servings)
  if (directServings > 1) {
    return Math.round(directServings * 10) / 10
  }

  const netWeightStr = String(p.net_weight || p.net_quantity || p.pack_weight || p.weight || '').trim()
  const servingSizeStr = String(p.serving_size || '').trim()

  if (netWeightStr && netWeightStr.toLowerCase() !== 'unknown') {
    const netWeightNum = parseGramsOrMl(netWeightStr)
    const servingSizeNum = parseGramsOrMl(servingSizeStr)
    if (netWeightNum && servingSizeNum && servingSizeNum > 0 && netWeightNum > servingSizeNum) {
      return Math.round((netWeightNum / servingSizeNum) * 10) / 10
    }
  }

  return null
}

function generateOneGlanceSummary(
  calcs: {
    sugarPct: number
    satFatPct: number
    sodiumPct: number
    sugarTeaspoons: number
    sugarGrams: number
    satFatGrams: number
    sodiumMg: number
  },
  hiddenCount: number
): string {
  const isHighSugar = calcs.sugarPct >= 25
  const isHighSatFat = calcs.satFatPct >= 25
  const isHighSodium = calcs.sodiumPct >= 25

  const flaggedText =
    hiddenCount === 0
      ? 'no flagged ingredients'
      : `${hiddenCount} flagged ingredient${hiddenCount > 1 ? 's' : ''}`

  // Check if all metrics are under 25% (Within Limits)
  if (!isHighSugar && !isHighSatFat && !isHighSodium) {
    if (hiddenCount === 0) {
      return `Within Daily Limits: ${calcs.sugarTeaspoons} tsp sugar, no flagged ingredients.`
    }
    return `Within Daily Limits: ${calcs.sugarTeaspoons} tsp sugar and ${flaggedText}.`
  }

  // Determine prefix based on worst nutrient
  let prefix = 'High Sugar'
  if (isHighSugar && isHighSatFat) {
    prefix = 'High Sugar & Fat'
  } else if (isHighSatFat) {
    prefix = 'High Saturated Fat'
  } else if (isHighSodium) {
    prefix = 'High Sodium'
  }

  let detail = ''
  if (isHighSugar) {
    detail = `${calcs.sugarTeaspoons} tsp added sugar`
  } else if (isHighSatFat) {
    detail = `${calcs.satFatGrams}g sat fat`
  } else if (isHighSodium) {
    detail = `${calcs.sodiumMg}mg sodium`
  }

  return `${prefix}: ${detail} and ${flaggedText}.`
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
    dynamicVerdict = '⚠️ HIGH LEVELS DETECTED'
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

  // Toast message
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Single scan added state
  const [singleAdded, setSingleAdded] = useState(false)

  // Check if compare mode
  const productA = result.product_a || result
  const productB = result.product_b || null
  const isCompareMode = Boolean(productB)

  // Calculate metrics for Product A and Product B
  const calcsA = calculateNutrients(productA, limits)
  const calcsB = productB ? calculateNutrients(productB, limits) : null

  // Whole Pack metrics for all nutrients
  const wholePackA = calculateWholePackMetrics(productA, calcsA)
  const wholePackB = productB && calcsB ? calculateWholePackMetrics(productB, calcsB) : null

  const totalServingsA = getProductTotalServings(productA)
  const totalServingsB = productB ? getProductTotalServings(productB) : null

  // One-Glance Summaries
  const hiddenCountA = productA.hidden_ingredients?.length || 0
  const oneGlanceSummaryA = generateOneGlanceSummary(calcsA, hiddenCountA)

  const hiddenCountB = productB?.hidden_ingredients?.length || 0
  const oneGlanceSummaryB = calcsB ? generateOneGlanceSummary(calcsB, hiddenCountB) : ''

  // "How Much Did You Eat?" portion modal state
  const [portionModal, setPortionModal] = useState<{
    productName: string
    servingSize?: string
    sugarGrams: number
    satFatGrams: number
    sodiumMg: number
    totalServings: number | null
  } | null>(null)

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

  const handleOpenPortionModal = (
    productName: string,
    sugarGrams: number,
    satFatGrams: number,
    sodiumMg: number,
    servingSize?: string,
    totalServings?: number | null
  ) => {
    setPortionModal({
      productName: productName || 'Scanned Food Product',
      sugarGrams,
      satFatGrams,
      sodiumMg,
      servingSize,
      totalServings: totalServings && totalServings > 1 ? totalServings : null,
    })
  }

  const handleSelectPortion = (multiplier: number, label: string) => {
    if (!portionModal) return

    const sugarG = Math.round(portionModal.sugarGrams * multiplier * 10) / 10
    const satFatG = Math.round(portionModal.satFatGrams * multiplier * 10) / 10
    const sodiumMg = Math.round(portionModal.sodiumMg * multiplier)

    let servingDesc = label
    if (portionModal.servingSize) {
      servingDesc = `${label} (${portionModal.servingSize})`
    }

    performAddToPlate(
      portionModal.productName,
      sugarG,
      satFatG,
      sodiumMg,
      servingDesc
    )

    setPortionModal(null)
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
          {/* Side-by-Side 2-Column Split */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full items-stretch">
            {/* Left Column: Product A */}
            <CompareProductColumn
              tag="Product A"
              badgeBg="bg-toy-yellow"
              productData={productA}
              calcs={calcsA}
              limits={limits}
              summary={oneGlanceSummaryA}
              wholePack={wholePackA}
              onAddToPlate={(name, sugar, fat, sodium, serving) =>
                handleOpenPortionModal(name, sugar, fat, sodium, serving, totalServingsA)
              }
            />

            {/* Right Column: Product B */}
            <CompareProductColumn
              tag="Product B"
              badgeBg="bg-[#eef8ff]"
              productData={productB}
              calcs={calcsB}
              limits={limits}
              summary={oneGlanceSummaryB}
              wholePack={wholePackB}
              onAddToPlate={(name, sugar, fat, sodium, serving) =>
                handleOpenPortionModal(name, sugar, fat, sodium, serving, totalServingsB)
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
        <div className="flex flex-col gap-5">
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

          {/* Verdict Banner */}
          <VerdictStamp verdict={calcsA.dynamicVerdict} />

          {/* Bold One-Glance Summary (Right under Verdict Banner) */}
          <div className="rounded-2xl border-3 border-toy-ink bg-white/95 px-4 py-2.5 text-center shadow-[0_3px_0_0_var(--toy-ink)]">
            <p className="font-display text-sm sm:text-base font-bold text-toy-ink leading-snug">
              {oneGlanceSummaryA}
            </p>
          </div>

          {/* Sugar Jar with Whole Pack view if net weight exists */}
          <SugarBottle
            percentage={calcsA.sugarPct}
            teaspoons={calcsA.sugarTeaspoons}
            grams={calcsA.sugarGrams}
            limitG={limits.sugar}
            wholePackTeaspoons={wholePackA?.sugarTsp ?? null}
          />

          <div className="grid grid-cols-2 gap-4">
            <MiniMeter
              label="Saturated Fat"
              shape="tube"
              percentage={calcsA.satFatPct}
              delay={0.15}
              detail={ratio(calcsA.satFatGrams, limits.satFat, 'g')}
              wholePackText={wholePackA ? `Whole Pack: ${wholePackA.satFatGrams}g` : null}
            />
            <MiniMeter
              label="Sodium"
              shape="salt"
              percentage={calcsA.sodiumPct}
              delay={0.25}
              detail={ratio(calcsA.sodiumMg, limits.sodium, 'mg')}
              wholePackText={wholePackA ? `Whole Pack: ${wholePackA.sodiumMg}mg` : null}
            />
          </div>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <button
              type="button"
              onClick={() => {
                handleOpenPortionModal(
                  productA.product || 'Scanned Food Product',
                  calcsA.sugarGrams,
                  calcsA.satFatGrams,
                  calcsA.sodiumMg,
                  productA.serving_size,
                  totalServingsA
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

      {/* "How Much Did You Eat?" Portion Modal */}
      <AnimatePresence>
        {portionModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-toy-ink/65 backdrop-blur-xs"
            onClick={() => setPortionModal(null)}
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
              aria-labelledby="portion-modal-title"
            >
              <button
                type="button"
                onClick={() => setPortionModal(null)}
                className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full border-2 border-toy-ink bg-muted text-toy-ink transition-transform hover:scale-110 cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="size-4" strokeWidth={3} />
              </button>

              <div className="flex items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border-3 border-toy-ink bg-toy-yellow text-toy-ink shadow-[0_2px_0_0_var(--toy-ink)] text-xl">
                  🍽️
                </span>
                <div>
                  <h4 id="portion-modal-title" className="font-display text-xl font-bold text-toy-ink leading-tight">
                    How much did you eat?
                  </h4>
                  <p className="text-xs font-bold text-toy-ink/70 truncate max-w-[200px]">
                    {portionModal.productName}
                  </p>
                </div>
              </div>

              {isWhatIf && (
                <div className="mt-3 rounded-xl border-2 border-toy-ink bg-toy-yellow/20 px-3 py-1.5 text-xs font-bold text-toy-ink">
                  ⚠️ Logging to <strong>{profileName}&apos;s Plate</strong>
                </div>
              )}

              <p className="mt-3 text-xs sm:text-sm font-semibold text-muted-foreground">
                Select your portion size to track accurate daily totals:
              </p>

              <div className="mt-4 flex flex-col gap-2.5">
                {/* 1 Serving Option */}
                <button
                  type="button"
                  onClick={() => handleSelectPortion(1, '1 Serving')}
                  className="toy-press flex items-center justify-between rounded-2xl border-3 border-toy-ink bg-[#fffef0] p-3.5 text-left transition-all hover:bg-toy-yellow/30 shadow-[0_2px_0_0_var(--toy-ink)] cursor-pointer"
                >
                  <div className="flex flex-col">
                    <span className="font-display text-base font-bold text-toy-ink">
                      1 Serving
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground">
                      {portionModal.sugarGrams}g sugar · {Math.round((portionModal.sugarGrams / 4.0) * 10) / 10} tsp
                    </span>
                  </div>
                  <span className="font-display text-xs font-black uppercase text-toy-ink bg-white border-2 border-toy-ink px-2.5 py-1 rounded-full">
                    1x
                  </span>
                </button>

                {/* 2 Servings Option */}
                <button
                  type="button"
                  onClick={() => handleSelectPortion(2, '2 Servings')}
                  className="toy-press flex items-center justify-between rounded-2xl border-3 border-toy-ink bg-[#fffef0] p-3.5 text-left transition-all hover:bg-toy-yellow/30 shadow-[0_2px_0_0_var(--toy-ink)] cursor-pointer"
                >
                  <div className="flex flex-col">
                    <span className="font-display text-base font-bold text-toy-ink">
                      2 Servings
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground">
                      {Math.round(portionModal.sugarGrams * 2 * 10) / 10}g sugar · {Math.round(((portionModal.sugarGrams * 2) / 4.0) * 10) / 10} tsp
                    </span>
                  </div>
                  <span className="font-display text-xs font-black uppercase text-toy-ink bg-white border-2 border-toy-ink px-2.5 py-1 rounded-full">
                    2x
                  </span>
                </button>

                {/* Whole Pack Option: only if totalServings > 1 */}
                {portionModal.totalServings !== null && portionModal.totalServings > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      handleSelectPortion(
                        portionModal.totalServings!,
                        `Whole Pack (${portionModal.totalServings} servings)`
                      )
                    }
                    className="toy-press flex items-center justify-between rounded-2xl border-3 border-toy-ink bg-toy-yellow p-3.5 text-left transition-all hover:brightness-105 shadow-[0_2px_0_0_var(--toy-ink)] cursor-pointer"
                  >
                    <div className="flex flex-col">
                      <span className="font-display text-base font-bold text-toy-ink">
                        Whole Pack
                      </span>
                      <span className="text-xs font-bold text-toy-ink/80">
                        {Math.round(portionModal.sugarGrams * portionModal.totalServings * 10) / 10}g sugar · {portionModal.totalServings} servings
                      </span>
                    </div>
                    <span className="font-display text-xs font-black uppercase text-toy-ink bg-white border-2 border-toy-ink px-2.5 py-1 rounded-full">
                      {portionModal.totalServings}x
                    </span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setPortionModal(null)}
                className="mt-4 w-full rounded-xl border-2 border-toy-ink bg-muted py-2 text-xs font-bold text-toy-ink hover:bg-muted/80 cursor-pointer"
              >
                Cancel
              </button>
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
  const isHighOrModerate = /(high|moderate|⚠️)/i.test(verdict)

  let badgeColor = 'bg-toy-green text-white'
  let text = '✅ WITHIN'

  if (isExceed) {
    badgeColor = 'bg-toy-red text-white'
    text = '🚨 EXCEEDS'
  } else if (isHighOrModerate) {
    badgeColor = 'bg-toy-orange text-white'
    text = '⚠️ HIGH LEVELS'
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
  summary,
  wholePack,
  onAddToPlate,
}: {
  tag: string
  badgeBg: string
  productData: ProductAnalysis
  calcs: ReturnType<typeof calculateNutrients>
  limits: { sugar: number; satFat: number; sodium: number }
  summary: string
  wholePack: ReturnType<typeof calculateWholePackMetrics>
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

        {/* Dynamic One-Glance Summary for this Product */}
        <p className="font-display text-[10px] font-bold text-toy-ink leading-tight text-balance bg-[#fefcf3] p-1.5 rounded-lg border border-toy-ink/30">
          {summary}
        </p>

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
        {wholePack?.sugarTsp != null && wholePack.sugarTsp > 0 && (
          <div className="text-[9px] font-bold text-toy-red text-right -mt-1">
            Whole Pack: {wholePack.sugarTsp} tsp
          </div>
        )}

        <CompactNutrientBar
          icon="🧈"
          label="Sat Fat"
          valueText={`${calcs.satFatGrams}g / ${limits.satFat}g`}
          pct={calcs.satFatPct}
          delay={0.2}
        />
        {wholePack?.satFatGrams != null && wholePack.satFatGrams > 0 && (
          <div className="text-[9px] font-bold text-toy-ink/75 text-right -mt-1">
            Whole Pack: {wholePack.satFatGrams}g
          </div>
        )}

        <CompactNutrientBar
          icon="🧂"
          label="Sodium"
          valueText={`${calcs.sodiumMg}mg / ${limits.sodium}mg`}
          pct={calcs.sodiumPct}
          delay={0.3}
        />
        {wholePack?.sodiumMg != null && wholePack.sodiumMg > 0 && (
          <div className="text-[9px] font-bold text-toy-ink/75 text-right -mt-1">
            Whole Pack: {wholePack.sodiumMg}mg
          </div>
        )}
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
