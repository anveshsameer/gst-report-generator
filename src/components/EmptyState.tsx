import type { ComponentType, SVGProps } from 'react'
import { Link } from 'react-router-dom'

interface EmptyStateProps {
  icon: ComponentType<SVGProps<SVGSVGElement>>
  title: string
  description: string
  action?: { label: string; to: string }
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-stone-300 px-6 py-10 text-center dark:border-stone-700">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
        <Icon className="h-7 w-7" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">{title}</p>
        <p className="text-sm text-stone-500 dark:text-stone-400">{description}</p>
      </div>
      {action && (
        <Link
          to={action.to}
          className="mt-1 rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
        >
          {action.label}
        </Link>
      )}
    </div>
  )
}
