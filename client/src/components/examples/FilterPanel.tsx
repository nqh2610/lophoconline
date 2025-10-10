import { FilterPanel } from '../FilterPanel'
import { ThemeProvider } from '../ThemeProvider'

export default function FilterPanelExample() {
  return (
    <ThemeProvider>
      <div className="p-4 max-w-sm">
        <FilterPanel />
      </div>
    </ThemeProvider>
  )
}
