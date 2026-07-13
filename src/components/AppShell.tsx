import { NavLink, Outlet } from 'react-router-dom'
import { ToastHost } from './ToastHost'
import { GenerateIcon, HistoryIcon, HomeIcon, ItemsIcon, SettingsIcon } from './icons'

const NAV_ITEMS = [
  { to: '/', label: 'Home', end: true, Icon: HomeIcon },
  { to: '/items', label: 'Items', end: false, Icon: ItemsIcon },
  { to: '/generate', label: 'Generate', end: false, Icon: GenerateIcon },
  { to: '/history', label: 'History', end: false, Icon: HistoryIcon },
  { to: '/settings', label: 'Settings', end: false, Icon: SettingsIcon },
]

export function AppShell() {
  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col bg-gradient-to-b from-amber-50 via-stone-50 to-stone-50 text-stone-900 dark:from-stone-950 dark:via-stone-950 dark:to-stone-950 dark:text-stone-100">
      <ToastHost />

      <header className="border-b border-stone-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-stone-800 dark:bg-stone-900/80">
        <h1 className="text-lg font-semibold text-rose-900 dark:text-amber-400">GST Report Generator</h1>
      </header>

      <main
        className="flex-1 overflow-y-auto px-4 pt-4"
        style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
      >
        <Outlet />
      </main>

      <nav
        className="no-print fixed inset-x-0 bottom-0 mx-auto flex max-w-2xl border-t border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {NAV_ITEMS.map(({ to, label, end, Icon: NavIcon }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
                isActive ? 'text-amber-700 dark:text-amber-400' : 'text-stone-500 dark:text-stone-400'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`flex h-8 w-12 items-center justify-center rounded-full transition-colors ${
                    isActive ? 'bg-amber-100 dark:bg-amber-500/15' : ''
                  }`}
                >
                  <NavIcon className="h-5 w-5" />
                </span>
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
