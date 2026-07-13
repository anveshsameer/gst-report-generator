import { useEffect, useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { Field } from '../components/Field'
import { useToastStore } from '../store/useToastStore'
import { CheckIcon, SettingsIcon } from '../components/icons'

export function Settings() {
  const settings = useLiveQuery(() => db.settings.toCollection().first())
  const push = useToastStore((s) => s.push)

  const [businessName, setBusinessName] = useState('')
  const [branchLabel, setBranchLabel] = useState('')
  const [defaultGstRatePercent, setDefaultGstRatePercent] = useState(5)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!settings || loaded) return
    setBusinessName(settings.businessName)
    setBranchLabel(settings.branchLabel)
    setDefaultGstRatePercent(settings.defaultGstRatePercent)
    setLoaded(true)
  }, [settings, loaded])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (settings?.id == null) return
    await db.settings.update(settings.id, { businessName, branchLabel, defaultGstRatePercent })
    push('Settings saved.', 'success')
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-base font-semibold text-rose-900 dark:text-amber-400">
        <SettingsIcon className="h-5 w-5" />
        Settings
      </h2>
      <form
        onSubmit={handleSubmit}
        className="space-y-3 rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900"
      >
        <Field
          label="Business name"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder="Dhanalaxmi Sweets"
        />
        <Field
          label="Branch / location"
          value={branchLabel}
          onChange={(e) => setBranchLabel(e.target.value)}
          placeholder="Kothagudem"
          hint="Shown under the business name on PDF reports."
        />
        <Field
          label="Default GST %"
          type="number"
          min={0}
          max={100}
          step="0.1"
          value={defaultGstRatePercent}
          onChange={(e) => setDefaultGstRatePercent(e.target.valueAsNumber)}
        />
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-1.5 rounded-md bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700"
        >
          <CheckIcon className="h-4 w-4" />
          Save settings
        </button>
      </form>
    </div>
  )
}
