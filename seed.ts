/**
 * SEED DATABASE - File seed duy nhất cho toàn bộ hệ thống
 * Tạo dữ liệu mẫu cho: Users, Subjects, Grade Levels, Tutors, Time Slots, Tutor Subjects
 *
 * Cách chạy: npm run seed
 */

import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL not found');
  process.exit(1);
}

console.log('✓ Environment variables loaded');

import { db } from './src/lib/db';
import { users, tutors, subjects, gradeLevels, tutorSubjects, timeSlots } from './src/lib/schema';
import bcrypt from 'bcryptjs';

async function clearDatabase() {
  console.log('🗑️  Clearing existing data...');

  try {
    // Delete in correct order (child tables first)
    await db.delete(timeSlots);
    await db.delete(tutorSubjects);
    await db.delete(tutors);
    await db.delete(gradeLevels);
    await db.delete(subjects);
    await db.delete(users);

    console.log('✅ All data cleared\n');
  } catch (error) {
    console.error('⚠️  Error clearing data (this is OK if tables are empty):', (error as Error).message);
  }
}

async function main() {
  console.log('🌱 Starting database seeding...\n');

  // Clear existing data first
  await clearDatabase();

  try {
    // ==================== 0. CREATE TEST USERS (Admin, Tutor, Student) ====================
    console.log('👥 Creating test users...');
    const hashedPassword = await bcrypt.hash('Test1234', 10);

    // Admin user
    const adminResult = await db.insert(users).values({
      username: 'admin',
      email: 'admin@test.com',
      password: hashedPassword,
      role: 'admin'
    });
    const adminId = Number(adminResult[0].insertId);
    console.log('  ✓ Admin: admin / Test1234');

    // Student user
    const studentResult = await db.insert(users).values({
      username: 'student',
      email: 'student@test.com',
      password: hashedPassword,
      role: 'student'
    });
    const studentId = Number(studentResult[0].insertId);
    console.log('  ✓ Student: student / Test1234');

    // Tutor user (will create profile later)
    const tutorUserResult = await db.insert(users).values({
      username: 'tutor',
      email: 'tutor@test.com',
      password: hashedPassword,
      role: 'tutor'
    });
    const tutorUserId = Number(tutorUserResult[0].insertId);
    console.log('  ✓ Tutor: tutor / Test1234');

    // ==================== 1. SEED SUBJECTS ====================
    console.log('\n📚 Seeding subjects...');
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

    // NOTE: Test tutor account (tutor/123456) does NOT have a profile yet
    // This allows testing the tutor registration flow
    const tutorsData = [
      {
        username: 'tutor_mai',
        email: 'mai@example.com',
        fullName: 'Nguyễn Thị Mai',
        avatar: 'https://i.pravatar.cc/150?img=5',
        bio: 'Tôi là giáo viên Toán có 5 năm kinh nghiệm giảng dạy THPT. Tôi đam mê giúp học sinh hiểu rõ bản chất của toán học và phát triển tư duy logic. Với phương pháp giảng dạy linh hoạt và tận tâm, tôi đã giúp nhiều học sinh cải thiện điểm số và yêu thích môn Toán hơn.',
        teachingMethod: 'Tôi sử dụng phương pháp giảng dạy tích cực, khuyến khích học sinh tự suy nghĩ và giải quyết vấn đề. Mỗi bài học đều có bài tập thực hành và ứng dụng thực tế để học sinh thấy được tính hữu ích của môn Toán. Sử dụng công nghệ hỗ trợ như phần mềm vẽ đồ thị, app luyện tập trực tuyến và video minh họa để tăng hiệu quả học tập.',
        education: JSON.stringify([
          {
            degree: 'Thạc sĩ Toán học ứng dụng',
            school: 'Đại học Khoa học Tự nhiên - ĐHQGHN',
            year: '2020'
          },
          {
            degree: 'Cử nhân Toán học',
            school: 'Đại học Sư phạm Hà Nội',
            year: '2018'
          }
        ]),
        subjects: ['Toán', 'Vật Lý'],
        gradeLevels: ['Lớp 10', 'Lớp 11', 'Lớp 12'],
        experience: 5,
        hourlyRate: 200000,
        occupation: 'Giáo viên',
        rating: 49,
        totalReviews: 128,
        totalStudents: 45,
        verificationStatus: 'verified',
        certifications: JSON.stringify([
          'Chứng chỉ giáo viên dạy giỏi cấp thành phố 2023',
          'Chứng chỉ bồi dưỡng giáo viên THPT',
          'Chứng chỉ tin học ứng dụng trong giảng dạy',
          'Giấy chứng nhận hoàn thành khóa đào tạo phương pháp giảng dạy tích cực'
        ]),
        achievements: JSON.stringify([
          'Top 10 giáo viên xuất sắc năm 2023',
          'Giải Nhì cuộc thi giáo án điện tử cấp thành phố 2022',
          '95% học sinh đạt điểm 8+ trong kỳ thi THPT',
          'Hướng dẫn 5 học sinh đạt giải Olympic Toán cấp tỉnh'
        ]),
        timeSlots: [
          { day: 1, shift: 'evening', start: '19:00', end: '21:00' },
          { day: 3, shift: 'evening', start: '19:00', end: '21:00' },
          { day: 5, shift: 'evening', start: '19:00', end: '21:00' },
          { day: 6, shift: 'afternoon', start: '14:00', end: '20:00' },
          { day: 0, shift: 'afternoon', start: '14:00', end: '20:00' },
        ]
      },
      {
        username: 'tutor_hung',
        email: 'hung@example.com',
        fullName: 'Trần Văn Hùng',
        avatar: 'https://i.pravatar.cc/150?img=12',
        bio: 'Giáo viên Tiếng Anh chuyên luyện thi IELTS, TOEFL với 7 năm kinh nghiệm. Đã giúp hơn 200 học sinh đạt điểm mục tiêu. Tôi tự tin có thể giúp bạn đạt được ước mơ du học hoặc làm việc tại các công ty quốc tế.',
        teachingMethod: 'Phương pháp học tập tích cực với trọng tâm là giao tiếp và thực hành. Sử dụng tài liệu cập nhật và mô phỏng thi thực tế. Lộ trình học được cá nhân hóa theo từng học viên với các bài kiểm tra định kỳ để đánh giá tiến độ. Áp dụng phương pháp immersion - học sinh được nghe, nói, đọc, viết tiếng Anh trong suốt buổi học.',
        education: JSON.stringify([
          {
            degree: 'Thạc sĩ Ngôn ngữ Anh',
            school: 'Đại học Ngoại ngữ - ĐHQGHN',
            year: '2016'
          },
          {
            degree: 'Cử nhân Sư phạm Tiếng Anh',
            school: 'Đại học Sư phạm Hà Nội',
            year: '2014'
          },
          {
            degree: 'Certificate in Advanced English Teaching Methods',
            school: 'British Council',
            year: '2017'
          }
        ]),
        subjects: ['Tiếng Anh', 'IELTS', 'TOEFL'],
        gradeLevels: ['Lớp 10', 'Lớp 11', 'Lớp 12', 'Luyện thi IELTS', 'Luyện thi TOEFL', 'Người đi làm'],
        experience: 7,
        hourlyRate: 250000,
        occupation: 'Chuyên gia',
        rating: 50,
        totalReviews: 95,
        totalStudents: 67,
        verificationStatus: 'verified',
        certifications: JSON.stringify([
          'IELTS 8.5 (L9.0 R9.0 W8.0 S8.0)',
          'TOEFL iBT 115/120',
          'TESOL Certificate - International House',
          'CELTA (Certificate in English Language Teaching to Adults)',
          'Cambridge TKT (Teaching Knowledge Test) Module 1,2,3',
          'Chứng chỉ giảng viên IELTS của IDP'
        ]),
        achievements: JSON.stringify([
          'Giảng viên xuất sắc năm 2022',
          'Top 5 giáo viên IELTS tốt nhất VN 2023',
          '100+ học sinh đạt IELTS 7.0+',
          '15 học sinh đạt IELTS 8.5+',
          'Tác giả sách "Chinh phục IELTS Speaking 8.0"',
          'Diễn giả tại Hội thảo giảng dạy IELTS Quốc gia 2023'
        ]),
        timeSlots: [
          { day: 2, shift: 'evening', start: '18:00', end: '21:00' },
          { day: 4, shift: 'evening', start: '18:00', end: '21:00' },
          { day: 6, shift: 'evening', start: '18:00', end: '21:00' },
          { day: 0, shift: 'morning', start: '09:00', end: '12:00' },
          { day: 0, shift: 'afternoon', start: '14:00', end: '18:00' },
        ]
      },
      {
        username: 'tutor_tu',
        email: 'tu@example.com',
        fullName: 'Lê Minh Tú',
        avatar: 'https://i.pravatar.cc/150?img=33',
        bio: 'Sinh viên năm cuối ngành Công nghệ thông tin, đam mê giảng dạy Toán và Tin học cho học sinh THCS. Với kiến thức vững vàng và cách tiếp cận trẻ trung, tôi giúp các em học một cách thú vị và hiệu quả.',
        teachingMethod: 'Sử dụng các ví dụ thực tế, game hóa và công nghệ để làm cho việc học trở nên thú vị và dễ hiểu. Kết hợp lý thuyết với thực hành ngay trong buổi học. Áp dụng phương pháp học qua dự án (Project-based Learning) - học sinh được làm các mini project để củng cố kiến thức. Sử dụng Kahoot, Quizizz và các công cụ tương tác để tăng sự hứng thú.',
        education: JSON.stringify([
          {
            degree: 'Sinh viên năm 4 Công nghệ thông tin (GPA 3.8/4.0)',
            school: 'Đại học Bách khoa Hà Nội',
            year: '2025'
          },
          {
            degree: 'Online Certificate: CS50 - Introduction to Computer Science',
            school: 'Harvard University (edX)',
            year: '2022'
          },
          {
            degree: 'Online Certificate: Machine Learning Specialization',
            school: 'Stanford University (Coursera)',
            year: '2023'
          }
        ]),
        subjects: ['Toán', 'Vật Lý', 'Tin học'],
        gradeLevels: ['Lớp 3', 'Lớp 4', 'Lớp 5', 'Lớp 6', 'Lớp 7', 'Lớp 8', 'Lớp 9'],
        experience: 3,
        hourlyRate: 120000,
        occupation: 'Sinh viên',
        rating: 47,
        totalReviews: 76,
        totalStudents: 34,
        verificationStatus: 'verified',
        certifications: JSON.stringify([
          'Giải Nhất Olympic Tin học sinh viên 2023',
          'Google IT Support Professional Certificate',
          'Python for Everybody Specialization',
          'JavaScript Algorithms and Data Structures (freeCodeCamp)',
          'Chứng chỉ TOEIC 900/990'
        ]),
        achievements: JSON.stringify([
          'GPA 3.8/4.0 - Sinh viên xuất sắc 3 năm liên tiếp',
          'Học bổng khuyến khích học tập 100% (4 năm)',
          'Giải Nhì cuộc thi Hackathon HUST 2023',
          'Top 50 Vietnam National Informatics Olympiad 2021',
          'Freelance developer với 10+ dự án thành công'
        ]),
        timeSlots: [
          { day: 1, shift: 'evening', start: '17:00', end: '20:00' },
          { day: 2, shift: 'evening', start: '17:00', end: '20:00' },
          { day: 3, shift: 'evening', start: '17:00', end: '20:00' },
          { day: 4, shift: 'evening', start: '17:00', end: '20:00' },
          { day: 5, shift: 'evening', start: '17:00', end: '20:00' },
          { day: 6, shift: 'afternoon', start: '14:00', end: '18:00' },
        ]
      },
      {
        username: 'tutor_ha',
        email: 'ha@example.com',
        fullName: 'Phạm Thu Hà',
        avatar: 'https://i.pravatar.cc/150?img=47',
        bio: 'Giáo viên Hóa học và Sinh học với 4 năm kinh nghiệm, chuyên luyện thi đại học khối B. Đã giúp 90% học sinh đạt điểm cao và đỗ đại học. Tôi cam kết mang lại kết quả tốt nhất cho học sinh.',
        teachingMethod: 'Kết hợp lý thuyết với thực hành thí nghiệm (khi có thể). Tập trung vào hiểu bản chất và ứng dụng thực tế. Có hệ thống bài tập từ cơ bản đến nâng cao. Sử dụng mô hình 3D, video thí nghiệm và phần mềm mô phỏng để học sinh dễ hình dung. Xây dựng sơ đồ tư duy (mindmap) để hệ thống hóa kiến thức.',
        education: JSON.stringify([
          {
            degree: 'Thạc sĩ Hóa học Hữu cơ',
            school: 'Đại học Khoa học Tự nhiên - ĐHQGHN',
            year: '2021'
          },
          {
            degree: 'Cử nhân Sư phạm Hóa học',
            school: 'Đại học Sư phạm Hà Nội',
            year: '2019'
          }
        ]),
        subjects: ['Hóa học', 'Sinh học'],
        gradeLevels: ['Lớp 8', 'Lớp 9', 'Lớp 10', 'Lớp 11', 'Lớp 12', 'Luyện thi Đại học'],
        experience: 4,
        hourlyRate: 180000,
        occupation: 'Giáo viên',
        rating: 48,
        totalReviews: 54,
        totalStudents: 28,
        verificationStatus: 'verified',
        certifications: JSON.stringify([
          'Chứng chỉ giảng dạy THPT',
          'Chứng chỉ bồi dưỡng thường xuyên giáo viên THPT môn Hóa',
          'Chứng chỉ An toàn phòng thí nghiệm Hóa học',
          'Giấy chứng nhận tham gia Workshop "Đổi mới phương pháp dạy Hóa"'
        ]),
        achievements: JSON.stringify([
          '90% học sinh đỗ đại học khối B',
          '7 học sinh đạt điểm 9+ môn Hóa trong kỳ thi THPT 2023',
          'Giáo viên chủ nhiệm lớp đạt danh hiệu Tập thể lao động xuất sắc',
          'Bài giảng "Phản ứng oxi hóa khử" được chọn làm mẫu cấp thành phố',
          'Hướng dẫn nhóm học sinh nghiên cứu khoa học cấp trường'
        ]),
        timeSlots: [
          { day: 1, shift: 'evening', start: '18:00', end: '21:00' },
          { day: 3, shift: 'evening', start: '18:00', end: '21:00' },
          { day: 5, shift: 'evening', start: '18:00', end: '21:00' },
          { day: 6, shift: 'afternoon', start: '15:00', end: '19:00' },
        ]
      },
      {
        username: 'tutor_thanh',
        email: 'thanh@example.com',
        fullName: 'Đỗ Văn Thành',
        avatar: 'https://i.pravatar.cc/150?img=15',
        bio: 'Giáo viên Lịch Sử và Địa Lý với đam mê truyền đạt kiến thức xã hội. Có 4 năm kinh nghiệm giảng dạy THPT, tôi sử dụng các câu chuyện lịch sử thú vị và bản đồ tương tác để giúp học sinh hiểu sâu hơn.',
        teachingMethod: 'Kết hợp giảng dạy lý thuyết với các case study, video tài liệu và thảo luận nhóm. Học sinh sẽ học cách phân tích sự kiện lịch sử và hiểu được các yếu tố địa lý ảnh hưởng đến cuộc sống. Sử dụng trò chơi nhập vai lịch sử, bản đồ tương tác và timeline để tăng tính sinh động. Khuyến khích học sinh tư duy phản biện về các sự kiện lịch sử.',
        education: JSON.stringify([
          {
            degree: 'Thạc sĩ Lịch sử Việt Nam',
            school: 'Đại học Khoa học Xã hội và Nhân văn - ĐHQGHN',
            year: '2021'
          },
          {
            degree: 'Cử nhân Sư phạm Lịch sử',
            school: 'Đại học Sư phạm Hà Nội',
            year: '2019'
          }
        ]),
        subjects: ['Lịch Sử', 'Địa Lý'],
        gradeLevels: ['Lớp 10', 'Lớp 11', 'Lớp 12'],
        experience: 4,
        hourlyRate: 150000,
        occupation: 'Giáo viên',
        rating: 46,
        totalReviews: 42,
        totalStudents: 31,
        verificationStatus: 'verified',
        certifications: JSON.stringify([
          'Chứng chỉ giảng dạy THPT',
          'Chứng chỉ bồi dưỡng giáo viên môn Lịch sử - Địa lý',
          'Giấy chứng nhận hoàn thành khóa "Dạy học tích hợp liên môn"',
          'Chứng chỉ Quản lý di sản văn hóa (UNESCO)'
        ]),
        achievements: JSON.stringify([
          'Giải Ba cuộc thi "Giáo viên dạy giỏi cấp thành phố" môn Lịch sử 2022',
          'Bài giảng "Cách mạng tháng Tám 1945" được chọn làm mẫu cấp quận',
          'Hướng dẫn học sinh tham quan 20+ di tích lịch sử',
          'Biên soạn bộ câu hỏi trắc nghiệm Lịch sử - Địa lý cho trường'
        ]),
        timeSlots: [
          { day: 2, shift: 'evening', start: '18:00', end: '21:00' },
          { day: 4, shift: 'evening', start: '18:00', end: '21:00' },
          { day: 0, shift: 'morning', start: '09:00', end: '12:00' },
          { day: 0, shift: 'afternoon', start: '14:00', end: '17:00' },
        ]
      },
      {
        username: 'tutor_lan',
        email: 'lan@example.com',
        fullName: 'Hoàng Thị Lan',
        avatar: 'https://i.pravatar.cc/150?img=23',
        bio: 'Giáo viên Ngữ Văn chuyên luyện thi THPT Quốc gia và Đại học. 6 năm kinh nghiệm với nhiều học sinh đạt điểm cao. Tôi yêu thích văn học Việt Nam và luôn truyền cảm hứng cho học sinh yêu môn Văn.',
        teachingMethod: 'Phân tích tác phẩm văn học một cách sâu sắc và dễ hiểu. Hướng dẫn kỹ năng làm bài thi, viết văn nghị luận và văn tự sự. Có bộ tài liệu tổng hợp đầy đủ và bài tập luyện thi. Khuyến khích học sinh đọc nhiều sách, viết nhật ký và chia sẻ cảm nhận. Tổ chức các buổi thảo luận văn học, đọc diễn cảm để nâng cao khả năng thưởng thức văn chương.',
        education: JSON.stringify([
          {
            degree: 'Thạc sĩ Văn học Việt Nam',
            school: 'Đại học Khoa học Xã hội và Nhân văn - ĐHQGHN',
            year: '2019'
          },
          {
            degree: 'Cử nhân Sư phạm Ngữ văn',
            school: 'Đại học Sư phạm Hà Nội',
            year: '2017'
          }
        ]),
        subjects: ['Ngữ Văn'],
        gradeLevels: ['Lớp 10', 'Lớp 11', 'Lớp 12', 'Luyện thi THPT Quốc gia', 'Luyện thi Đại học'],
        experience: 6,
        hourlyRate: 190000,
        occupation: 'Giáo viên',
        rating: 49,
        totalReviews: 88,
        totalStudents: 52,
        verificationStatus: 'verified',
        certifications: JSON.stringify([
          'Chứng chỉ giảng dạy THPT',
          'Chứng chỉ bồi dưỡng thường xuyên giáo viên THPT môn Ngữ văn',
          'Giấy chứng nhận tham gia Workshop "Đổi mới kiểm tra đánh giá môn Văn"',
          'Chứng chỉ viết báo chí (Hội Nhà báo Việt Nam)'
        ]),
        achievements: JSON.stringify([
          'Giáo viên giỏi cấp quận 2022',
          'Giải Nhì cuộc thi "Giáo viên dạy giỏi cấp thành phố" môn Văn 2023',
          'Hướng dẫn 12 học sinh đạt giải cuộc thi viết văn cấp thành phố',
          '85% học sinh đạt điểm 8+ môn Văn trong kỳ thi THPT',
          'Tác giả 20+ bài viết về phương pháp dạy Văn trên tạp chí Giáo dục'
        ]),
        timeSlots: [
          { day: 1, shift: 'evening', start: '19:00', end: '21:00' },
          { day: 3, shift: 'evening', start: '19:00', end: '21:00' },
          { day: 5, shift: 'evening', start: '19:00', end: '21:00' },
          { day: 6, shift: 'afternoon', start: '14:00', end: '17:00' },
          { day: 6, shift: 'evening', start: '17:00', end: '19:00' },
        ]
      },
      {
        username: 'tutor_duc',
        email: 'duc@example.com',
        fullName: 'Bùi Minh Đức',
        avatar: 'https://i.pravatar.cc/150?img=60',
        bio: 'Chuyên gia luyện thi SAT và TOEFL với 5 năm kinh nghiệm. Từng du học tại Mỹ và hiểu rõ yêu cầu của các kỳ thi quốc tế. Đã giúp 100+ học sinh đạt điểm cao và nhận học bổng du học.',
        teachingMethod: 'Lộ trình học được cá nhân hóa dựa trên điểm xuất phát và mục tiêu của học viên. Sử dụng tài liệu chuẩn quốc tế và mô phỏng thi thực chiến. Coaching 1-1 tận tâm và theo sát tiến độ. Áp dụng phương pháp "Test-Review-Improve" với các bài kiểm tra định kỳ theo format chuẩn SAT/TOEFL. Chia sẻ kinh nghiệm du học và hồ sơ xin học bổng.',
        education: JSON.stringify([
          {
            degree: 'MBA - Master of Business Administration',
            school: 'University of California, Berkeley (Haas School)',
            year: '2018'
          },
          {
            degree: 'Bachelor of Science in Economics',
            school: 'University of California, Berkeley',
            year: '2016'
          },
          {
            degree: 'Cử nhân Kinh tế Đối ngoại',
            school: 'Đại học Ngoại thương Hà Nội',
            year: '2014'
          }
        ]),
        subjects: ['Tiếng Anh', 'SAT', 'TOEFL'],
        gradeLevels: ['Lớp 11', 'Lớp 12', 'Luyện thi SAT', 'Luyện thi TOEFL', 'Đại học'],
        experience: 5,
        hourlyRate: 300000,
        occupation: 'Chuyên gia',
        rating: 50,
        totalReviews: 35,
        totalStudents: 28,
        verificationStatus: 'verified',
        certifications: JSON.stringify([
          'SAT 1550/1600 (Math 800, Reading & Writing 750)',
          'TOEFL iBT 118/120 (R30 L29 S29 W30)',
          'GRE 335/340 (Quant 170, Verbal 165)',
          'MBA - UC Berkeley Haas School of Business',
          'CFA Level 2 Candidate',
          'Certificate in College Counseling (UCLA Extension)'
        ]),
        achievements: JSON.stringify([
          'Top 3 SAT tutors VN 2023 (theo VnExpress Education)',
          '98% học sinh đạt mục tiêu (1400+ SAT, 100+ TOEFL)',
          'Học bổng toàn phần $250,000 MBA Berkeley',
          'Hướng dẫn 25+ học sinh nhận học bổng du học Mỹ',
          '10 học sinh đạt SAT 1500+',
          'Cựu Investment Analyst tại Goldman Sachs'
        ]),
        timeSlots: [
          { day: 6, shift: 'morning', start: '09:00', end: '12:00' },
          { day: 6, shift: 'afternoon', start: '14:00', end: '18:00' },
          { day: 0, shift: 'morning', start: '09:00', end: '12:00' },
          { day: 0, shift: 'afternoon', start: '14:00', end: '18:00' },
        ]
      },
      {
        username: 'tutor_huong',
        email: 'huong@example.com',
        fullName: 'Ngô Thị Hương',
        avatar: 'https://i.pravatar.cc/150?img=27',
        bio: 'Giáo viên Tiếng Anh với chuyên môn IELTS, có 5 năm kinh nghiệm giảng dạy từ thiểu niên đến người đi làm. IELTS 8.0, đam mê giúp học viên tự tin giao tiếp và đạt band điểm mục tiêu.',
        teachingMethod: 'Tập trung phát triển 4 kỹ năng một cách cân bằng. Luyện phát âm chuẩn, mở rộng vốn từ vựng và cấu trúc ngữ pháp trong ngữ cảnh thực tế. Có chiến lược làm bài thi hiệu quả. Sử dụng Shadowing technique để cải thiện Speaking và Listening. Tổ chức speaking club và debate để học viên thực hành với nhau.',
        education: JSON.stringify([
          {
            degree: 'Thạc sĩ TESOL (Teaching English to Speakers of Other Languages)',
            school: 'University of Sheffield, UK',
            year: '2020'
          },
          {
            degree: 'Cử nhân Sư phạm Tiếng Anh',
            school: 'Đại học Ngoại ngữ - ĐHQGHN',
            year: '2018'
          }
        ]),
        subjects: ['Tiếng Anh', 'IELTS'],
        gradeLevels: ['Lớp 6', 'Lớp 7', 'Lớp 8', 'Lớp 9', 'Lớp 10', 'Lớp 11', 'Lớp 12', 'Luyện thi IELTS', 'Người đi làm'],
        experience: 5,
        hourlyRate: 220000,
        occupation: 'Chuyên gia',
        rating: 48,
        totalReviews: 67,
        totalStudents: 48,
        verificationStatus: 'verified',
        certifications: JSON.stringify([
          'IELTS 8.0 (L8.5 R8.5 W7.5 S7.5)',
          'TESOL Master Degree (University of Sheffield)',
          'CELTA (Certificate in English Language Teaching to Adults)',
          'TKT (Teaching Knowledge Test) Band 4 - Tất cả modules',
          'Certificate in Teaching IELTS (IDP Education)',
          'Certificate in Business English Teaching (Cambridge)'
        ]),
        achievements: JSON.stringify([
          '85% học sinh đạt IELTS band 6.5+',
          '30+ học sinh đạt IELTS 7.5+',
          'Giáo viên được yêu thích nhất tại trung tâm Anh ngữ ABC (2022)',
          'Tác giả blog "IELTS Tips" với 50,000+ followers',
          'Diễn giả tại workshop "Chiến lược học IELTS hiệu quả" 2023'
        ]),
        timeSlots: [
          { day: 1, shift: 'evening', start: '18:00', end: '21:00' },
          { day: 2, shift: 'evening', start: '18:00', end: '21:00' },
          { day: 3, shift: 'evening', start: '18:00', end: '21:00' },
          { day: 4, shift: 'evening', start: '18:00', end: '21:00' },
          { day: 5, shift: 'evening', start: '18:00', end: '21:00' },
          { day: 6, shift: 'afternoon', start: '14:00', end: '20:00' },
        ]
      },
      {
        username: 'tutor_nam',
        email: 'nam@example.com',
        fullName: 'Vũ Hoàng Nam',
        avatar: 'https://i.pravatar.cc/150?img=68',
        bio: 'Kỹ sư phần mềm kiêm giáo viên Toán và Tin học. Với kinh nghiệm làm việc tại các công ty công nghệ lớn, tôi mang kiến thức thực tế vào giảng dạy, giúp học sinh hiểu được ứng dụng thực tiễn của môn học.',
        teachingMethod: 'Kết hợp lý thuyết với coding thực hành. Sử dụng các dự án mini để học sinh áp dụng kiến thức ngay lập tức. Học Toán qua lập trình và giải thuật. Áp dụng phương pháp "Learning by Building" - học sinh sẽ xây dựng các ứng dụng thực tế như game, website, chatbot. Hướng dẫn sử dụng Git, GitHub và các công cụ lập trình chuyên nghiệp.',
        education: JSON.stringify([
          {
            degree: 'Thạc sĩ Khoa học Máy tính (Chuyên ngành AI & Machine Learning)',
            school: 'Đại học Bách khoa Hà Nội',
            year: '2020'
          },
          {
            degree: 'Cử nhân Công nghệ thông tin',
            school: 'Đại học Bách khoa Hà Nội',
            year: '2018'
          },
          {
            degree: 'Deep Learning Specialization',
            school: 'DeepLearning.AI (Coursera)',
            year: '2021'
          }
        ]),
        subjects: ['Toán', 'Tin học'],
        gradeLevels: ['Lớp 6', 'Lớp 7', 'Lớp 8', 'Lớp 9', 'Lớp 10', 'Lớp 11', 'Lớp 12', 'Đại học'],
        experience: 3,
        hourlyRate: 200000,
        occupation: 'Chuyên gia',
        rating: 47,
        totalReviews: 38,
        totalStudents: 24,
        verificationStatus: 'verified',
        certifications: JSON.stringify([
          'AWS Certified Solutions Architect - Professional',
          'Google Cloud Professional Cloud Architect',
          'Microsoft Certified: Azure Solutions Architect Expert',
          'Certified Kubernetes Administrator (CKA)',
          'TensorFlow Developer Certificate',
          'Oracle Certified Professional Java SE Programmer'
        ]),
        achievements: JSON.stringify([
          'Senior Software Engineer tại FPT Software (5 năm)',
          'Giải Nhất Hackathon FPT 2022 - AI-powered Education Platform',
          'Contributor cho 3 open-source projects trên GitHub (2000+ stars)',
          'Speaker tại Vietnam Mobile Day 2023',
          '15+ bài viết kỹ thuật trên viblo.asia',
          'Mentor cho 20+ sinh viên thực tập'
        ]),
        timeSlots: [
          { day: 6, shift: 'morning', start: '08:00', end: '12:00' },
          { day: 6, shift: 'afternoon', start: '14:00', end: '18:00' },
          { day: 0, shift: 'morning', start: '08:00', end: '12:00' },
          { day: 0, shift: 'afternoon', start: '14:00', end: '18:00' },
        ]
      },
      {
        username: 'tutor_anh',
        email: 'anh.nguyen@example.com',
        fullName: 'Nguyễn Minh Anh',
        avatar: 'https://i.pravatar.cc/150?img=38',
        bio: 'Sinh viên Y khoa giỏi, chuyên dạy Hóa học và Sinh học cho học sinh THPT. Với kiến thức y khoa, tôi giúp học sinh hiểu sâu về cơ thể người và các phản ứng hóa học trong y học.',
        teachingMethod: 'Giảng dạy lý thuyết kết hợp với các ví dụ y học thực tế. Hệ thống hóa kiến thức và tập trung vào các dạng bài thi thường gặp. Có ngân hàng câu hỏi lớn để luyện tập. Sử dụng hình ảnh y học, video phẫu thuật (phù hợp) và case study bệnh án để học sinh hiểu sâu hơn. Chia sẻ kinh nghiệm thi đại học khối B và học Y khoa.',
        education: JSON.stringify([
          {
            degree: 'Sinh viên năm 6 Y khoa đa khoa (GPA 3.9/4.0)',
            school: 'Đại học Y Hà Nội',
            year: '2025'
          },
          {
            degree: 'Online Certificate: Medical Neuroscience',
            school: 'Duke University (Coursera)',
            year: '2023'
          }
        ]),
        subjects: ['Hóa học', 'Sinh học'],
        gradeLevels: ['Lớp 10', 'Lớp 11', 'Lớp 12', 'Luyện thi Đại học'],
        experience: 2,
        hourlyRate: 140000,
        occupation: 'Sinh viên',
        rating: 46,
        totalReviews: 29,
        totalStudents: 18,
        verificationStatus: 'verified',
        certifications: JSON.stringify([
          'Học bổng toàn phần Đại học Y Hà Nội (6 năm)',
          'Chứng chỉ Sơ cấp cứu tim phổi - CPR (Hội Hồi sức cấp cứu VN)',
          'Certificate in Human Anatomy (Coursera)',
          'Certificate in Medical Neuroscience (Duke University)',
          'IELTS 7.5 (đọc tài liệu y học tiếng Anh)'
        ]),
        achievements: JSON.stringify([
          'GPA 3.9/4.0 - Top 5 khóa học',
          'Giải Nhì Olympic Sinh học Sinh viên toàn quốc 2023',
          'Giải Ba Olympic Hóa học Sinh viên 2022',
          'Sinh viên 5 tốt cấp trường 3 năm liên tiếp',
          'Tình nguyện viên y tế tại 5 chương trình khám bệnh từ thiện',
          'Nghiên cứu sinh tại phòng thí nghiệm Sinh lý bệnh - ĐH Y HN'
        ]),
        timeSlots: [
          { day: 1, shift: 'evening', start: '18:00', end: '21:00' },
          { day: 3, shift: 'evening', start: '18:00', end: '21:00' },
          { day: 5, shift: 'evening', start: '18:00', end: '21:00' },
          { day: 6, shift: 'morning', start: '08:00', end: '12:00' },
          { day: 0, shift: 'afternoon', start: '14:00', end: '18:00' },
        ]
      },
    ];

    // Use the same hashed password for all tutors
    for (const tutorData of tutorsData) {
      console.log(`\n  Creating ${tutorData.fullName}...`);

      let userId: number;

      // Check if this tutor already has a userId (test tutor)
      if ('userId' in tutorData && tutorData.userId) {
        userId = (tutorData as any).userId;
        console.log(`    ✓ Using existing user account`);
      } else {
        // Create user account for other tutors
        const userResult = await db.insert(users).values({
          username: tutorData.username,
          email: tutorData.email,
          password: hashedPassword,
          role: 'tutor'
        });
        userId = Number(userResult[0].insertId);
        console.log(`    ✓ User account created`);
      }

      // Create tutor profile
      const tutorResult = await db.insert(tutors).values({
        userId: userId,
        fullName: tutorData.fullName,
        avatar: tutorData.avatar,
        bio: tutorData.bio,
        teachingMethod: tutorData.teachingMethod,
        education: tutorData.education,
        subjects: JSON.stringify([]),
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
      console.log(`    ✓ ${tutorData.subjects.length} subjects × ${tutorData.gradeLevels.length} grade levels`);

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

    console.log('\n✅ Successfully seeded database!');
    console.log('\n📊 Summary:');
    console.log(`  - 3 test users (admin, student, tutor)`);
    console.log(`  - ${insertedSubjects.length} subjects`);
    console.log(`  - ${insertedGradeLevels.length} grade levels`);
    console.log(`  - ${tutorsData.length} tutors (bao gồm 1 test tutor)`);
    console.log(`  - Tutor-subject relationships with normalized data`);
    console.log(`  - Time slots for all tutors`);

    console.log('\n🔑 TEST ACCOUNTS:');
    console.log('  Password for all: Test1234');
    console.log('\n  1. Admin:');
    console.log('     Username: admin');
    console.log('     Email: admin@test.com');
    console.log('     Dashboard: /admin');
    console.log('\n  2. Student:');
    console.log('     Username: student');
    console.log('     Email: student@test.com');
    console.log('     Dashboard: /student/dashboard');
    console.log('\n  3. Tutor (NO PROFILE - Use for testing registration):');
    console.log('     Username: tutor');
    console.log('     Email: tutor@test.com');
    console.log('     Registration: /tutor-registration');
    console.log('     Note: This account has NO tutor profile yet.');
    console.log('           Use it to test the tutor registration flow!');

    console.log('\n📝 OTHER TUTORS (password123):');
    tutorsData.forEach(t => console.log(`  - ${t.username}`));

    console.log('\n✨ Seeding completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error seeding database:', error);
    process.exit(1);
  }
}

main();
