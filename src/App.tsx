import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { Dashboard } from './pages/Dashboard'
import { ItemMaster } from './pages/ItemMaster'
import { Generator } from './pages/Generator'
import { Reports } from './pages/Reports'
import { History } from './pages/History'
import { Settings } from './pages/Settings'

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/items" element={<ItemMaster />} />
          <Route path="/generate" element={<Generator />} />
          <Route path="/history" element={<History />} />
          <Route path="/reports/:reportId" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
