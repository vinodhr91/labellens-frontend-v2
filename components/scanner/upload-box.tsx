'use client'

import { motion } from 'framer-motion'
import { Camera, ImageIcon, ImagePlus, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type PickedImage = { file: File; url: string }

export function UploadBox({
  id,
  label,
  hint,
  value,
  onChange,
  isScanning = false,
  onRequestCancelScan,
}: {
  id: string
  label: string
  hint: string
  value: PickedImage | null
  onChange: (v: PickedImage | null) => void
  isScanning?: boolean
  onRequestCancelScan?: (onConfirm: () => void) => void
}) {
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget
    const file = input.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      onChange({ file, url: String(reader.result) })
      input.value = ''
    }
    reader.readAsDataURL(file)
  }

  function handleRemove() {
    if (isScanning && onRequestCancelScan) {
      onRequestCancelScan(() => onChange(null))
    } else {
      onChange(null)
    }
  }

  function handlePickClick(e: React.MouseEvent, inputId: string) {
    if (isScanning && onRequestCancelScan) {
      e.preventDefault()
      onRequestCancelScan(() => {
        const el = document.getElementById(inputId) as HTMLInputElement | null
        el?.click()
      })
    }
  }

  return (
    <div className="toy-block flex flex-col gap-3 p-3" role="group" aria-labelledby={`${id}-label`}>
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex min-w-0 flex-col">
          <span id={`${id}-label`} className="font-display text-xl font-bold text-toy-ink">
            {label}
          </span>
          <span className="text-sm font-semibold text-muted-foreground">{hint}</span>
        </div>
        {value && (
          <button
            type="button"
            onClick={handleRemove}
            className="flex size-10 shrink-0 items-center justify-center rounded-full border-[3px] border-toy-ink bg-white text-toy-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-toy-yellow"
            aria-label={`Remove ${label} photo`}
          >
            <X className="size-5" strokeWidth={3} aria-hidden="true" />
          </button>
        )}
      </div>

      {value ? (
        <div className="relative overflow-hidden rounded-[1.4rem] border-4 border-toy-ink bg-slate-900/5">
          {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
          <img
            src={value.url}
            alt={`${label} preview`}
            className={cn(
              'h-56 w-full object-cover transition-opacity duration-300',
              isScanning ? 'opacity-70' : 'opacity-100'
            )}
          />

          {isScanning && (
            <>
              {/* Animated horizontal laser beam continuously moving up and down */}
              <motion.div
                className="absolute left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-toy-orange to-transparent shadow-[0_0_14px_4px_rgba(255,107,0,0.85)] z-10 pointer-events-none"
                initial={{ top: '2%' }}
                animate={{ top: ['2%', '96%', '2%'] }}
                transition={{
                  duration: 2.2,
                  ease: 'easeInOut',
                  repeat: Infinity,
                }}
              />
              {/* Subtle pulsing scanner glow */}
              <motion.div
                className="absolute inset-0 bg-toy-orange/10 pointer-events-none z-[5]"
                animate={{ opacity: [0.08, 0.22, 0.08] }}
                transition={{
                  duration: 2.2,
                  ease: 'easeInOut',
                  repeat: Infinity,
                }}
              />
              {/* Active AI Reading badge */}
              <div className="absolute top-2.5 right-2.5 z-10 inline-flex items-center gap-1.5 rounded-full border-2 border-toy-ink bg-toy-yellow/95 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-toy-ink shadow-[0_1.5px_0_0_var(--toy-ink)]">
                <span className="relative flex size-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-toy-red opacity-75"></span>
                  <span className="relative inline-flex rounded-full size-2 bg-toy-red"></span>
                </span>
                <span>AI Reading Label</span>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-[1.4rem] border-4 border-dashed border-toy-ink/40 bg-[#eef8ff] px-4 py-6 text-center">
          <ImageIcon className="size-10 text-toy-ink/50" strokeWidth={2.5} aria-hidden="true" />
          <span className="text-sm font-semibold text-muted-foreground">No photo yet</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <PickButton
          htmlFor={`${id}-camera`}
          color="bg-toy-yellow text-toy-ink"
          onClick={(e) => handlePickClick(e, `${id}-camera`)}
        >
          <Camera className="size-6 shrink-0" strokeWidth={3} aria-hidden="true" />
          {value ? 'Retake' : 'Take Photo'}
          <input
            id={`${id}-camera`}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={handleFile}
          />
        </PickButton>
        <PickButton
          htmlFor={id}
          color="bg-white text-toy-ink"
          onClick={(e) => handlePickClick(e, id)}
        >
          <ImagePlus className="size-6 shrink-0" strokeWidth={3} aria-hidden="true" />
          {value ? 'Change' : 'Upload from Gallery'}
          <input id={id} type="file" accept="image/*" className="sr-only" onChange={handleFile} />
        </PickButton>
      </div>

    </div>
  )
}

function PickButton({
  htmlFor,
  color,
  children,
  onClick,
}: {
  htmlFor: string
  color: string
  children: React.ReactNode
  onClick?: (e: React.MouseEvent) => void
}) {
  return (
    <label
      htmlFor={htmlFor}
      onClick={onClick}
      className={cn(
        'toy-press font-display flex min-h-16 cursor-pointer items-center justify-center gap-2 rounded-2xl border-4 border-toy-ink px-3 py-2 text-center text-base font-bold leading-tight',
        'focus-within:ring-4 focus-within:ring-toy-yellow',
        color,
      )}
    >
      {children}
    </label>
  )
}
