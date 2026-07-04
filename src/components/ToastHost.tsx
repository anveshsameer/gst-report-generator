import { useToastStore } from '../store/useToastStore'

const VARIANT_CLASSES: Record<string, string> = {
  success: 'bg-emerald-600 text-white',
  error: 'bg-red-600 text-white',
  info: 'bg-slate-800 text-white',
}

export function ToastHost() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 top-2 z-50 flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => dismiss(t.id)}
          className={`pointer-events-auto w-full max-w-sm rounded-lg px-4 py-2 text-left text-sm shadow-lg ${VARIANT_CLASSES[t.variant]}`}
        >
          {t.message}
        </button>
      ))}
    </div>
  )
}
