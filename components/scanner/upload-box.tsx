'use client'

import { Camera, ImageIcon, ImagePlus, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type PickedImage = { file: File; url: string }

export function UploadBox({
  id,
  label,
  hint,
  value,
  onChange,
}: {
  id: string
  label: string
  hint: string
  value: PickedImage | null
  onChange: (v: PickedImage | null) => void
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
            onClick={() => onChange(null)}
            className="flex size-10 shrink-0 items-center justify-center rounded-full border-[3px] border-toy-ink bg-white text-toy-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-toy-yellow"
            aria-label={`Remove ${label} photo`}
          >
            <X className="size-5" strokeWidth={3} aria-hidden="true" />
          </button>
        )}
      </div>

      {value ? (
        <div className="overflow-hidden rounded-[1.4rem] border-4 border-toy-ink">
          {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
          <img src={value.url} alt={`${label} preview`} className="h-56 w-full object-cover" />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-[1.4rem] border-4 border-dashed border-toy-ink/40 bg-[#eef8ff] px-4 py-6 text-center">
          <ImageIcon className="size-10 text-toy-ink/50" strokeWidth={2.5} aria-hidden="true" />
          <span className="text-sm font-semibold text-muted-foreground">No photo yet</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <PickButton htmlFor={`${id}-camera`} color="bg-toy-yellow text-toy-ink">
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
        <PickButton htmlFor={id} color="bg-white text-toy-ink">
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
}: {
  htmlFor: string
  color: string
  children: React.ReactNode
}) {
  return (
    <label
      htmlFor={htmlFor}
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
