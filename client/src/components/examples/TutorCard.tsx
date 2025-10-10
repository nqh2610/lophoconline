import { TutorCard } from '../TutorCard'
import { ThemeProvider } from '../ThemeProvider'

export default function TutorCardExample() {
  const mockTutor = {
    id: '1',
    name: 'Nguyễn Văn A',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=1',
    subjects: ['Toán', 'Lý', 'Hóa'],
    rating: 4.8,
    reviewCount: 128,
    hourlyRate: 150000,
    experience: '5 năm kinh nghiệm dạy THPT',
    verified: true,
    hasVideo: true,
  }

  return (
    <ThemeProvider>
      <div className="p-4 max-w-md">
        <TutorCard {...mockTutor} />
      </div>
    </ThemeProvider>
  )
}
