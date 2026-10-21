import { cn } from '@/lib/utils'

type Variant = 'red' | 'yellow' | 'green' | 'white'

const variants: Record<Variant, string> = {
  red: 'bg-toy-red text-white',
  yellow: 'bg-toy-yellow text-toy-ink',
  green: 'bg-toy-green text-white',
  white: 'bg-white text-toy-ink',
}

export function ToyButton({
  variant = 'red',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      className={cn(
        'toy-press font-display inline-flex items-center justify-center gap-2 rounded-2xl border-4 border-toy-ink px-6 py-4 text-xl font-bold tracking-wide',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-toy-yellow focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        className,
      )}
    />
  )
}
