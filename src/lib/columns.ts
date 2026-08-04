import { useCallback, useState } from 'react'

export const COLUMN_OPTIONS = [1, 2, 3, 4] as const

export type ColumnCount = (typeof COLUMN_OPTIONS)[number]

const DEFAULT_COLUMNS: ColumnCount = 2

export function useColumnCount(storageKey: string) {
  const [columns, setColumns] = useState<ColumnCount>(() => {
    const raw = Number(localStorage.getItem(storageKey))
    return (COLUMN_OPTIONS as readonly number[]).includes(raw) ? (raw as ColumnCount) : DEFAULT_COLUMNS
  })

  const change = useCallback(
    (value: ColumnCount) => {
      setColumns(value)
      localStorage.setItem(storageKey, String(value))
    },
    [storageKey],
  )

  return { columns, setColumns: change }
}
