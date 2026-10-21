import { formatNutrient } from '@/lib/scanner'

const ITEMS = [
  { label: 'Protein', keys: ['protein_g', 'protein', 'proteins'], color: 'bg-toy-green' },
  { label: 'Carbs', keys: ['carbs_g', 'carbs', 'carbohydrates', 'total_carbs'], color: 'bg-toy-yellow' },
  { label: 'Total Fat', keys: ['total_fat_g', 'total_fat', 'fat'], color: 'bg-toy-orange' },
]

export function NutrientsGrid({ nutrients }: { nutrients: Record<string, unknown> }) {
  return (
    <article className="toy-block p-5" aria-labelledby="other-title">
      <h3 id="other-title" className="text-xl font-bold text-toy-ink">
        Other Nutrients
      </h3>
      <dl className="mt-3 grid grid-cols-3 gap-3">
        {ITEMS.map((item) => {
          const key = item.keys.find((k) => nutrients[k] != null)
          return (
            <div key={item.label} className="flex flex-col items-center gap-1 rounded-2xl border-[3px] border-toy-ink bg-[#eef8ff] p-3 text-center">
              <span className={`size-3 rounded-full border-2 border-toy-ink ${item.color}`} aria-hidden="true" />
              <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{item.label}</dt>
              <dd className="font-display text-xl font-bold text-toy-ink">
                {formatNutrient(key ? nutrients[key] : undefined)}
              </dd>
            </div>
          )
        })}
      </dl>
    </article>
  )
}
