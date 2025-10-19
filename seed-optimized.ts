import * as dotenv from 'dotenv';

// Load environment variables FIRST
dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL not found');
  process.exit(1);
}

console.log('✓ Environment variables loaded');

import { db } from './src/lib/db';
import { users, tutors, subjects, gradeLevels, tutorSubjects, timeSlots } from './src/lib/schema';
import bcrypt from 'bcryptjs';

async function seedOptimizedDatabase() {
  console.log('🌱 Starting optimized database seeding...\n');

  try {
    // ==================== 1. SEED SUBJECTS ====================
    console.log('📚 Seeding subjects...');
    const subjectsData = [
      { name: 'Toán', description: 'Toán học các cấp' },
      { name: 'Tiếng Anh', description: 'Tiếng Anh giao tiếp và học thuật' },
      { name: 'Vật Lý', description: 'Vật lý phổ thông' },
      { name: 'Hóa học', description: 'Hóa học phổ thông' },
      { name: 'Sinh học', description: 'Sinh học phổ thông' },
      { name: 'Ngữ Văn', description: 'Ngữ văn Việt Nam' },
      { name: 'Lịch Sử', description: 'Lịch sử Việt Nam và thế giới' },
      { name: 'Địa Lý', description: 'Địa lý tự nhiên và kinh tế' },
      { name: 'Tin học', description: 'Tin học và lập trình' },
      { name: 'IELTS', description: 'Luyện thi IELTS' },
      { name: 'TOEFL', description: 'Luyện thi TOEFL' },
      { name: 'SAT', description: 'Luyện thi SAT' },
    ];

    const insertedSubjects: any[] = [];
    for (const subject of subjectsData) {
      const result = await db.insert(subjects).values(subject);
      insertedSubjects.push({ id: Number(result[0].insertId), ...subject });
      console.log(`  ✓ ${subject.name}`);
    }

    // ==================== 2. SEED GRADE LEVELS ====================
    console.log('\n🎓 Seeding grade levels...');
    const gradeLevelsData = [
      // Tiểu học: Lớp 1-5
      { name: 'Lớp 1', category: 'Tiểu học', sortOrder: 1 },
      { name: 'Lớp 2', category: 'Tiểu học', sortOrder: 2 },
      { name: 'Lớp 3', category: 'Tiểu học', sortOrder: 3 },
      { name: 'Lớp 4', category: 'Tiểu học', sortOrder: 4 },
      { name: 'Lớp 5', category: 'Tiểu học', sortOrder: 5 },

      // THCS: Lớp 6-9
      { name: 'Lớp 6', category: 'THCS', sortOrder: 6 },
      { name: 'Lớp 7', category: 'THCS', sortOrder: 7 },
      { name: 'Lớp 8', category: 'THCS', sortOrder: 8 },
      { name: 'Lớp 9', category: 'THCS', sortOrder: 9 },

      // THPT: Lớp 10-12
      { name: 'Lớp 10', category: 'THPT', sortOrder: 10 },
      { name: 'Lớp 11', category: 'THPT', sortOrder: 11 },
      { name: 'Lớp 12', category: 'THPT', sortOrder: 12 },

      // Luyện thi
      { name: 'Luyện thi THPT Quốc gia', category: 'Luyện thi', sortOrder: 13 },
      { name: 'Luyện thi Đại học', category: 'Luyện thi', sortOrder: 14 },
      { name: 'Luyện thi IELTS', category: 'Luyện thi', sortOrder: 15 },
      { name: 'Luyện thi TOEFL', category: 'Luyện thi', sortOrder: 16 },
      { name: 'Luyện thi SAT', category: 'Luyện thi', sortOrder: 17 },

      // Khác
      { name: 'Người đi làm', category: 'Khác', sortOrder: 18 },
      { name: 'Đại học', category: 'Khác', sortOrder: 19 },
      { name: 'Khác', category: 'Khác', sortOrder: 20 },
    ];

    const insertedGradeLevels: any[] = [];
    for (const gradeLevel of gradeLevelsData) {
      const result = await db.insert(gradeLevels).values(gradeLevel);
      insertedGradeLevels.push({ id: Number(result[0].insertId), ...gradeLevel });
      console.log(`  ✓ ${gradeLevel.name}`);
    }

    // ==================== 3. SEED TUTORS ====================
    console.log('\n👨‍🏫 Seeding tutors...');

    const tutorsData = [
      {
        username: 'tutor_mai',
        email: 'mai@example.com',
        fullName: 'Nguyễn Thị Mai',
        avatar: 'https://i.pravatar.cc/150?img=5',
        bio: 'Tôi là giáo viên Toán có 5 năm kinh nghiệm giảng dạy THPT. Tôi đam mê giúp học sinh hiểu rõ bản chất của toán học và phát triển tư duy logic. Với phương pháp giảng dạy linh hoạt và tận tâm, tôi đã giúp nhiều học sinh cải thiện điểm số và yêu thích môn Toán hơn.',
        teachingMethod: 'Tôi sử dụng phương pháp giảng dạy tích cực, khuyến khích học sinh tự suy nghĩ và giải quyết vấn đề. Mỗi bài học đều có bài tập thực hành và ứng dụng thực tế để học sinh thấy được tính hữu ích của môn Toán.',
        education: JSON.stringify([{
          degree: 'Cử nhân Toán học',
          school: 'Đại học Sư phạm Hà Nội',
          year: '2018'
        }]),
        subjects: ['Toán', 'Vật Lý'], // Will be converted to subject IDs
        gradeLevels: ['Lớp 10', 'Lớp 11', 'Lớp 12'],
        experience: 5,
        hourlyRate: 200000,
        occupation: 'Giáo viên',
        rating: 49,
        totalReviews: 128,
        totalStudents: 45,
        verificationStatus: 'verified',
        certifications: JSON.stringify(['Chứng chỉ giáo viên dạy giỏi cấp thành phố']),
        achievements: JSON.stringify(['Top 10 giáo viên xuất sắc năm 2023']),
        timeSlots: [
          { day: 1, shift: 'evening', start: '19:00', end: '21:00' }, // T2 tối
          { day: 3, shift: 'evening', start: '19:00', end: '21:00' }, // T4 tối
          { day: 5, shift: 'evening', start: '19:00', end: '21:00' }, // T6 tối
          { day: 6, shift: 'afternoon', start: '14:00', end: '20:00' }, // T7 chiều-tối
          { day: 0, shift: 'afternoon', start: '14:00', end: '20:00' }, // CN chiều-tối
        ]
      },
      {
        username: 'tutor_hung',
        email: 'hung@example.com',
        fullName: 'Trần Văn Hùng',
        avatar: 'https://i.pravatar.cc/150?img=12',
        bio: 'Giáo viên Tiếng Anh chuyên luyện thi IELTS, TOEFL với 7 năm kinh nghiệm. Đã giúp hơn 200 học sinh đạt điểm mục tiêu. Tôi tự tin có thể giúp bạn đạt được ước mơ du học hoặc làm việc tại các công ty quốc tế.',
        teachingMethod: 'Phương pháp học tập tích cực với trọng tâm là giao tiếp và thực hành. Sử dụng tài liệu cập nhật và mô phỏng thi thực tế. Lộ trình học được cá nhân hóa theo từng học viên.',
        education: JSON.stringify([{
          degree: 'Thạc sĩ Ngôn ngữ Anh',
          school: 'Đại học Ngoại ngữ - ĐHQGHN',
          year: '2016'
        }]),
        subjects: ['Tiếng Anh', 'IELTS', 'TOEFL'],
        gradeLevels: ['Lớp 10', 'Lớp 11', 'Lớp 12', 'Luyện thi IELTS', 'Luyện thi TOEFL', 'Người đi làm'],
        experience: 7,
        hourlyRate: 250000,
        occupation: 'Chuyên gia',
        rating: 50,
        totalReviews: 95,
        totalStudents: 67,
        verificationStatus: 'verified',
        certifications: JSON.stringify(['IELTS 8.5', 'TOEFL 115', 'TESOL Certificate']),
        achievements: JSON.stringify(['Giảng viên xuất sắc năm 2022', 'Top 5 giáo viên IELTS tốt nhất']),
        timeSlots: [
          { day: 2, shift: 'evening', start: '18:00', end: '21:00' }, // T3 tối
          { day: 4, shift: 'evening', start: '18:00', end: '21:00' }, // T5 tối
          { day: 6, shift: 'evening', start: '18:00', end: '21:00' }, // T7 tối
          { day: 0, shift: 'morning', start: '09:00', end: '12:00' }, // CN sáng
          { day: 0, shift: 'afternoon', start: '14:00', end: '18:00' }, // CN chiều
        ]
      },
      {
        username: 'tutor_tu',
        email: 'tu@example.com',
        fullName: 'Lê Minh Tú',
        avatar: 'https://i.pravatar.cc/150?img=33',
        bio: 'Sinh viên năm cuối ngành Công nghệ thông tin, đam mê giảng dạy Toán và Tin học cho học sinh THCS. Với kiến thức vững vàng và cách tiếp cận trẻ trung, tôi giúp các em học một cách thú vị và hiệu quả.',
        teachingMethod: 'Sử dụng các ví dụ thực tế, game hóa và công nghệ để làm cho việc học trở nên thú vị và dễ hiểu. Kết hợp lý thuyết với thực hành ngay trong buổi học.',
        education: JSON.stringify([{
          degree: 'Sinh viên năm 4 Công nghệ thông tin',
          school: 'Đại học Bách khoa Hà Nội',
          year: '2025'
        }]),
        subjects: ['Toán', 'Vật Lý', 'Tin học'],
        gradeLevels: ['Lớp 3', 'Lớp 4', 'Lớp 5', 'Lớp 6', 'Lớp 7', 'Lớp 8', 'Lớp 9'],
        experience: 3,
        hourlyRate: 120000,
        occupation: 'Sinh viên',
        rating: 47,
        totalReviews: 76,
        totalStudents: 34,
        verificationStatus: 'verified',
        certifications: JSON.stringify(['Giải Nhất Olympic Tin học sinh viên 2023']),
        achievements: JSON.stringify(['GPA 3.8/4.0']),
        timeSlots: [
          { day: 1, shift: 'evening', start: '17:00', end: '20:00' }, // T2 tối
          { day: 2, shift: 'evening', start: '17:00', end: '20:00' }, // T3 tối
          { day: 3, shift: 'evening', start: '17:00', end: '20:00' }, // T4 tối
          { day: 4, shift: 'evening', start: '17:00', end: '20:00' }, // T5 tối
          { day: 5, shift: 'evening', start: '17:00', end: '20:00' }, // T6 tối
          { day: 6, shift: 'afternoon', start: '14:00', end: '18:00' }, // T7 chiều
        ]
      },
      {
        username: 'tutor_ha',
        email: 'ha@example.com',
        fullName: 'Phạm Thu Hà',
        avatar: 'https://i.pravatar.cc/150?img=47',
        bio: 'Giáo viên Hóa học và Sinh học với 4 năm kinh nghiệm, chuyên luyện thi đại học khối B. Đã giúp 90% học sinh đạt điểm cao và đỗ đại học. Tôi cam kết mang lại kết quả tốt nhất cho học sinh.',
        teachingMethod: 'Kết hợp lý thuyết với thực hành thí nghiệm (khi có thể). Tập trung vào hiểu bản chất và ứng dụng thực tế. Có hệ thống bài tập từ cơ bản đến nâng cao.',
        education: JSON.stringify([{
          degree: 'Cử nhân Hóa học',
          school: 'Đại học Khoa học Tự nhiên - ĐHQGHN',
          year: '2019'
        }]),
        subjects: ['Hóa học', 'Sinh học'],
        gradeLevels: ['Lớp 8', 'Lớp 9', 'Lớp 10', 'Lớp 11', 'Lớp 12', 'Luyện thi Đại học'],
        experience: 4,
        hourlyRate: 180000,
        occupation: 'Giáo viên',
        rating: 48,
        totalReviews: 54,
        totalStudents: 28,
        verificationStatus: 'verified',
        certifications: JSON.stringify(['Chứng chỉ giảng dạy THPT']),
        achievements: JSON.stringify(['90% học sinh đỗ đại học khối B']),
        timeSlots: [
          { day: 1, shift: 'evening', start: '18:00', end: '21:00' }, // T2 tối
          { day: 3, shift: 'evening', start: '18:00', end: '21:00' }, // T4 tối
          { day: 5, shift: 'evening', start: '18:00', end: '21:00' }, // T6 tối
          { day: 6, shift: 'afternoon', start: '15:00', end: '19:00' }, // T7 chiều
        ]
      },
      {
        username: 'tutor_thanh',
        email: 'thanh@example.com',
        fullName: 'Đỗ Văn Thành',
        avatar: 'https://i.pravatar.cc/150?img=15',
        bio: 'Giáo viên Lịch Sử và Địa Lý với đam mê truyền đạt kiến thức xã hội. Có 4 năm kinh nghiệm giảng dạy THPT, tôi sử dụng các câu chuyện lịch sử thú vị và bản đồ tương tác để giúp học sinh hiểu sâu hơn.',
        teachingMethod: 'Kết hợp giảng dạy lý thuyết với các case study, video tài liệu và thảo luận nhóm. Học sinh sẽ học cách phân tích sự kiện lịch sử và hiểu được các yếu tố địa lý ảnh hưởng đến cuộc sống.',
        education: JSON.stringify([{
          degree: 'Cử nhân Sử học',
          school: 'Đại học Sư phạm Hà Nội',
          year: '2019'
        }]),
        subjects: ['Lịch Sử', 'Địa Lý'],
        gradeLevels: ['Lớp 10', 'Lớp 11', 'Lớp 12'],
        experience: 4,
        hourlyRate: 150000,
        occupation: 'Giáo viên',
        rating: 46,
        totalReviews: 42,
        totalStudents: 31,
        verificationStatus: 'verified',
        certifications: JSON.stringify(['Chứng chỉ giảng dạy THPT']),
        achievements: JSON.stringify([]),
        timeSlots: [
          { day: 2, shift: 'evening', start: '18:00', end: '21:00' }, // T3 tối
          { day: 4, shift: 'evening', start: '18:00', end: '21:00' }, // T5 tối
          { day: 0, shift: 'morning', start: '09:00', end: '12:00' }, // CN sáng
          { day: 0, shift: 'afternoon', start: '14:00', end: '17:00' }, // CN chiều
        ]
      },
      {
        username: 'tutor_lan',
        email: 'lan@example.com',
        fullName: 'Hoàng Thị Lan',
        avatar: 'https://i.pravatar.cc/150?img=23',
        bio: 'Giáo viên Ngữ Văn chuyên luyện thi THPT Quốc gia và Đại học. 6 năm kinh nghiệm với nhiều học sinh đạt điểm cao. Tôi yêu thích văn học Việt Nam và luôn truyền cảm hứng cho học sinh yêu môn Văn.',
        teachingMethod: 'Phân tích tác phẩm văn học một cách sâu sắc và dễ hiểu. Hướng dẫn kỹ năng làm bài thi, viết văn nghị luận và văn tự sự. Có bộ tài liệu tổng hợp đầy đủ và bài tập luyện thi.',
        education: JSON.stringify([{
          degree: 'Cử nhân Ngữ văn',
          school: 'Đại học Sư phạm Hà Nội',
          year: '2017'
        }]),
        subjects: ['Ngữ Văn'],
        gradeLevels: ['Lớp 10', 'Lớp 11', 'Lớp 12', 'Luyện thi THPT Quốc gia', 'Luyện thi Đại học'],
        experience: 6,
        hourlyRate: 190000,
        occupation: 'Giáo viên',
        rating: 49,
        totalReviews: 88,
        totalStudents: 52,
        verificationStatus: 'verified',
        certifications: JSON.stringify(['Chứng chỉ giảng dạy THPT']),
        achievements: JSON.stringify(['Giáo viên giỏi cấp quận 2022']),
        timeSlots: [
          { day: 1, shift: 'evening', start: '19:00', end: '21:00' }, // T2 tối
          { day: 3, shift: 'evening', start: '19:00', end: '21:00' }, // T4 tối
          { day: 5, shift: 'evening', start: '19:00', end: '21:00' }, // T6 tối
          { day: 6, shift: 'afternoon', start: '14:00', end: '17:00' }, // T7 chiều
          { day: 6, shift: 'evening', start: '17:00', end: '19:00' }, // T7 tối
        ]
      },
      {
        username: 'tutor_duc',
        email: 'duc@example.com',
        fullName: 'Bùi Minh Đức',
        avatar: 'https://i.pravatar.cc/150?img=60',
        bio: 'Chuyên gia luyện thi SAT và TOEFL với 5 năm kinh nghiệm. Từng du học tại Mỹ và hiểu rõ yêu cầu của các kỳ thi quốc tế. Đã giúp 100+ học sinh đạt điểm cao và nhận học bổng du học.',
        teachingMethod: 'Lộ trình học được cá nhân hóa dựa trên điểm xuất phát và mục tiêu của học viên. Sử dụng tài liệu chuẩn quốc tế và mô phỏng thi thực chiến. Coaching 1-1 tận tâm và theo sát tiến độ.',
        education: JSON.stringify([{
          degree: 'Thạc sĩ Quản trị Kinh doanh',
          school: 'University of California, Berkeley',
          year: '2018'
        }]),
        subjects: ['Tiếng Anh', 'SAT', 'TOEFL'],
        gradeLevels: ['Lớp 11', 'Lớp 12', 'Luyện thi SAT', 'Luyện thi TOEFL', 'Đại học'],
        experience: 5,
        hourlyRate: 300000,
        occupation: 'Chuyên gia',
        rating: 50,
        totalReviews: 35,
        totalStudents: 28,
        verificationStatus: 'verified',
        certifications: JSON.stringify(['SAT 1550/1600', 'TOEFL 118/120', 'MBA Berkeley']),
        achievements: JSON.stringify(['Top 3 SAT tutors VN 2023', '98% học sinh đạt mục tiêu']),
        timeSlots: [
          { day: 6, shift: 'morning', start: '09:00', end: '12:00' }, // T7 sáng
          { day: 6, shift: 'afternoon', start: '14:00', end: '18:00' }, // T7 chiều
          { day: 0, shift: 'morning', start: '09:00', end: '12:00' }, // CN sáng
          { day: 0, shift: 'afternoon', start: '14:00', end: '18:00' }, // CN chiều
        ]
      },
      {
        username: 'tutor_huong',
        email: 'huong@example.com',
        fullName: 'Ngô Thị Hương',
        avatar: 'https://i.pravatar.cc/150?img=27',
        bio: 'Giáo viên Tiếng Anh với chuyên môn IELTS, có 5 năm kinh nghiệm giảng dạy từ thiểu niên đến người đi làm. IELTS 8.0, đam mê giúp học viên tự tin giao tiếp và đạt band điểm mục tiêu.',
        teachingMethod: 'Tập trung phát triển 4 kỹ năng một cách cân bằng. Luyện phát âm chuẩn, mở rộng vốn từ vựng và cấu trúc ngữ pháp trong ngữ cảnh thực tế. Có chiến lược làm bài thi hiệu quả.',
        education: JSON.stringify([{
          degree: 'Cử nhân Ngôn ngữ Anh',
          school: 'Đại học Ngoại ngữ - ĐHQGHN',
          year: '2018'
        }]),
        subjects: ['Tiếng Anh', 'IELTS'],
        gradeLevels: ['Lớp 6', 'Lớp 7', 'Lớp 8', 'Lớp 9', 'Lớp 10', 'Lớp 11', 'Lớp 12', 'Luyện thi IELTS', 'Người đi làm'],
        experience: 5,
        hourlyRate: 220000,
        occupation: 'Chuyên gia',
        rating: 48,
        totalReviews: 67,
        totalStudents: 48,
        verificationStatus: 'verified',
        certifications: JSON.stringify(['IELTS 8.0', 'TESOL Certificate']),
        achievements: JSON.stringify(['85% học sinh đạt band 6.5+']),
        timeSlots: [
          { day: 1, shift: 'evening', start: '18:00', end: '21:00' }, // T2 tối
          { day: 2, shift: 'evening', start: '18:00', end: '21:00' }, // T3 tối
          { day: 3, shift: 'evening', start: '18:00', end: '21:00' }, // T4 tối
          { day: 4, shift: 'evening', start: '18:00', end: '21:00' }, // T5 tối
          { day: 5, shift: 'evening', start: '18:00', end: '21:00' }, // T6 tối
          { day: 6, shift: 'afternoon', start: '14:00', end: '20:00' }, // T7 chiều-tối
        ]
      },
      {
        username: 'tutor_nam',
        email: 'nam@example.com',
        fullName: 'Vũ Hoàng Nam',
        avatar: 'https://i.pravatar.cc/150?img=68',
        bio: 'Kỹ sư phần mềm kiêm giáo viên Toán và Tin học. Với kinh nghiệm làm việc tại các công ty công nghệ lớn, tôi mang kiến thức thực tế vào giảng dạy, giúp học sinh hiểu được ứng dụng thực tiễn của môn học.',
        teachingMethod: 'Kết hợp lý thuyết với coding thực hành. Sử dụng các dự án mini để học sinh áp dụng kiến thức ngay lập tức. Học Toán qua lập trình và giải thuật.',
        education: JSON.stringify([{
          degree: 'Thạc sĩ Khoa học Máy tính',
          school: 'Đại học Bách khoa Hà Nội',
          year: '2020'
        }]),
        subjects: ['Toán', 'Tin học'],
        gradeLevels: ['Lớp 6', 'Lớp 7', 'Lớp 8', 'Lớp 9', 'Lớp 10', 'Lớp 11', 'Lớp 12', 'Đại học'],
        experience: 3,
        hourlyRate: 200000,
        occupation: 'Chuyên gia',
        rating: 47,
        totalReviews: 38,
        totalStudents: 24,
        verificationStatus: 'verified',
        certifications: JSON.stringify(['AWS Certified', 'Google Cloud Professional']),
        achievements: JSON.stringify(['Kỹ sư tại FPT Software']),
        timeSlots: [
          { day: 6, shift: 'morning', start: '08:00', end: '12:00' }, // T7 sáng
          { day: 6, shift: 'afternoon', start: '14:00', end: '18:00' }, // T7 chiều
          { day: 0, shift: 'morning', start: '08:00', end: '12:00' }, // CN sáng
          { day: 0, shift: 'afternoon', start: '14:00', end: '18:00' }, // CN chiều
        ]
      },
      {
        username: 'tutor_anh',
        email: 'anh.nguyen@example.com',
        fullName: 'Nguyễn Minh Anh',
        avatar: 'https://i.pravatar.cc/150?img=38',
        bio: 'Sinh viên Y khoa giỏi, chuyên dạy Hóa học và Sinh học cho học sinh THPT. Với kiến thức y khoa, tôi giúp học sinh hiểu sâu về cơ thể người và các phản ứng hóa học trong y học.',
        teachingMethod: 'Giảng dạy lý thuyết kết hợp với các ví dụ y học thực tế. Hệ thống hóa kiến thức và tập trung vào các dạng bài thi thường gặp. Có ngân hàng câu hỏi lớn để luyện tập.',
        education: JSON.stringify([{
          degree: 'Sinh viên năm 5 Y khoa',
          school: 'Đại học Y Hà Nội',
          year: '2025'
        }]),
        subjects: ['Hóa học', 'Sinh học'],
        gradeLevels: ['Lớp 10', 'Lớp 11', 'Lớp 12', 'Luyện thi Đại học'],
        experience: 2,
        hourlyRate: 140000,
        occupation: 'Sinh viên',
        rating: 46,
        totalReviews: 29,
        totalStudents: 18,
        verificationStatus: 'verified',
        certifications: JSON.stringify(['Học bổng toàn phần Đại học Y']),
        achievements: JSON.stringify(['GPA 3.9/4.0', 'Giải Nhì Olympic Sinh học SV 2023']),
        timeSlots: [
          { day: 1, shift: 'evening', start: '18:00', end: '21:00' }, // T2 tối
          { day: 3, shift: 'evening', start: '18:00', end: '21:00' }, // T4 tối
          { day: 5, shift: 'evening', start: '18:00', end: '21:00' }, // T6 tối
          { day: 6, shift: 'morning', start: '08:00', end: '12:00' }, // T7 sáng
          { day: 0, shift: 'afternoon', start: '14:00', end: '18:00' }, // CN chiều
        ]
      },
    ];

    for (const tutorData of tutorsData) {
      console.log(`\n  Creating ${tutorData.fullName}...`);

      // Create user account
      const hashedPassword = await bcrypt.hash('password123', 10);
      const userResult = await db.insert(users).values({
        username: tutorData.username,
        email: tutorData.email,
        password: hashedPassword,
        role: 'tutor'
      });
      const userId = Number(userResult[0].insertId);
      console.log(`    ✓ User account created`);

      // Create tutor profile
      const tutorResult = await db.insert(tutors).values({
        userId: userId,
        fullName: tutorData.fullName,
        avatar: tutorData.avatar,
        bio: tutorData.bio,
        teachingMethod: tutorData.teachingMethod,
        education: tutorData.education,
        subjects: JSON.stringify([]), // Empty - will use tutor_subjects table
        experience: tutorData.experience,
        hourlyRate: tutorData.hourlyRate,
        occupation: tutorData.occupation,
        rating: tutorData.rating,
        totalReviews: tutorData.totalReviews,
        totalStudents: tutorData.totalStudents,
        verificationStatus: tutorData.verificationStatus as 'verified',
        certifications: tutorData.certifications,
        achievements: tutorData.achievements
      });
      const tutorId = Number(tutorResult[0].insertId);
      console.log(`    ✓ Tutor profile created`);

      // Create tutor-subject relationships
      for (const subjectName of tutorData.subjects) {
        const subject = insertedSubjects.find(s => s.name === subjectName);
        if (!subject) continue;

        for (const gradeLevelName of tutorData.gradeLevels) {
          const gradeLevel = insertedGradeLevels.find(g => g.name === gradeLevelName);
          if (!gradeLevel) continue;

          await db.insert(tutorSubjects).values({
            tutorId: tutorId,
            subjectId: subject.id,
            gradeLevelId: gradeLevel.id
          });
        }
      }
      console.log(`    ✓ ${tutorData.subjects.length} subjects × ${tutorData.gradeLevels.length} grade levels = ${tutorData.subjects.length * tutorData.gradeLevels.length} relationships`);

      // Create time slots
      for (const slot of tutorData.timeSlots) {
        await db.insert(timeSlots).values({
          tutorId: tutorId,
          dayOfWeek: slot.day,
          shiftType: slot.shift as 'morning' | 'afternoon' | 'evening',
          startTime: slot.start,
          endTime: slot.end,
          isAvailable: 1
        });
      }
      console.log(`    ✓ ${tutorData.timeSlots.length} time slots created`);
    }

    console.log('\n✅ Successfully seeded optimized database!');
    console.log('\n📊 Summary:');
    console.log(`  - ${insertedSubjects.length} subjects`);
    console.log(`  - ${insertedGradeLevels.length} grade levels`);
    console.log(`  - ${tutorsData.length} tutors`);
    console.log(`  - Tutor-subject relationships with normalized data`);
    console.log(`  - Time slots with shift types and calculated fees`);

    console.log('\n🔑 Login credentials:');
    console.log('  Password: password123');
    console.log('\n  Usernames:');
    tutorsData.forEach(t => console.log(`    - ${t.username}`));

  } catch (error) {
    console.error('\n❌ Error seeding database:', error);
    throw error;
  }
}

seedOptimizedDatabase()
  .then(() => {
    console.log('\n✨ Seeding completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });
