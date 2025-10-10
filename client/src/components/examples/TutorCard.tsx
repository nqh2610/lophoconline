import { TutorCard } from '../TutorCard'
import { ThemeProvider } from '../ThemeProvider'
import tutor1Avatar from '@assets/stock_images/vietnamese_female_te_395ea66e.jpg'

export default function TutorCardExample() {
  const mockTutor = {
    id: '1',
    name: 'Nguyễn Thị Mai',
    avatar: tutor1Avatar,
    subjects: [
      { name: 'Toán', grades: 'lớp 10-12' },
      { name: 'Lý', grades: 'lớp 10-12' }
    ],
    rating: 4.9,
    reviewCount: 128,
    hourlyRate: 200000,
    experience: '5 năm kinh nghiệm dạy THPT',
    verified: true,
    hasVideo: true,
    occupation: 'teacher' as const,
    availableSlots: ['T2, T4, T6 (19h-21h)', 'T7, CN (14h-20h)']
  }

  return (
    <ThemeProvider>
      <div className="p-4 max-w-md">
        <TutorCard {...mockTutor} />
      </div>
    </ThemeProvider>
  )
}
