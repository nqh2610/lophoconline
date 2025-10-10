import { LessonCard } from '../LessonCard'
import { ThemeProvider } from '../ThemeProvider'

export default function LessonCardExample() {
  const mockLesson = {
    id: '1',
    tutorName: 'Nguyễn Văn A',
    tutorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=1',
    subject: 'Toán lớp 10',
    date: '15/10/2025',
    time: '19:00 - 20:00',
    status: 'confirmed' as const,
    price: 150000,
  }

  return (
    <ThemeProvider>
      <div className="p-4 max-w-md">
        <LessonCard {...mockLesson} />
      </div>
    </ThemeProvider>
  )
}
