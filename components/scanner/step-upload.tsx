'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ScanLine } from 'lucide-react'
import { API_URL, type AgeGroup, type AnalysisResult, type Gender } from '@/lib/scanner'
import { ToyButton } from './toy-button'
import { UploadBox, type PickedImage } from './upload-box'

const HEALTH_FACTS = [
  'Why track only Sugar, Fat, and Sodium? Because WHO/ICMR identifies these as the Big 3 hidden dangers in ultra-processed foods.',
  'Some major brands use cheaper oils in Indian products compared to their European versions.',
  'Food companies use over 40 different names for sugar (like Maltodextrin and Invert Syrup) to hide it.',
  'The average Indian consumes 2x the recommended daily sugar limit.',
  'A standard 250ml soft drink contains roughly 7 teaspoons of sugar—almost your entire daily limit.',
  'We track Sodium because high salt intake is a leading cause of hypertension in India.',
  'We track Saturated Fat because it raises LDL (bad) cholesterol and increases heart disease risk.',
  "'No Added Sugar' doesn't mean sugar-free. It often contains natural sugars or artificial sweeteners.",
  'Ingredients are listed in order of weight. If sugar is first, the product is mostly sugar.',
  'Maltodextrin has a higher glycemic index than table sugar, meaning it spikes your blood sugar faster.',
  'The Nestlé Cerelac controversy revealed higher sugar levels in India compared to Europe.',
  "'Sugar-free' products often contain sugar alcohols that can cause digestive issues.",
  'Packaged health drinks marketed for kids often have sugar as their second ingredient.',
  '1 teaspoon of sugar is roughly 4 grams.',
  '70% of the salt we eat is already hidden in processed foods.',
  'Ultra-processed foods are designed to be hyper-palatable, making it hard to eat just one.',
]

function shuffleFacts(facts: string[]): string[] {
  const arr = [...facts]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = arr[i]
    arr[i] = arr[j]
    arr[j] = temp
  }
  return arr
}

