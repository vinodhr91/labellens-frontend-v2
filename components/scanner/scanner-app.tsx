'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ScanLine } from 'lucide-react'
import type { AgeGroup, AnalysisResult, Gender } from '@/lib/scanner'
import { StepOnboarding } from './step-onboarding'
import { StepUpload } from './step-upload'
import { StepResults } from './step-results'

type Step = 1 | 2 | 3

export function ScannerApp() {
  const [step, setStep] = useState<Step>(1)
  const [gender, setGender] = useState<Gender | ''>('')
  const [ageGroup, setAgeGroup] = useState<AgeGroup | ''>('')
  const [result, setResult] = useState<AnalysisResult | null>(null)

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-4 pb-12 pt-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="toy-press flex size-11 items-center justify-center rounded-xl border-4 border-toy-ink bg-toy-yellow">
            <ScanLine className="size-6 text-toy-ink" aria-hidden="true" />
          </span>
          <h1 className="font-display text-3xl font-bold text-white [text-shadow:0_3px_0_var(--toy-ink)]">
            LabelLens
          </h1>
        </div>
        <StepDots step={step} />
      </header>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        >
          {step === 1 && (
            <StepOnboarding
              gender={gender}
              ageGroup={ageGroup}
              onGenderChange={setGender}
              onAgeGroupChange={setAgeGroup}
              onNext={() => setStep(2)}
            />
          )}
          {step === 2 && gender && ageGroup && (
            <StepUpload
              gender={gender}
              ageGroup={ageGroup}
              onBack={() => setStep(1)}
              onResult={(data) => {
                setResult(data)
                setStep(3)
              }}
            />
          )}
          {step === 3 && result && (
            <StepResults
              result={result}
              onRestart={() => {
                setResult(null)
                setStep(2)
              }}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </main>
  )
}

function StepDots({ step }: { step: Step }) {
  return (
    <ol className="flex items-center gap-1.5" aria-label={`Step ${step} of 3`}>
      {[1, 2, 3].map((n) => (
        <li
          key={n}
          aria-current={n === step ? 'step' : undefined}
          className={`h-4 rounded-full border-[3px] border-toy-ink transition-all ${
            n === step ? 'w-8 bg-toy-yellow' : n < step ? 'w-4 bg-toy-green' : 'w-4 bg-white'
          }`}
        >
          <span className="sr-only">Step {n}</span>
        </li>
      ))}
    </ol>
  )
}
