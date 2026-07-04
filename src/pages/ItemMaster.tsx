import { useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { ColumnDef } from '@tanstack/react-table'
import { db } from '../db/db'
import { DataTable } from '../components/DataTable'
import { Field } from '../components/Field'
import { Modal } from '../components/Modal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useToastStore } from '../store/useToastStore'
import { formatINR } from '../utils/currency'
import type { Item } from '../types'

const EMPTY_FORM = { code: '', name: '', pricePerKg: '' }

/** Continues the "I001", "I002", … sequence from whatever the highest existing numeric suffix is. */
function nextItemCode(items: Item[]): string {
  const maxNum = items.reduce((max, item) => {
    const match = item.code.match(/(\d+)$/)
    return match ? Math.max(max, parseInt(match[1], 10)) : max
  }, 0)
  return `I${String(maxNum + 1).padStart(3, '0')}`
}

export function ItemMaster() {
  const items = useLiveQuery(() => db.items.orderBy('name').toArray()) ?? []
  const push = useToastStore((s) => s.push)

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null)

  function startAdd() {
    setEditingId(null)
    setForm({ ...EMPTY_FORM, code: nextItemCode(items) })
    setFormOpen(true)
  }

  function startEdit(item: Item) {
    setEditingId(item.id ?? null)
    setForm({ code: item.code, name: item.name, pricePerKg: String(item.pricePerKg) })
    setFormOpen(true)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const price = Number(form.pricePerKg)
    if (!form.name.trim() || !Number.isFinite(price) || price <= 0) {
      push('Enter a valid name and cost per kg.', 'error')
      return
    }
    try {
      if (editingId != null) {
        await db.items.update(editingId, { code: form.code.trim(), name: form.name.trim(), pricePerKg: price })
        push('Item updated.', 'success')
      } else {
        await db.items.add({ code: form.code.trim(), name: form.name.trim(), pricePerKg: price })
        push('Item added.', 'success')
      }
      setFormOpen(false)
    } catch (err) {
      push(err instanceof Error ? err.message : 'Could not save item.', 'error')
    }
  }

  async function handleDelete() {
    if (deleteTarget?.id == null) return
    await db.items.delete(deleteTarget.id)
    push('Item deleted.', 'success')
    setDeleteTarget(null)
  }

  const columns: ColumnDef<Item, any>[] = [
    { header: 'Code', accessorKey: 'code' },
    { header: 'Name', accessorKey: 'name' },
    { header: 'Cost/Kg', accessorKey: 'pricePerKg', cell: (info) => formatINR(info.getValue<number>()) },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => startEdit(row.original)}
            className="text-sm font-medium text-emerald-600 dark:text-emerald-400"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => setDeleteTarget(row.original)}
            className="text-sm font-medium text-red-600 dark:text-red-400"
          >
            Delete
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Item master</h2>
        <button
          type="button"
          onClick={startAdd}
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Add item
        </button>
      </div>

      <DataTable columns={columns} data={items} emptyMessage="No items yet — add your first item." />

      <Modal open={formOpen} title={editingId != null ? 'Edit item' : 'Add item'} onClose={() => setFormOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Code"
              value={form.code}
              readOnly
              tabIndex={-1}
              className="cursor-not-allowed bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
              hint={editingId != null ? 'Locked' : 'Auto-assigned'}
            />
            <Field
              label="Cost per Kg (₹)"
              type="number"
              min={0}
              step="0.01"
              value={form.pricePerKg}
              onChange={(e) => setForm((f) => ({ ...f, pricePerKg: e.target.value }))}
            />
          </div>
          <Field
            label="Item name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="mothichur laddu"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Save
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteTarget != null}
        title="Delete item?"
        message={`Remove "${deleteTarget?.name}" from the item master? Past reports keep their own copy of this data.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
