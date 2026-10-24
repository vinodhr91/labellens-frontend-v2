'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, ArrowLeft, ChevronDown, ScanLine, X } from 'lucide-react'
import { API_URL, isFemaleGender, type AgeGroup, type AnalysisResult, type Gender } from '@/lib/scanner'
import { getStoredProfiles, getActiveProfileName, setActiveProfileName, type Profile } from '@/lib/storage'
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
  const [pendingProfileSwitch, setPendingProfileSwitch] = useState<Profile | null>(null)

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
              handleRequestCancelScan(() => setShowProfileModal(true))
            } else {
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

      {/* Scan Mode Toggle: Single Scan vs Compare */}
      <div className="flex flex-col items-center gap-1.5 w-full">
        <div className="inline-flex rounded-full border-3 border-toy-ink bg-white p-1 shadow-[0_3px_0_0_var(--toy-ink)]">
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              if (loading) return
              setScanMode('single')
              setImage2(null)
            }}
            className={`font-display rounded-full px-5 py-2 text-sm sm:text-base font-bold transition-all ${
              loading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
            } ${
              scanMode === 'single'
                ? 'border-2 border-toy-ink bg-toy-yellow text-toy-ink shadow-[0_2px_0_0_var(--toy-ink)]'
                : 'text-toy-ink/60 hover:text-toy-ink'
            }`}
          >
            📷 Single Scan
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              if (loading) return
              setScanMode('compare')
            }}
            className={`font-display rounded-full px-5 py-2 text-sm sm:text-base font-bold transition-all ${
              loading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
            } ${
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

      {error && (
        <div role="alert" className="toy-block border-toy-red bg-[#ffe3e3] p-4 text-sm font-semibold text-toy-red">
          {"Oops! We couldn't scan that. "}
          <span className="block break-words font-normal text-toy-ink">{error}</span>
        </div>
      )}

      {/* Unified Scan Action & Loading Carousel Container */}
      <div className="flex flex-col gap-3">
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
            onClick={() => setShowProfileModal(false)}
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
                    <button
                      key={p.id || p.name}
                      type="button"
                      onClick={() => {
                        setShowProfileModal(false)
                        if (!isActive) {
                          setPendingProfileSwitch(p)
                        }
                      }}
                      className={`toy-press flex items-center justify-between rounded-xl border-3 border-toy-ink p-3 text-left transition-all cursor-pointer ${
                        isActive
                          ? 'bg-toy-yellow text-toy-ink shadow-[0_2px_0_0_var(--toy-ink)]'
                          : 'bg-white text-toy-ink hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getProfileEmoji(p.gender, p.age_group)}</span>
                        <div>
                          <p className="font-display text-sm font-bold leading-tight">{p.name}</p>
                          <p className="text-[11px] font-semibold text-toy-ink/70">
                            {p.gender} · {p.age_group} yrs
                          </p>
                        </div>
                      </div>
                      {isActive && (
                        <span className="rounded-full border-2 border-toy-ink bg-white px-2 py-0.5 text-[10px] font-black uppercase text-toy-ink">
                          Active
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
