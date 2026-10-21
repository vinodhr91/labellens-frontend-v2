'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, ArrowRight } from 'lucide-react'
import Image from 'next/image'
import { AGE_GROUPS, GENDERS, type AgeGroup, type Gender } from '@/lib/scanner'
import { ToyButton } from './toy-button'

const AGE_LABELS: Record<AgeGroup, string> = {
  'under-2': 'Under 2',
  '1-3': '1 – 3 years',
  '4-6': '4 – 6 years',
  '7-9': '7 – 9 years',
  '10+': '10+ years',
}

function avatarFor(gender: Gender | '', age: AgeGroup | '') {
  if (age === 'under-2' || age === '1-3') return { src: '/avatars/baby.png', alt: 'Cartoon baby avatar' }
  if (!gender) return null
  return { src: `/avatars/${gender.toLowerCase()}.png`, alt: `Cartoon ${gender.toLowerCase()} avatar` }
}

export function StepOnboarding({
  gender,
  ageGroup,
  onGenderChange,
  onAgeGroupChange,
  onNext,
}: {
  gender: Gender | ''
  ageGroup: AgeGroup | ''
  onGenderChange: (g: Gender) => void
  onAgeGroupChange: (a: AgeGroup) => void
  onNext: () => void
}) {
  const avatar = avatarFor(gender, ageGroup)
  const caption = [gender, ageGroup && `Age ${AGE_LABELS[ageGroup].replace(' years', '')}`].filter(Boolean).join(' · ')

  return (
    <section className="flex flex-col gap-6" aria-labelledby="onboarding-title">
      <div className="toy-block flex flex-col items-center gap-2 overflow-hidden p-5 text-center">
        <h2 id="onboarding-title" className="text-2xl font-bold text-toy-ink text-balance">
          {"Who's eating this snack?"}
        </h2>
        <p className="text-muted-foreground text-pretty">
          {"We'll compare the label with daily limits for this person."}
        </p>

        <div className="relative mt-2 flex size-52 items-center justify-center rounded-full border-4 border-toy-ink bg-gradient-to-b from-toy-yellow to-[#ffe98a]">
          <AnimatePresence mode="wait">
            {avatar ? (
              <motion.div
                key={avatar.src}
                initial={{ scale: 0.3, rotate: -15, opacity: 0, y: 30 }}
                animate={{ scale: 1, rotate: 0, opacity: 1, y: 0 }}
                exit={{ scale: 0.3, opacity: 0, y: 30 }}
                transition={{ type: 'spring', stiffness: 380, damping: 16 }}
                className="relative size-48 overflow-hidden rounded-full"
              >
                <Image src={avatar.src} alt={avatar.alt} fill sizes="192px" className="object-cover" priority />
              </motion.div>
            ) : (
              <motion.span
                key="placeholder"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="font-display text-7xl font-bold text-toy-ink/40"
                aria-hidden="true"
              >
                ?
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <p className="font-display min-h-7 text-lg font-semibold text-toy-ink" aria-live="polite">
          {caption || 'Pick below to meet your buddy!'}
        </p>
      </div>

      <div className="toy-block flex flex-col gap-4 p-5">
        <ToySelect
          id="gender"
          label="Gender"
          value={gender}
          placeholder="Choose gender"
          options={GENDERS.map((g) => ({ value: g, label: g }))}
          onChange={(v) => onGenderChange(v as Gender)}
        />
        <ToySelect
          id="age"
          label="Age Group"
          value={ageGroup}
          placeholder="Choose age group"
          options={AGE_GROUPS.map((a) => ({ value: a, label: AGE_LABELS[a] }))}
          onChange={(v) => onAgeGroupChange(v as AgeGroup)}
        />
      </div>

      <ToyButton onClick={onNext} disabled={!gender || !ageGroup} className="w-full py-5 text-2xl">
        Next
        <ArrowRight className="size-7" strokeWidth={3} aria-hidden="true" />
      </ToyButton>
    </section>
  )
}

function ToySelect({
  id,
  label,
  value,
  placeholder,
  options,
  onChange,
}: {
  id: string
  label: string
  value: string
  placeholder: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-display text-lg font-semibold text-toy-ink">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="font-display w-full appearance-none rounded-2xl border-4 border-toy-ink bg-[#eef8ff] px-4 py-3.5 pr-12 text-lg font-semibold text-toy-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-toy-yellow"
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-4 top-1/2 size-6 -translate-y-1/2 text-toy-ink"
          strokeWidth={3}
          aria-hidden="true"
        />
      </div>
    </div>
  )
}
