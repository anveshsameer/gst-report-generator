import Dexie, { type EntityTable } from 'dexie'
import type { Item, Bill, MonthlyReportRecord, Settings } from '../types'
import { SEED_ITEMS } from './seedItems'

const db = new Dexie('gst-report-generator') as Dexie & {
  items: EntityTable<Item, 'id'>
  bills: EntityTable<Bill, 'id'>
  monthlyReports: EntityTable<MonthlyReportRecord, 'id'>
  settings: EntityTable<Settings, 'id'>
}

db.version(1).stores({
  items: '++id, &code, name',
  bills: '++id, monthlyReportId, billNumber, date, itemId',
  monthlyReports: '++id, year, month',
  settings: '++id',
})

db.on('populate', async () => {
  await db.items.bulkAdd(SEED_ITEMS)
  await db.settings.add({
    businessName: 'My Sweets Shop',
    branchLabel: '',
    defaultGstRatePercent: 5,
  })
})

export const SETTINGS_ID = 1

export { db }
