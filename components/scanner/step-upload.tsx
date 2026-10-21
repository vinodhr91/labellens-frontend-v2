'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Info, ScanLine } from 'lucide-react'
import { API_URL, type AgeGroup, type AnalysisResult, type Gender } from '@/lib/scanner'
import { cn } from '@/lib/utils'
import { ToyButton } from './toy-button'
import { UploadBox, type PickedImage } from './upload-box'

type Layout = 'same' | 'separate' | null

const HEALTH_FACTS = [
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
  const [layout, setLayout] = useState<Layout>(null)
  const [image1, setImage1] = useState<PickedImage | null>(null)
  const [image2, setImage2] = useState<PickedImage | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shuffledFacts, setShuffledFacts] = useState<string[]>(() => shuffleFacts(HEALTH_FACTS))
  const [factIndex, setFactIndex] = useState(0)

  // Carousel timer: every 2.5 seconds smoothly advance to the next fact
  useEffect(() => {
    if (!loading || shuffledFacts.length === 0) return

    const interval = setInterval(() => {
      setFactIndex((prev) => (prev + 1) % shuffledFacts.length)
    }, 2500)

    return () => clearInterval(interval)
  }, [loading, shuffledFacts])

  const canScan = !!image1 && (layout === 'same' || (layout === 'separate' && !!image2)) && !loading

  async function handleScan() {
    if (!image1) return
    // Randomize the facts array on every scan so user rarely sees same fact twice in a row
    setShuffledFacts(shuffleFacts(HEALTH_FACTS))
    setFactIndex(0)
    setLoading(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('age_group', ageGroup)
      form.append('gender', gender)
      form.append('image1', image1.file)
      if (layout === 'separate' && image2) form.append('image2', image2.file)

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
    <section className="flex flex-col gap-6" aria-labelledby="upload-title">
      <div className="toy-block flex flex-col gap-4 p-5">
        <h2 id="upload-title" className="text-2xl font-bold leading-tight text-toy-ink text-balance">
          Are the Ingredients and Nutrition Facts on the same side of the packet?
        </h2>
        <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-labelledby="upload-title">
          <ChoiceButton active={layout === 'same'} onClick={() => setLayout('same')} color="bg-toy-green">
            Yes, Same Side
          </ChoiceButton>
          <ChoiceButton active={layout === 'separate'} onClick={() => setLayout('separate')} color="bg-toy-orange">
            No, Separate Sides
          </ChoiceButton>
        </div>
        <p className="flex items-start gap-2 rounded-2xl bg-[#eef8ff] p-3 text-sm font-semibold text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-toy-ink" aria-hidden="true" />
          If both are on the same side, just upload the photo once.
        </p>
      </div>

      <AnimatePresence initial={false}>
        {layout && (
          <motion.div
            key="boxes"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="flex flex-col gap-4"
          >
            <UploadBox
              id="image1"
              label={layout === 'same' ? 'Label photo' : 'Ingredients side'}
              hint={layout === 'same' ? 'Ingredients + Nutrition Facts' : 'Photo of the ingredients list'}
              value={image1}
              onChange={setImage1}
            />
            <AnimatePresence>
              {layout === 'separate' && (
                <motion.div
                  key="second"
                  initial={{ opacity: 0, scale: 0.6, y: -40 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.6, y: -40 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 18 }}
                >
                  <UploadBox
                    id="image2"
                    label="Nutrition Facts side"
                    hint="Photo of the nutrition table"
                    value={image2}
                    onChange={setImage2}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div role="alert" className="toy-block border-toy-red bg-[#ffe3e3] p-4 text-sm font-semibold text-toy-red">
          {"Oops! We couldn't scan that. "}
          <span className="block break-words font-normal text-toy-ink">{error}</span>
        </div>
      )}

      <div className="flex gap-3">
        <ToyButton variant="white" onClick={onBack} aria-label="Back" className="px-4" disabled={loading}>
          <ArrowLeft className="size-7" strokeWidth={3} aria-hidden="true" />
        </ToyButton>
        <ToyButton onClick={handleScan} disabled={!canScan} className="flex-1 py-5 text-2xl">
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <ScanLine className="size-7 animate-pulse" strokeWidth={3} aria-hidden="true" />
              Scanning…
            </span>
          ) : (
            <>
              <ScanLine className="size-7" strokeWidth={3} aria-hidden="true" />
              Scan
            </>
          )}
        </ToyButton>
      </div>

      {/* Randomized "Did You Know?" loading carousel */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="toy-block bg-toy-yellow/20 border-4 border-toy-ink p-5 flex flex-col items-center gap-3 text-center"
            aria-live="polite"
          >
            <div className="inline-flex items-center gap-2 rounded-full border-2 border-toy-ink bg-toy-yellow px-3 py-1 text-xs font-black uppercase tracking-wider text-toy-ink shadow-[0_2px_0_0_var(--toy-ink)]">
              <span>💡</span> Did You Know?
            </div>

            <div className="relative min-h-[85px] w-full flex items-center justify-center overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.p
                  key={factIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.35, ease: 'easeInOut' }}
                  className="font-display text-base sm:text-lg font-bold text-toy-ink leading-snug px-2"
                >
                  &ldquo;{shuffledFacts[factIndex]}&rdquo;
                </motion.p>
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-2 pt-1 text-xs font-bold text-toy-ink/75">
              <span className="size-2 rounded-full bg-toy-ink animate-ping" />
              <span>Reading your food label… the first scan can take up to a minute!</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

function ChoiceButton({
  active,
  color,
  children,
  onClick,
}: {
  active: boolean
  color: string
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        'toy-press font-display min-h-20 rounded-2xl border-4 border-toy-ink px-3 py-3 text-lg font-bold leading-tight',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-toy-yellow',
        active ? `${color} -translate-y-0.5 text-white` : 'bg-white text-toy-ink',
      )}
    >
      {children}
    </button>
  )
}
