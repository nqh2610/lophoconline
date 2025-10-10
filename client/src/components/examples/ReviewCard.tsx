import { ReviewCard } from '../ReviewCard'
import { ThemeProvider } from '../ThemeProvider'

export default function ReviewCardExample() {
  const mockReview = {
    id: '1',
    studentName: 'Trần Thị B',
    studentAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=2',
    rating: 5,
    comment: 'Giáo viên dạy rất nhiệt tình và dễ hiểu. Con em đã hiểu bài hơn rất nhiều.',
    date: '10/10/2025',
    subject: 'Toán lớp 10',
  }

  return (
    <ThemeProvider>
      <div className="p-4 max-w-md">
        <ReviewCard {...mockReview} />
      </div>
    </ThemeProvider>
  )
}
