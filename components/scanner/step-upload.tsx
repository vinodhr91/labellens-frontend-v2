'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Info, Loader2, ScanLine } from 'lucide-react'
import { API_URL, type AgeGroup, type AnalysisResult, type Gender } from '@/lib/scanner'
import { cn } from '@/lib/utils'
import { ToyButton } from './toy-button'
import { UploadBox, type PickedImage } from './upload-box'

type Layout = 'same' | 'separate' | null

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

  const canScan = !!image1 && (layout === 'same' || (layout === 'separate' && !!image2)) && !loading

  async function handleScan() {
    if (!image1) return
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
            <>
              <Loader2 className="size-7 animate-spin" strokeWidth={3} aria-hidden="true" />
              Scanning…
            </>
          ) : (
            <>
              <ScanLine className="size-7" strokeWidth={3} aria-hidden="true" />
              Scan
            </>
          )}
        </ToyButton>
      </div>
      {loading && (
        <p className="text-center text-sm font-semibold text-toy-ink/80" aria-live="polite">
          Reading the label… the first scan can take up to a minute while the server wakes up.
        </p>
      )}
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
