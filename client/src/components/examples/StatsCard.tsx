import { StatsCard } from '../StatsCard'
import { ThemeProvider } from '../ThemeProvider'
import { Calendar } from 'lucide-react'

export default function StatsCardExample() {
  return (
    <ThemeProvider>
      <div className="p-4 max-w-sm">
        <StatsCard
          title="Buổi học tháng này"
          value="24"
          icon={Calendar}
          trend="+12% so với tháng trước"
          testId="stat-lessons"
        />
      </div>
    </ThemeProvider>
  )
}