export function StepUpload({
  gender,
  ageGroup,
  onBack,
  onResult,
}: {
  gender: Gender
  ageGroup: AgeGroup
  onBack: () => void
  onResult: (data: AnalysisResult) => void
}) {
  const [scanMode, setScanMode] = useState<'single' | 'compare'>('single')
  const [image1, setImage1] = useState<PickedImage | null>(null)
  const [image2, setImage2] = useState<PickedImage | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shuffledFacts, setShuffledFacts] = useState<string[]>(() => shuffleFacts(HEALTH_FACTS))
  const [factIndex, setFactIndex] = useState(0)

  // Carousel timer: every 5.0 seconds smoothly advance to the next fact
  useEffect(() => {
    if (!loading || shuffledFacts.length === 0) return

    const interval = setInterval(() => {
      setFactIndex((prev) => (prev + 1) % shuffledFacts.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [loading, shuffledFacts])

  const canScan =
    scanMode === 'single'
      ? !!image1 && !loading
      : !!image1 && !!image2 && !loading

  async function handleScan() {
    if (!image1) return
    if (scanMode === 'compare' && !image2) return

    setShuffledFacts(shuffleFacts(HEALTH_FACTS))
    setFactIndex(0)
    setLoading(true)
    setError(null)

    try {
      const form = new FormData()
      form.append('age_group', ageGroup)
      form.append('gender', gender)
      form.append('image1', image1.file)
      if (scanMode === 'compare' && image2) {
        form.append('image2', image2.file)
      }

      const res = await fetch(API_URL, { method: 'POST', body: form })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(text || `Server responded with ${res.status}`)
      }
      const data = (await res.json()) as AnalysisResult
      onResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="flex flex-col gap-5" aria-labelledby="upload-title">
      {/* Scan Mode Toggle: Single Scan vs Compare */}
      <div className="flex flex-col items-center gap-1.5 w-full">
        <div className="inline-flex rounded-full border-3 border-toy-ink bg-white p-1 shadow-[0_3px_0_0_var(--toy-ink)]">
          <button
            type="button"
            onClick={() => {
              setScanMode('single')
              setImage2(null)
            }}
            className={`font-display cursor-pointer rounded-full px-5 py-2 text-sm sm:text-base font-bold transition-all ${
              scanMode === 'single'
                ? 'border-2 border-toy-ink bg-toy-yellow text-toy-ink shadow-[0_2px_0_0_var(--toy-ink)]'
                : 'text-toy-ink/60 hover:text-toy-ink'
            }`}
          >
            📷 Single Scan
          </button>
          <button
            type="button"
            onClick={() => {
              setScanMode('compare')
            }}
            className={`font-display cursor-pointer rounded-full px-5 py-2 text-sm sm:text-base font-bold transition-all ${
              scanMode === 'compare'
                ? 'border-2 border-toy-ink bg-toy-yellow text-toy-ink shadow-[0_2px_0_0_var(--toy-ink)]'
                : 'text-toy-ink/60 hover:text-toy-ink'
            }`}
          >
            ⚖️ Compare
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {scanMode === 'single' ? (
          <motion.div
            key="single-mode-box"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-4"
          >
            <div className="toy-block p-4 text-center">
              <h2 id="upload-title" className="font-display text-xl sm:text-2xl font-bold leading-tight text-toy-ink text-balance">
                Snap or upload the nutrition label
              </h2>
              <p className="mt-1 text-xs sm:text-sm font-semibold text-muted-foreground text-pretty">
                Make sure the nutrition table and ingredients list are clearly visible.
              </p>
            </div>

            <UploadBox
              id="single-label"
              label="Product Label Photo"
              hint="Nutrition table + Ingredients list"
              value={image1}
              onChange={setImage1}
            />
          </motion.div>
        ) : (
          <motion.div
            key="compare-mode-boxes"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-4"
          >
            <div className="toy-block p-4 bg-[#fff9ea] text-center border-3 border-toy-ink">
              <h2 id="upload-title" className="font-display text-xl sm:text-2xl font-bold leading-tight text-toy-ink text-balance">
                ⚖️ Compare Two Products
              </h2>
              <p className="mt-1 text-xs sm:text-sm font-semibold text-muted-foreground text-pretty">
                Upload labels for Product A and Product B to see their nutrition stacked side-by-side.
              </p>
            </div>

            <UploadBox
              id="product-a"
              label="Product A"
              hint="Label photo for Product A"
              value={image1}
              onChange={setImage1}
            />
            <UploadBox
              id="product-b"
              label="Product B"
              hint="Label photo for Product B"
              value={image2}
              onChange={setImage2}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div role="alert" className="toy-block border-toy-red bg-[#ffe3e3] p-4 text-sm font-semibold text-toy-red">
          {"Oops! We couldn't scan that. "}
          <span className="block break-words font-normal text-toy-ink">{error}</span>
        </div>
      )}

      {/* Unified Scan Action & Loading Carousel Container */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-3">
          <ToyButton variant="white" onClick={onBack} aria-label="Back" className="px-4" disabled={loading}>
            <ArrowLeft className="size-7" strokeWidth={3} aria-hidden="true" />
          </ToyButton>
          <ToyButton onClick={handleScan} disabled={!canScan} className="flex-1 py-5 text-xl sm:text-2xl">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <ScanLine className="size-7 animate-pulse" strokeWidth={3} aria-hidden="true" />
                Scanning…
              </span>
            ) : scanMode === 'compare' ? (
              <span className="flex items-center justify-center gap-2">
                <span>⚖️</span>
                <span>Compare Products</span>
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <ScanLine className="size-7" strokeWidth={3} aria-hidden="true" />
                <span>Scan</span>
              </span>
            )}
          </ToyButton>
        </div>

        {/* Loading Carousel: Positioned right under the scanning animation */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 350, damping: 26 }}
              className="toy-block bg-toy-yellow/20 border-4 border-toy-ink p-4 flex flex-col items-center gap-2.5 text-center shadow-[0_4px_0_0_var(--toy-ink)]"
              aria-live="polite"
            >
              <div className="flex items-center gap-2">
                <span className="relative flex size-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-toy-orange opacity-75"></span>
                  <span className="relative inline-flex rounded-full size-2.5 bg-toy-orange"></span>
                </span>
                <span className="font-display text-xs font-bold uppercase tracking-wider text-toy-ink/80">
                  {scanMode === 'compare' ? 'Comparing Both Products with AI…' : 'Scanning Food Label with AI…'}
                </span>
              </div>

              <div className="inline-flex items-center gap-1.5 rounded-full border-2 border-toy-ink bg-toy-yellow px-3 py-0.5 text-xs font-black uppercase tracking-wider text-toy-ink shadow-[0_2px_0_0_var(--toy-ink)]">
                <span>💡</span> Did You Know?
              </div>

              <div className="relative min-h-[85px] w-full flex items-center justify-center overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={factIndex}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.45, ease: 'easeInOut' }}
                    className="font-display text-base sm:text-lg font-bold text-toy-ink leading-snug px-2"
                  >
                    &ldquo;{shuffledFacts[factIndex]}&rdquo;
                  </motion.p>
                </AnimatePresence>
              </div>

              <p className="text-[11px] font-semibold text-toy-ink/70">
                Analyzing label…
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}
