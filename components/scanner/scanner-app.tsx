'use client'

import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Home, ScanLine, UtensilsCrossed } from 'lucide-react'
import type { AgeGroup, AnalysisResult, Gender } from '@/lib/scanner'
import { getActiveProfile, getActiveProfileName, getStoredProfiles, getTodayPlateItems } from '@/lib/storage'
import { StepOnboarding } from './step-onboarding'
import { StepUpload } from './step-upload'
import { StepResults } from './step-results'
import { DailyPlateDashboard } from './daily-plate-dashboard'

type Step = 1 | 2 | 3
type Tab = 'scanner' | 'plate'

export function ScannerApp() {
  const [activeTab, setActiveTab] = useState<Tab>('scanner')
  const [step, setStep] = useState<Step>(1)
  const [gender, setGender] = useState<Gender | ''>('')
  const [ageGroup, setAgeGroup] = useState<AgeGroup | ''>('')
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [profileName, setProfileName] = useState<string>('')
  const [plateCount, setPlateCount] = useState(0)
  const [hasLockedFirstProfile, setHasLockedFirstProfile] = useState(false)
  const [isScanning, setIsScanning] = useState(false)

  // Sync active profile and plate items count
  const syncData = () => {
    const currentName = getActiveProfileName()
    setProfileName(currentName)
    setPlateCount(getTodayPlateItems(currentName).length)
    if (getStoredProfiles().length > 0) {
      setHasLockedFirstProfile(true)
    }
  }

  // Profile Persistence: Check localStorage on app load. If a profile exists, skip onboarding screen!
  useEffect(() => {
    const profiles = getStoredProfiles()
    if (profiles.length > 0) {
      const active = getActiveProfile() || profiles[0]
      setProfileName(active.name)
      if (active.gender) setGender(active.gender as Gender)
      if (active.age_group) setAgeGroup(active.age_group as AgeGroup)
      setHasLockedFirstProfile(true)
      setStep(2) // Skip onboarding, jump straight to Scan screen
      setPlateCount(getTodayPlateItems(active.name).length)
    } else {
      syncData()
    }
  }, [])

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-4 pb-32 pt-6">
      {/* Top App Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="toy-press flex size-11 items-center justify-center rounded-xl border-4 border-toy-ink bg-toy-yellow shadow-[0_3px_0_0_var(--toy-ink)]">
            <ScanLine className="size-6 text-toy-ink" aria-hidden="true" />
          </span>
          <h1 className="font-display text-3xl font-bold text-white [text-shadow:0_3px_0_var(--toy-ink)]">
            LabelLens
          </h1>
        </div>

        {activeTab === 'scanner' && <StepDots step={step} />}
      </header>

      {/* Main Content Area */}
      <AnimatePresence mode="wait">
        {activeTab === 'plate' ? (
          <motion.div
            key="dashboard-tab"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
          >
            <DailyPlateDashboard
              profileName={profileName}
              onNavigateToScan={() => setActiveTab('scanner')}
            />
          </motion.div>
        ) : (
          <motion.div
            key={`step-${step}`}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          >
            {step === 1 && (
              <StepOnboarding
                gender={gender}
                ageGroup={ageGroup}
                onGenderChange={setGender}
                onAgeGroupChange={setAgeGroup}
                onProfileChange={(name) => {
                  setProfileName(name)
                  setPlateCount(getTodayPlateItems(name).length)
                }}
                onProfileLockedChange={(locked) => {
                  if (locked) setHasLockedFirstProfile(true)
                }}
                onNext={() => {
                  setHasLockedFirstProfile(true)
                  setStep(2)
                }}
              />
            )}
            {step === 2 && gender && ageGroup && (
              <StepUpload
                gender={gender}
                ageGroup={ageGroup}
                profileName={profileName}
                onProfileChange={(newProf) => {
                  setProfileName(newProf.name)
                  setGender(newProf.gender)
                  setAgeGroup(newProf.age_group)
                  syncData()
                }}
                onBack={() => setStep(1)}
                onResult={(data) => {
                  setResult(data)
                  setStep(3)
                }}
                onLoadingChange={setIsScanning}
              />
            )}
            {step === 3 && result && (
              <StepResults
                result={result}
                profileName={profileName}
                onRestart={() => {
                  setResult(null)
                  setStep(2)
                }}
                onViewPlate={() => {
                  syncData()
                  setActiveTab('plate')
                }}
                onPlateUpdated={syncData}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation Bar: Only show after user has successfully locked in their first profile */}
      {hasLockedFirstProfile && (step > 1 || activeTab === 'plate') && (
        <nav
          aria-label="Bottom Navigation"
          className={`fixed bottom-3 left-0 right-0 z-40 mx-auto w-full max-w-md px-4 transition-all duration-300 ${
            isScanning ? 'opacity-0 pointer-events-none translate-y-16' : 'opacity-100 translate-y-0'
          }`}
        >
          <div className="toy-block flex items-center justify-around border-3 bg-white/95 p-1.5 shadow-[0_4px_0_0_var(--toy-ink)] backdrop-blur-md">
            <button
              type="button"
              disabled={isScanning}
              onClick={() => !isScanning && setActiveTab('scanner')}
              className={`font-display flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all ${
                isScanning ? 'cursor-not-allowed' : 'cursor-pointer'
              } ${
                activeTab === 'scanner'
                  ? 'border-2 border-toy-ink bg-toy-yellow text-toy-ink shadow-[0_2px_0_0_var(--toy-ink)]'
                  : 'text-toy-ink/65 hover:text-toy-ink'
              }`}
            >
              <Home className="size-4 stroke-[2.5]" />
              <span>Home</span>
            </button>

            <button
              type="button"
              disabled={isScanning}
              onClick={() => {
                if (isScanning) return
                syncData()
                setActiveTab('plate')
              }}
              className={`font-display relative flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all ${
                isScanning ? 'cursor-not-allowed' : 'cursor-pointer'
              } ${
                activeTab === 'plate'
                  ? 'border-2 border-toy-ink bg-toy-yellow text-toy-ink shadow-[0_2px_0_0_var(--toy-ink)]'
                  : 'text-toy-ink/65 hover:text-toy-ink'
              }`}
            >
              <UtensilsCrossed className="size-4 stroke-[2.5]" />
              <span>🍽️ Today&apos;s Plate</span>
              {plateCount > 0 && (
                <span className="flex size-5 items-center justify-center rounded-full border border-toy-ink bg-toy-red text-[10px] font-black text-white shadow-[0_1px_0_0_var(--toy-ink)]">
                  {plateCount}
                </span>
              )}
            </button>
          </div>
        </nav>
      )}
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
