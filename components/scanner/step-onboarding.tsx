'use client'

import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, ArrowRight, Lock, Plus, Sparkles, UserCheck, Users } from 'lucide-react'
import Image from 'next/image'
import { AGE_GROUPS, GENDERS, type AgeGroup, type Gender } from '@/lib/scanner'
import {
  getStoredProfiles,
  saveStoredProfile,
  type FamilyProfile,
} from '@/lib/storage'
import { ToyButton } from './toy-button'
import { PaywallModal } from './paywall-modal'

const AGE_LABELS: Record<AgeGroup, string> = {
  'under-2': 'Under 2',
  '1-3': '1 – 3 years',
  '4-6': '4 – 6 years',
  '7-9': '7 – 9 years',
  '10+': '10+ years',
}

const CYCLE_AVATARS = [
  { gender: 'Boy' as Gender, src: '/avatars/boy.png', label: 'Boy' },
  { gender: 'Girl' as Gender, src: '/avatars/girl.png', label: 'Girl' },
  { gender: 'Man' as Gender, src: '/avatars/man.png', label: 'Man' },
  { gender: 'Woman' as Gender, src: '/avatars/woman.png', label: 'Woman' },
]

function lockedAvatarFor(gender: Gender | '', age: AgeGroup | '') {
  if (age === 'under-2' || age === '1-3') {
    return { src: '/avatars/baby.png', alt: 'Cartoon baby avatar' }
  }
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
  // Family Profiles state
  const [profiles, setProfiles] = useState<FamilyProfile[]>([])
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null)
  const [newProfileName, setNewProfileName] = useState('')
  const [showPaywall, setShowPaywall] = useState(false)
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null)

  // Avatar cycling state
  const [cycleIndex, setCycleIndex] = useState(0)

  // Load profiles from localStorage
  useEffect(() => {
    const stored = getStoredProfiles()
    setProfiles(stored)
    if (stored.length > 0 && !gender && !ageGroup) {
      // Auto-select first saved profile if user hasn't made selections yet
      const first = stored[0]
      setActiveProfileId(first.id)
      onGenderChange(first.gender)
      onAgeGroupChange(first.ageGroup)
    }
  }, [])

  // Both Gender and Age must be chosen to lock in
  const isLocked = Boolean(gender && ageGroup)

  // Autocycle through avatars every 1.6s when unlocked
  useEffect(() => {
    if (isLocked) return

    const interval = setInterval(() => {
      setCycleIndex((prev) => (prev + 1) % CYCLE_AVATARS.length)
    }, 1600)

    return () => clearInterval(interval)
  }, [isLocked])

  const lockedAvatar = lockedAvatarFor(gender, ageGroup)
  const currentAvatar = isLocked
    ? lockedAvatar
    : { src: CYCLE_AVATARS[cycleIndex].src, alt: CYCLE_AVATARS[cycleIndex].label }

  // Handle saving current profile
  const handleSaveProfile = () => {
    if (!gender || !ageGroup) {
      alert('Please select both Gender and Age Group before saving a profile!')
      return
    }
    const nameToSave = newProfileName.trim() || `${gender} (${AGE_LABELS[ageGroup]})`
    const avatarSrc = lockedAvatar?.src || '/avatars/boy.png'

    const result = saveStoredProfile({
      name: nameToSave,
      gender,
      ageGroup,
      avatar: avatarSrc,
    })

    if (result.paywall) {
      setShowPaywall(true)
    } else if (result.success && result.profile) {
      setProfiles((prev) => [...prev, result.profile!])
      setActiveProfileId(result.profile.id)
      setNewProfileName('')
      setSaveSuccessMsg(`Saved profile for "${nameToSave}"!`)
      setTimeout(() => setSaveSuccessMsg(null), 3500)
    }
  }

  // Handle click on "+ Add Profile"
  const handleAddProfileClick = () => {
    if (profiles.length >= 1) {
      setShowPaywall(true)
    } else {
      setActiveProfileId(null)
      onGenderChange('' as Gender)
      onAgeGroupChange('' as AgeGroup)
    }
  }

  // Handle selecting an existing profile
  const handleSelectProfile = (p: FamilyProfile) => {
    setActiveProfileId(p.id)
    onGenderChange(p.gender)
    onAgeGroupChange(p.ageGroup)
  }

  return (
    <section className="flex flex-col gap-5" aria-labelledby="onboarding-title">
      {/* Freemium Family Profiles Bar */}
      <div className="toy-block p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-toy-ink">
            <Users className="size-4" />
            <h3 className="font-display text-sm font-bold uppercase tracking-wider">Family Profiles</h3>
          </div>
          <span className="font-display rounded-full border-2 border-toy-ink bg-muted px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
            {profiles.length}/1 Free
          </span>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          {profiles.map((p) => {
            const isSelected = activeProfileId === p.id
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectProfile(p)}
                className={`font-display inline-flex cursor-pointer items-center gap-1.5 rounded-full border-3 border-toy-ink px-3 py-1 text-sm font-bold transition-transform hover:scale-105 active:scale-95 ${
                  isSelected
                    ? 'bg-toy-yellow text-toy-ink shadow-[0_3px_0_0_var(--toy-ink)]'
                    : 'bg-white text-toy-ink/75 hover:bg-muted'
                }`}
              >
                <UserCheck className="size-3.5" />
                <span>{p.name}</span>
              </button>
            )
          })}

          <button
            type="button"
            onClick={handleAddProfileClick}
            className="font-display inline-flex cursor-pointer items-center gap-1 rounded-full border-2 border-dashed border-toy-ink/60 bg-white/70 px-3 py-1 text-xs font-bold text-toy-ink hover:border-toy-ink hover:bg-white"
          >
            <Plus className="size-3.5" />
            <span>Add Profile</span>
            {profiles.length >= 1 && (
              <span className="rounded bg-toy-yellow px-1 py-0.2 text-[10px] font-black text-toy-ink">PRO</span>
            )}
          </button>
        </div>

        {/* Save profile input (when user has 0 saved profiles or is creating their free one) */}
        {profiles.length === 0 && (
          <div className="mt-3 flex items-center gap-2 border-t-2 border-toy-ink/10 pt-3">
            <input
              type="text"
              placeholder="Profile nickname (e.g. My Son)"
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
              className="font-display flex-1 rounded-xl border-2 border-toy-ink bg-[#f8fbff] px-3 py-1.5 text-sm font-semibold text-toy-ink focus:outline-none"
            />
            <button
              type="button"
              onClick={handleSaveProfile}
              disabled={!isLocked}
              className="font-display cursor-pointer rounded-xl border-2 border-toy-ink bg-toy-yellow px-3 py-1.5 text-xs font-bold text-toy-ink shadow-[0_2px_0_0_var(--toy-ink)] hover:brightness-105 disabled:opacity-40"
            >
              Save Profile
            </button>
          </div>
        )}

        {saveSuccessMsg && (
          <p className="mt-2 text-center text-xs font-bold text-toy-green animate-pulse">
            ✓ {saveSuccessMsg}
          </p>
        )}
      </div>

      {/* Main Selection & Swipe-to-Lock Avatar Card */}
      <div className="toy-block flex flex-col items-center gap-5 p-5 text-center">
        <div>
          <h2 id="onboarding-title" className="text-2xl font-bold text-toy-ink text-balance">
            {"Who's eating this snack?"}
          </h2>
          <p className="text-sm font-semibold text-muted-foreground text-pretty mt-0.5">
            Select age and gender to lock in their personalized limits.
          </p>
        </div>

        {/* 1. Gender and Age Dropdowns MOVED TO THE TOP of the card */}
        <div className="grid w-full grid-cols-2 gap-3">
          <ToySelect
            id="gender"
            label="Gender"
            value={gender}
            placeholder="Gender"
            options={GENDERS.map((g) => ({ value: g, label: g }))}
            onChange={(v) => {
              setActiveProfileId(null)
              onGenderChange(v as Gender)
            }}
          />
          <ToySelect
            id="age"
            label="Age Group"
            value={ageGroup}
            placeholder="Age"
            options={AGE_GROUPS.map((a) => ({ value: a, label: AGE_LABELS[a] }))}
            onChange={(v) => {
              setActiveProfileId(null)
              onAgeGroupChange(v as AgeGroup)
            }}
          />
        </div>

        {/* 2. Below Dropdowns: Large Circle with Swipe-to-Lock Avatar */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative flex size-48 items-center justify-center rounded-full border-4 border-toy-ink bg-gradient-to-b from-toy-yellow to-[#ffe98a] shadow-[0_6px_0_0_var(--toy-ink)]">
            <AnimatePresence mode="wait">
              {currentAvatar && (
                <motion.div
                  key={isLocked ? `locked-${currentAvatar.src}` : `cycle-${cycleIndex}`}
                  initial={isLocked ? { scale: 0.7, rotate: -15, opacity: 0 } : { x: 50, opacity: 0, scale: 0.9 }}
                  animate={{ scale: 1, rotate: 0, x: 0, opacity: 1 }}
                  exit={isLocked ? { scale: 0.7, opacity: 0 } : { x: -50, opacity: 0, scale: 0.9 }}
                  transition={
                    isLocked
                      ? { type: 'spring', stiffness: 450, damping: 18 }
                      : { type: 'spring', stiffness: 320, damping: 24 }
                  }
                  className="relative size-44 overflow-hidden rounded-full"
                >
                  <Image
                    src={currentAvatar.src}
                    alt={currentAvatar.alt}
                    fill
                    sizes="176px"
                    className="object-cover"
                    priority
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Lock in Badge */}
            {isLocked && (
              <motion.div
                initial={{ scale: 0, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 16 }}
                className="absolute -bottom-2.5 flex items-center gap-1 rounded-full border-3 border-toy-ink bg-toy-green px-3 py-0.5 text-xs font-bold text-white shadow-[0_2px_0_0_var(--toy-ink)]"
              >
                <Lock className="size-3" strokeWidth={3} />
                <span>Locked In!</span>
              </motion.div>
            )}
          </div>

          {/* Subtitle / Cycling Cue */}
          <div className="min-h-6 pt-1">
            {isLocked ? (
              <p className="font-display text-base font-bold text-toy-ink">
                Ready for {gender} · {ageGroup && AGE_LABELS[ageGroup]}!
              </p>
            ) : (
              <p className="font-display flex items-center justify-center gap-1.5 text-xs font-bold text-toy-ink/70">
                <Sparkles className="size-3.5 text-toy-orange animate-spin" />
                <span>Cycling avatars... Pick gender & age above to lock in!</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Next Step Button */}
      <ToyButton onClick={onNext} disabled={!isLocked} className="w-full py-4 text-xl">
        Next: Scan Food Label
        <ArrowRight className="size-6" strokeWidth={3} aria-hidden="true" />
      </ToyButton>

      {/* Freemium Paywall Modal */}
      <PaywallModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} />
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
    <div className="flex flex-col gap-1 text-left">
      <label htmlFor={id} className="font-display text-sm font-bold text-toy-ink">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="font-display w-full appearance-none rounded-xl border-3 border-toy-ink bg-[#eef8ff] px-3 py-2.5 pr-8 text-sm font-bold text-toy-ink focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-toy-yellow cursor-pointer"
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
          className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-toy-ink"
          strokeWidth={3}
          aria-hidden="true"
        />
      </div>
    </div>
  )
}
