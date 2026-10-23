export const API_URL = 'https://labellens-api-cztz.onrender.com/api/analyze'

export const GENDERS = ['Female', 'Male'] as const
export const AGE_GROUPS = ['1-3', '4-6', '7-9', '10+', 'under-2'] as const

export type Gender = (typeof GENDERS)[number] | 'Boy' | 'Girl' | 'Man' | 'Woman'
export type AgeGroup = (typeof AGE_GROUPS)[number]

export function isFemaleGender(g: string): boolean {
  const s = (g || '').toLowerCase().trim()
  return s === 'female' || s === 'girl' || s === 'woman'
}

export type Metric = {
  percentage?: number | string
  teaspoons?: number | string
  grams?: number | string
  value?: number | string
  unit?: string
  [key: string]: unknown
}

export type Citation =
  | string
  | {
      name?: string
      explanation?: string
      url?: string
      source?: string
      title?: string
      description?: string
      link?: string
      plain_english?: string
    }

export type HiddenIngredientItem = {
  name: string
  meaning?: string
  explanation?: string
  description?: string
}

export type ProductAnalysis = {
  product?: string
  serving_size?: string
  verdict?: string
  breakdown?: Record<string, Metric | undefined>
  other_nutrients?: Record<string, unknown>
  hidden_ingredients?: (HiddenIngredientItem | string)[]
  raw_ingredients?: string | string[]
}

export type AnalysisResult = ProductAnalysis & {
  product_a?: ProductAnalysis
  product_b?: ProductAnalysis | null
  demographic?: string
  citations?: Citation[]
  disclaimer?: string
}

export const HIDDEN_KEYWORDS = ['sugar', 'syrup', 'maltodextrin', 'glucose', 'palmolein', 'dextrose', 'fructose']

export const HIDDEN_INGREDIENTS_DB: Record<string, string> = {
  'invert sugar': 'A highly processed liquid sugar that spikes blood sugar faster than table sugar.',
  'liquid glucose': 'A cheap sweetener made from starch. It adds empty calories and raises blood sugar rapidly.',
  'maltodextrin': 'A highly processed starch used as a filler and thickener. It has a higher glycemic index than table sugar.',
  'palmolein': 'A cheap industrial palm oil high in saturated fats, often used to cut costs.',
  'high fructose corn syrup': 'A highly refined sweetener linked to increased risk of obesity and metabolic issues.',
  'sugar': 'Standard added sugar. High regular intake is linked to weight gain, inflammation, and tooth decay.',
  'corn syrup': 'Processed sweetener rapidly converted into fat in the liver.',
  'dextrose': 'Fast-acting simple sugar that causes an instant glucose spike.',
}

export const AGE_LIMITS = {
  adult: {
    label: 'Age 10 and over',
    shortLabel: 'Adult',
    max_sugar_g: 50,
    max_sat_fat_g: 22,
    max_sodium_mg: 2000,
    warning: 'FSSAI/WHO standard RDA for adults (2000 kcal).',
  },
  child: {
    label: 'Age 7–9',
    shortLabel: 'Child',
    max_sugar_g: 42,
    max_sat_fat_g: 18,
    max_sodium_mg: 1200,
    warning: 'ICMR-NIN standard guidelines for school-age children (1700 kcal).',
  },
} as const

export function toNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'string') {
    const n = Number.parseFloat(value.replace(/[^0-9.\-]/g, ''))
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

export function findMetric(breakdown: AnalysisResult['breakdown'], keys: string[]): Metric | undefined {
  if (!breakdown) return undefined
  for (const key of keys) {
    if (breakdown[key]) return breakdown[key]
  }
  return undefined
}

export function levelColor(pct: number) {
  if (pct > 50) return { fill: 'var(--toy-red)', label: 'High' }
  if (pct >= 25) return { fill: 'var(--toy-orange)', label: 'Medium' }
  return { fill: 'var(--toy-green)', label: 'Low' }
}

export function formatNutrient(value: unknown, fallbackUnit = 'g'): string {
  if (value == null || value === '') return '—'
  if (typeof value === 'number') return `${Math.round(value * 10) / 10} ${fallbackUnit}`
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    const v = value as Record<string, unknown>
    const amount = v.value ?? v.amount ?? v.grams ?? v.g
    const unit = typeof v.unit === 'string' ? v.unit : fallbackUnit
    if (amount != null) return `${amount} ${unit}`.trim()
  }
  return String(value)
}

export function extractHiddenIngredients(raw: AnalysisResult['raw_ingredients']): string[] {
  if (!raw) return []
  const items = Array.isArray(raw) ? raw : raw.split(/[,;\n]|\s\(|\)/)
  const seen = new Set<string>()
  const result: string[] = []
  for (const item of items) {
    const clean = String(item).replace(/[()[\]{}.:*]/g, '').trim()
    if (!clean) continue
    const lower = clean.toLowerCase()
    if (HIDDEN_KEYWORDS.some((k) => lower.includes(k)) && !seen.has(lower)) {
      seen.add(lower)
      result.push(clean)
    }
  }
  return result
}
