'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, ArrowLeft, ChevronDown, Loader2, Plus, ScanLine, X } from 'lucide-react'
import { API_URL, isFemaleGender, type AgeGroup, type AnalysisResult, type Gender } from '@/lib/scanner'
import {
  getStoredProfiles,
  getActiveProfileName,
  setActiveProfileName,
  clearTodayPlate,
  updateStoredProfile,
  type Profile,
} from '@/lib/storage'
import { ToyButton } from './toy-button'
import { UploadBox, type PickedImage } from './upload-box'
import { PaywallModal } from './paywall-modal'

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
    arr[j] = temp
  }
  return arr
}

function getProfileEmoji(gender?: string, ageGroup?: string): string {
  const isFemale = isFemaleGender(gender || '')
  const isAdult = ageGroup === '10+'
  if (isFemale) {
    return isAdult ? '👩' : '👧'
  }
  return isAdult ? '👨' : '👦'
}

export function StepUpload({
  gender,
  ageGroup,
  profileName: initialProfileName,
  onProfileChange,
  onBack,
  onResult,
  onLoadingChange,
}: {
  gender: Gender
  ageGroup: AgeGroup
  profileName?: string
  onProfileChange?: (profile: { name: string; gender: Gender; age_group: AgeGroup }) => void
  onBack: () => void
  onResult: (data: AnalysisResult) => void
  onLoadingChange?: (loading: boolean) => void
}) {
  const currentProfileName = initialProfileName || getActiveProfileName()
  const [storedProfiles, setStoredProfiles] = useState<Profile[]>([])

  const [scanMode, setScanMode] = useState<'single' | 'compare'>('single')
  const [image1, setImage1] = useState<PickedImage | null>(null)
  const [image2, setImage2] = useState<PickedImage | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shuffledFacts, setShuffledFacts] = useState<string[]>(() => shuffleFacts(HEALTH_FACTS))
  const [factIndex, setFactIndex] = useState(0)

  // AbortController for scan cancellation
  const abortControllerRef = useRef<AbortController | null>(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [pendingCancelAction, setPendingCancelAction] = useState<(() => void) | null>(null)

  // Profile selector and warning modals
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [modalMode, setModalMode] = useState<'list' | 'edit'>('list')
  const [showPaywall, setShowPaywall] = useState(false)
  const [showResetCautionModal, setShowResetCautionModal] = useState(false)
  const [pendingProfileSwitch, setPendingProfileSwitch] = useState<Profile | null>(null)

  // Edit profile form state
  const [editName, setEditName] = useState(currentProfileName)
  const [editGender, setEditGender] = useState<Gender>(gender)
  const [editAgeGroup, setEditAgeGroup] = useState<AgeGroup>(ageGroup)

  const handleAttemptSaveProfile = () => {
    const active =
      storedProfiles.find((p) => p.name.toLowerCase() === currentProfileName.toLowerCase()) ||
      storedProfiles[0]

    const targetGender = active?.gender || gender
    const targetAge = active?.age_group || ageGroup

    const genderChanged = editGender.toLowerCase() !== targetGender.toLowerCase()
    const ageGroupChanged = editAgeGroup !== targetAge

    if (genderChanged || ageGroupChanged) {
      setShowResetCautionModal(true)
    } else {
      executeSaveProfile(false)
    }
  }

  const executeSaveProfile = (resetPlate: boolean) => {
    const trimmedName = editName.trim() || currentProfileName
    const updated = {
      name: trimmedName,
      gender: editGender,
      age_group: editAgeGroup,
    }

    const res = updateStoredProfile(currentProfileName, updated)
    if (res.success && res.profile) {
      if (resetPlate) {
        clearTodayPlate(currentProfileName)
        if (trimmedName.toLowerCase() !== currentProfileName.toLowerCase()) {
          clearTodayPlate(trimmedName)
        }
      }
      onProfileChange?.({
        name: res.profile.name,
        gender: res.profile.gender as Gender,
        age_group: res.profile.age_group as AgeGroup,
      })
      setStoredProfiles(getStoredProfiles())
    }

    setShowResetCautionModal(false)
    setModalMode('list')
    setShowProfileModal(false)
  }

  useEffect(() => {
    setStoredProfiles(getStoredProfiles())
  }, [showProfileModal, currentProfileName])

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

  const handleRequestCancelScan = (action: () => void) => {
    setPendingCancelAction(() => action)
    setShowCancelModal(true)
  }

  const handleConfirmCancelScan = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setLoading(false)
    if (onLoadingChange) onLoadingChange(false)
    setShowCancelModal(false)
    if (pendingCancelAction) {
      const action = pendingCancelAction
      setPendingCancelAction(null)
      setTimeout(() => action(), 50)
    }
  }

  const handleDismissCancelModal = () => {
    setShowCancelModal(false)
    setPendingCancelAction(null)
  }

  async function handleScan() {
    if (!image1 || loading) return
    if (scanMode === 'compare' && !image2) return

    const controller = new AbortController()
    abortControllerRef.current = controller

    setShuffledFacts(shuffleFacts(HEALTH_FACTS))
    setFactIndex(0)
    setLoading(true)
    if (onLoadingChange) onLoadingChange(true)
    setError(null)

    try {
      const form = new FormData()
      form.append('age_group', ageGroup)
      form.append('gender', gender)
      form.append('profile_name', currentProfileName || 'Default Profile')
      form.append('image1', image1.file)
      if (scanMode === 'compare' && image2) {
        form.append('image2', image2.file)
      }

      const res = await fetch(API_URL, {
        method: 'POST',
        body: form,
        signal: controller.signal,
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(text || `Server responded with ${res.status}`)
      }
      const data = (await res.json()) as AnalysisResult
      onResult(data)
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return
      }
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
      if (onLoadingChange) onLoadingChange(false)
      abortControllerRef.current = null
    }
  }

  return (
    <section className="flex flex-col gap-5" aria-labelledby="upload-title">
      {/* Profile Header: Clickable badge at the top showing active profile */}
      <div className="flex items-center justify-center -mt-1">
        <button
          type="button"
          onClick={() => {
            if (loading) {
              handleRequestCancelScan(() => {
                setModalMode('list')
                setStoredProfiles(getStoredProfiles())
                setShowProfileModal(true)
              })
            } else {
              setModalMode('list')
              setStoredProfiles(getStoredProfiles())
              setShowProfileModal(true)
            }
          }}
          className="toy-press font-display inline-flex items-center gap-2 rounded-full border-3 border-toy-ink bg-white px-4 py-1.5 text-xs sm:text-sm font-bold text-toy-ink shadow-[0_3px_0_0_var(--toy-ink)] hover:bg-toy-yellow/20 transition-all cursor-pointer"
          aria-label={`Active profile: ${currentProfileName}. Click to change profile.`}
        >
          <span className="text-base sm:text-lg leading-none">{getProfileEmoji(gender, ageGroup)}</span>
          <span className="truncate max-w-[170px]">{currentProfileName}</span>
          <ChevronDown className="size-4 stroke-[3] text-toy-ink/70" />
        </button>
      </div>

      {/* Two Large Distinct Mode Buttons Side-by-Side */}
      <div className="grid grid-cols-2 gap-3 w-full">
        {/* Button 1: Scan One Product */}
        <button
          type="button"
          disabled={loading}
          onClick={() => {
            if (loading) return
            setScanMode('single')
            setImage2(null)
          }}
          className={`toy-press flex flex-col items-center justify-center gap-1.5 rounded-2xl border-4 border-toy-ink p-3.5 sm:p-4 text-center transition-all ${
            loading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
          } ${
            scanMode === 'single'
              ? 'bg-toy-yellow text-toy-ink shadow-[0_4px_0_0_var(--toy-ink)] scale-[1.02]'
              : 'bg-white text-toy-ink/70 hover:text-toy-ink hover:bg-[#fffef0] shadow-[0_3px_0_0_var(--toy-ink)]'
          }`}
        >
          <span className="text-2xl sm:text-3xl leading-none">📷</span>
          <span className="font-display text-xs sm:text-sm font-black uppercase tracking-wide leading-tight">
            Scan One Product
          </span>
          <span
            className={`font-display text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              scanMode === 'single'
                ? 'bg-white border-toy-ink text-toy-ink shadow-xs'
                : 'border-transparent text-muted-foreground'
            }`}
          >
            {scanMode === 'single' ? '✓ Selected' : 'Single'}
          </span>
        </button>

        {/* Button 2: Compare Two Products */}
        <button
          type="button"
          disabled={loading}
          onClick={() => {
            if (loading) return
            setScanMode('compare')
          }}
          className={`toy-press flex flex-col items-center justify-center gap-1.5 rounded-2xl border-4 border-toy-ink p-3.5 sm:p-4 text-center transition-all ${
            loading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
          } ${
            scanMode === 'compare'
              ? 'bg-toy-yellow text-toy-ink shadow-[0_4px_0_0_var(--toy-ink)] scale-[1.02]'
              : 'bg-white text-toy-ink/70 hover:text-toy-ink hover:bg-[#fffef0] shadow-[0_3px_0_0_var(--toy-ink)]'
          }`}
        >
          <span className="text-2xl sm:text-3xl leading-none">⚖️</span>
          <span className="font-display text-xs sm:text-sm font-black uppercase tracking-wide leading-tight">
            Compare Two Products
          </span>
          <span
            className={`font-display text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              scanMode === 'compare'
                ? 'bg-white border-toy-ink text-toy-ink shadow-xs'
                : 'border-transparent text-muted-foreground'
            }`}
          >
            {scanMode === 'compare' ? '✓ Selected' : 'Comparison'}
          </span>
        </button>
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
              isScanning={loading}
              onRequestCancelScan={handleRequestCancelScan}
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
              isScanning={loading}
              onRequestCancelScan={handleRequestCancelScan}
            />
            <UploadBox
              id="product-b"
              label="Product B"
              hint="Label photo for Product B"
              value={image2}
              onChange={setImage2}
              isScanning={loading}
              onRequestCancelScan={handleRequestCancelScan}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* "Did You Know?" Fact Card directly below the image while scanning */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 350, damping: 26 }}
            className="toy-block bg-[#fffbe6] border-4 border-toy-ink p-4 flex flex-col items-center gap-2.5 text-center shadow-[0_4px_0_0_var(--toy-ink)]"
            aria-live="polite"
          >
            {/* Spinning loading icon next to 'Did You Know?' text */}
            <div className="inline-flex items-center gap-2 rounded-full border-2 border-toy-ink bg-toy-yellow px-3 py-1 text-xs font-black uppercase tracking-wider text-toy-ink shadow-[0_1.5px_0_0_var(--toy-ink)]">
              <Loader2 className="size-4 animate-spin text-toy-ink stroke-[3]" aria-hidden="true" />
              <span>Did You Know?</span>
            </div>

            {/* Fact carousel */}
            <div className="relative min-h-[64px] sm:min-h-[72px] w-full flex items-center justify-center overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.p
                  key={factIndex}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.45, ease: 'easeInOut' }}
                  className="font-display text-xs sm:text-sm md:text-base font-bold text-toy-ink leading-snug px-2 text-balance"
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

      {error && (
        <div role="alert" className="toy-block border-toy-red bg-[#ffe3e3] p-4 text-sm font-semibold text-toy-red">
          {"Oops! We couldn't scan that. "}
          <span className="block break-words font-normal text-toy-ink">{error}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <ToyButton
          variant="white"
          onClick={() => {
            if (loading) {
              handleRequestCancelScan(() => onBack())
            } else {
              onBack()
            }
          }}
          aria-label="Back"
          className="px-4"
        >
          <ArrowLeft className="size-7" strokeWidth={3} aria-hidden="true" />
        </ToyButton>

        <ToyButton
          onClick={handleScan}
          disabled={!canScan}
          className="flex-1 py-5 text-xl sm:text-2xl"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <ScanLine className="size-7 animate-pulse" strokeWidth={3} aria-hidden="true" />
              <span>Scanning…</span>
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

      {/* Cancellation Confirmation Modal */}
      <AnimatePresence>
        {showCancelModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-toy-ink/65 backdrop-blur-xs"
            onClick={handleDismissCancelModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 15 }}
              transition={{ type: 'spring', stiffness: 380, damping: 25 }}
              className="toy-block relative w-full max-w-sm bg-white p-6 shadow-2xl text-left"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="cancel-scan-title"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border-3 border-toy-ink bg-toy-orange text-white shadow-[0_2px_0_0_var(--toy-ink)]">
                  <AlertTriangle className="size-6" strokeWidth={2.5} />
                </span>
                <h4 id="cancel-scan-title" className="font-display text-xl font-bold text-toy-ink">
                  Scan in Progress
                </h4>
              </div>

              <p className="mt-4 text-base font-semibold leading-relaxed text-toy-ink text-pretty">
                Scan in progress. Are you sure you want to cancel?
              </p>

              <div className="mt-6 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={handleConfirmCancelScan}
                  className="toy-press font-display flex w-full items-center justify-center gap-2 rounded-xl border-3 border-toy-ink bg-toy-red py-3 text-base font-bold text-white shadow-[0_3px_0_0_var(--toy-ink)] hover:brightness-105 cursor-pointer"
                >
                  Yes, Cancel Scan
                </button>
                <button
                  type="button"
                  onClick={handleDismissCancelModal}
                  className="toy-press font-display flex w-full items-center justify-center gap-2 rounded-xl border-3 border-toy-ink bg-white py-3 text-sm font-bold text-toy-ink shadow-[0_2px_0_0_var(--toy-ink)] hover:bg-slate-50 cursor-pointer"
                >
                  Keep Scanning
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Profile Selector Modal */}
      <AnimatePresence>
        {showProfileModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-toy-ink/65 backdrop-blur-xs"
            onClick={() => {
              setModalMode('list')
              setShowProfileModal(false)
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 15 }}
              transition={{ type: 'spring', stiffness: 380, damping: 25 }}
              className="toy-block relative w-full max-w-sm bg-white p-5 shadow-2xl text-left"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="profiles-modal-title"
            >
              {modalMode === 'list' ? (
                <>
                  <div className="flex items-center justify-between pb-3 border-b-2 border-toy-ink/15">
                    <h4 id="profiles-modal-title" className="font-display text-lg font-bold text-toy-ink">
                      Family Profiles
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowProfileModal(false)}
                      className="flex size-8 items-center justify-center rounded-full border-2 border-toy-ink bg-muted text-toy-ink hover:scale-105 cursor-pointer"
                      aria-label="Close"
                    >
                      <X className="size-4" strokeWidth={3} />
                    </button>
                  </div>

                  <div className="mt-3 flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                    {storedProfiles.map((p) => {
                      const isActive = p.name.toLowerCase() === currentProfileName.toLowerCase()
                      return (
                        <div
                          key={p.id || p.name}
                          className={`flex items-center justify-between rounded-xl border-3 border-toy-ink p-2.5 sm:p-3 transition-all ${
                            isActive
                              ? 'bg-toy-yellow text-toy-ink shadow-[0_2px_0_0_var(--toy-ink)]'
                              : 'bg-white text-toy-ink hover:bg-slate-50'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              if (!isActive) {
                                setShowProfileModal(false)
                                setPendingProfileSwitch(p)
                              }
                            }}
                            className="flex flex-1 items-center gap-3 text-left cursor-pointer min-w-0"
                          >
                            <span className="text-2xl shrink-0">{getProfileEmoji(p.gender, p.age_group)}</span>
                            <div className="min-w-0">
                              <p className="font-display text-sm font-bold leading-tight truncate">{p.name}</p>
                              <p className="text-[11px] font-semibold text-toy-ink/70">
                                {p.gender} · {p.age_group} yrs
                              </p>
                            </div>
                          </button>

                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            {isActive && (
                              <>
                                <span className="rounded-full border-2 border-toy-ink bg-white px-2 py-0.5 text-[10px] font-black uppercase text-toy-ink">
                                  Active
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setEditName(p.name)
                                    setEditGender((p.gender as Gender) || gender)
                                    setEditAgeGroup((p.age_group as AgeGroup) || ageGroup)
                                    setModalMode('edit')
                                  }}
                                  className="toy-press flex items-center gap-1 rounded-lg border-2 border-toy-ink bg-white px-2 py-1 text-xs font-bold text-toy-ink hover:bg-toy-yellow/30 shadow-[0_1.5px_0_0_var(--toy-ink)] cursor-pointer"
                                  aria-label={`Edit ${p.name}`}
                                >
                                  <span>✏️</span>
                                  <span>Edit</span>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* [ + Add Family Profile ] Button */}
                  <div className="mt-4 pt-3 border-t-2 border-toy-ink/15">
                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileModal(false)
                        setShowPaywall(true)
                      }}
                      className="toy-press font-display flex w-full items-center justify-center gap-2 rounded-xl border-3 border-toy-ink bg-white py-2.5 text-sm font-bold text-toy-ink shadow-[0_2px_0_0_var(--toy-ink)] hover:bg-toy-yellow/20 cursor-pointer"
                    >
                      <Plus className="size-4 stroke-[3]" />
                      <span>+ Add Family Profile</span>
                    </button>
                  </div>
                </>
              ) : (
                /* Edit Profile Form Mode */
                <>
                  <div className="flex items-center justify-between pb-3 border-b-2 border-toy-ink/15">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setModalMode('list')}
                        className="flex size-7 items-center justify-center rounded-full border-2 border-toy-ink bg-white text-toy-ink hover:bg-slate-100 cursor-pointer"
                        aria-label="Back to profiles"
                      >
                        <ArrowLeft className="size-4" strokeWidth={3} />
                      </button>
                      <h4 id="profiles-modal-title" className="font-display text-lg font-bold text-toy-ink">
                        ✏️ Edit Profile
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setModalMode('list')
                        setShowProfileModal(false)
                      }}
                      className="flex size-8 items-center justify-center rounded-full border-2 border-toy-ink bg-muted text-toy-ink hover:scale-105 cursor-pointer"
                      aria-label="Close"
                    >
                      <X className="size-4" strokeWidth={3} />
                    </button>
                  </div>

                  <div className="mt-3 flex flex-col gap-3">
                    {/* Live Avatar Preview */}
                    <div className="flex items-center justify-center">
                      <div className="flex size-14 items-center justify-center rounded-2xl border-3 border-toy-ink bg-toy-yellow shadow-[0_3px_0_0_var(--toy-ink)] text-3xl">
                        {getProfileEmoji(editGender, editAgeGroup)}
                      </div>
                    </div>

                    {/* Name Input */}
                    <div className="flex flex-col gap-1">
                      <label htmlFor="edit-profile-name" className="font-display text-xs font-bold uppercase tracking-wider text-toy-ink">
                        Profile Name
                      </label>
                      <input
                        id="edit-profile-name"
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="e.g. My Son"
                        maxLength={30}
                        className="w-full rounded-xl border-3 border-toy-ink bg-[#fffef0] px-3 py-2 text-sm font-bold text-toy-ink focus:outline-none focus:ring-2 focus:ring-toy-yellow"
                      />
                    </div>

                    {/* Gender Selector */}
                    <div className="flex flex-col gap-1">
                      <label className="font-display text-xs font-bold uppercase tracking-wider text-toy-ink">
                        Gender
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {(['Female', 'Male'] as const).map((g) => {
                          const selected = editGender.toLowerCase() === g.toLowerCase()
                          return (
                            <button
                              key={g}
                              type="button"
                              onClick={() => setEditGender(g)}
                              className={`toy-press rounded-xl border-2 border-toy-ink py-2 text-xs font-bold transition-all cursor-pointer ${
                                selected
                                  ? 'bg-toy-yellow text-toy-ink shadow-[0_2px_0_0_var(--toy-ink)] font-black'
                                  : 'bg-white text-toy-ink/70 hover:text-toy-ink'
                              }`}
                            >
                              {g === 'Female' ? '👧 Female' : '👦 Male'}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Age Group Selector */}
                    <div className="flex flex-col gap-1">
                      <label className="font-display text-xs font-bold uppercase tracking-wider text-toy-ink">
                        Age Group
                      </label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {(['1-3', '4-6', '7-9', '10+'] as const).map((age) => {
                          const selected = editAgeGroup === age
                          return (
                            <button
                              key={age}
                              type="button"
                              onClick={() => setEditAgeGroup(age)}
                              className={`toy-press rounded-xl border-2 border-toy-ink py-1.5 text-xs font-bold transition-all cursor-pointer ${
                                selected
                                  ? 'bg-toy-yellow text-toy-ink shadow-[0_2px_0_0_var(--toy-ink)] font-black'
                                  : 'bg-white text-toy-ink/70 hover:text-toy-ink'
                              }`}
                            >
                              {age === '10+' ? '10+ yrs' : `${age} yrs`}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Save Changes & Cancel */}
                    <div className="mt-2 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={handleAttemptSaveProfile}
                        className="toy-press font-display flex w-full items-center justify-center gap-2 rounded-xl border-3 border-toy-ink bg-toy-yellow py-2.5 text-sm font-bold text-toy-ink shadow-[0_3px_0_0_var(--toy-ink)] hover:brightness-105 cursor-pointer"
                      >
                        💾 Save Changes
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalMode('list')}
                        className="w-full text-center text-xs font-bold text-toy-ink/65 hover:text-toy-ink py-1 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reset Daily Plate Caution Confirmation Modal */}
      <AnimatePresence>
        {showResetCautionModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-toy-ink/65 backdrop-blur-xs"
            onClick={() => setShowResetCautionModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 15 }}
              transition={{ type: 'spring', stiffness: 380, damping: 25 }}
              className="toy-block relative w-full max-w-sm bg-white p-6 shadow-2xl text-left"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="reset-caution-title"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border-3 border-toy-ink bg-toy-orange text-white shadow-[0_2px_0_0_var(--toy-ink)]">
                  <AlertTriangle className="size-6" strokeWidth={2.5} />
                </span>
                <h4 id="reset-caution-title" className="font-display text-xl font-bold text-toy-ink">
                  Reset Daily Plate?
                </h4>
              </div>

              <p className="mt-4 text-sm sm:text-base font-semibold leading-relaxed text-toy-ink text-pretty">
                Changing age or gender will reset today&apos;s Daily Plate because your daily limits are changing. Continue?
              </p>

              <div className="mt-6 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => executeSaveProfile(true)}
                  className="toy-press font-display flex w-full items-center justify-center gap-2 rounded-xl border-3 border-toy-ink bg-toy-yellow py-3 text-base font-bold text-toy-ink shadow-[0_3px_0_0_var(--toy-ink)] hover:brightness-105 cursor-pointer"
                >
                  Continue
                </button>
                <button
                  type="button"
                  onClick={() => setShowResetCautionModal(false)}
                  className="toy-press font-display flex w-full items-center justify-center gap-2 rounded-xl border-3 border-toy-ink bg-white py-3 text-sm font-bold text-toy-ink shadow-[0_2px_0_0_var(--toy-ink)] hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Pro Paywall Modal for + Add Family Profile */}
      <PaywallModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} />

      {/* Profile Switch Warning Modal */}
      <AnimatePresence>
        {pendingProfileSwitch && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-toy-ink/65 backdrop-blur-xs"
            onClick={() => setPendingProfileSwitch(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 15 }}
              transition={{ type: 'spring', stiffness: 380, damping: 25 }}
              className="toy-block relative w-full max-w-sm bg-white p-6 shadow-2xl text-left"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="switch-profile-title"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border-3 border-toy-ink bg-toy-yellow text-toy-ink shadow-[0_2px_0_0_var(--toy-ink)] text-xl">
                  {getProfileEmoji(pendingProfileSwitch.gender, pendingProfileSwitch.age_group)}
                </span>
                <h4 id="switch-profile-title" className="font-display text-xl font-bold text-toy-ink">
                  Switch Profile?
                </h4>
              </div>

              <p className="mt-4 text-sm sm:text-base font-semibold leading-relaxed text-toy-ink text-pretty">
                Switching profiles will load a different Daily Plate. Your current data will be saved under {currentProfileName}. Continue?
              </p>

              <div className="mt-6 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    if (pendingProfileSwitch) {
                      setActiveProfileName(pendingProfileSwitch.name)
                      onProfileChange?.({
                        name: pendingProfileSwitch.name,
                        gender: pendingProfileSwitch.gender as Gender,
                        age_group: pendingProfileSwitch.age_group as AgeGroup,
                      })
                      setPendingProfileSwitch(null)
                    }
                  }}
                  className="toy-press font-display flex w-full items-center justify-center gap-2 rounded-xl border-3 border-toy-ink bg-toy-yellow py-3 text-base font-bold text-toy-ink shadow-[0_3px_0_0_var(--toy-ink)] hover:brightness-105 cursor-pointer"
                >
                  Continue
                </button>
                <button
                  type="button"
                  onClick={() => setPendingProfileSwitch(null)}
                  className="toy-press font-display flex w-full items-center justify-center gap-2 rounded-xl border-3 border-toy-ink bg-white py-3 text-sm font-bold text-toy-ink shadow-[0_2px_0_0_var(--toy-ink)] hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  )
}
