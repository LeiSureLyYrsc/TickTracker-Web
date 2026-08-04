import type { ReactNode } from 'react'
import Box from '@mui/material/Box'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import type { ColumnCount } from '../lib/columns'

interface Props<T> {
  items: T[]
  columns: ColumnCount
  renderItem: (item: T) => ReactNode
  gap?: number
}

export default function MasonryColumns<T>({ items, columns, renderItem, gap = 2 }: Props<T>) {
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))
  const effective = isDesktop ? columns : 1

  if (effective === 1) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap }}>
        {items.map((item, i) => (
          <Box key={i}>{renderItem(item)}</Box>
        ))}
      </Box>
    )
  }

  const cols: T[][] = Array.from({ length: effective }, () => [])
  items.forEach((item, i) => {
    cols[i % effective].push(item)
  })

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap,
      }}
    >
      {cols.map((col, ci) => (
        <Box key={ci} sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap }}>
          {col.map((item, ii) => (
            <Box key={ii} sx={{ breakInside: 'avoid' }}>
              {renderItem(item)}
            </Box>
          ))}
        </Box>
      ))}
    </Box>
  )
}
