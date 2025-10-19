import * as dotenv from 'dotenv';

// Load environment variables FIRST before any other imports
dotenv.config();

// Verify DATABASE_URL is loaded
if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL not found in environment variables');
  console.error('Please make sure .env file exists and contains DATABASE_URL');
  process.exit(1);
}

console.log('✓ Environment variables loaded');

import { db } from './src/lib/db';
import { users, tutors } from './src/lib/schema';
import bcrypt from 'bcryptjs';

async function seedTutors() {
  console.log('🌱 Starting to seed tutors...');

  try {
    // Sample tutors data
    const tutorsData = [
      {
        username: 'tutor_mai',
        email: 'mai@example.com',
        fullName: 'Nguyễn Thị Mai',
        avatar: 'https://i.pravatar.cc/150?img=5',
        bio: 'Tôi là giáo viên Toán có 5 năm kinh nghiệm giảng dạy THPT. Tôi đam mê giúp học sinh hiểu rõ bản chất của toán học và phát triển tư duy logic.',
        teachingMethod: 'Tôi sử dụng phương pháp giảng dạy tích cực, khuyến khích học sinh tự suy nghĩ và giải quyết vấn đề. Mỗi bài học đều có bài tập thực hành và ứng dụng thực tế.',
        education: JSON.stringify([{
          degree: 'Cử nhân Toán học',
          school: 'Đại học Sư phạm Hà Nội',
          year: '2018'
        }]),
        subjects: JSON.stringify([
          { subject: 'Toán', grades: ['lớp 10', 'lớp 11', 'lớp 12'] },
          { subject: 'Vật Lý', grades: ['lớp 10', 'lớp 11', 'lớp 12'] }
        ]),
        experience: 5,
        hourlyRate: 200000,
        occupation: 'Giáo viên',
        rating: 49, // 4.9/5.0 * 10
        totalReviews: 128,
        totalStudents: 45,
        verificationStatus: 'verified',
        certifications: JSON.stringify(['Chứng chỉ giáo viên dạy giỏi cấp thành phố']),
        achievements: JSON.stringify(['Top 10 giáo viên xuất sắc năm 2023'])
      },
      {
        username: 'tutor_hung',
        email: 'hung@example.com',
        fullName: 'Trần Văn Hùng',
        avatar: 'https://i.pravatar.cc/150?img=12',
        bio: 'Giáo viên Tiếng Anh chuyên luyện thi IELTS, TOEFL với 7 năm kinh nghiệm. Đã giúp hơn 200 học sinh đạt điểm mục tiêu.',
        teachingMethod: 'Phương pháp học tập tích cực với trọng tâm là giao tiếp và thực hành. Sử dụng tài liệu cập nhật và mô phỏng thi thực tế.',
        education: JSON.stringify([{
          degree: 'Thạc sĩ Ngôn ngữ Anh',
          school: 'Đại học Ngoại ngữ - ĐHQGHN',
          year: '2016'
        }]),
        subjects: JSON.stringify([
          { subject: 'Tiếng Anh', grades: ['IELTS', 'TOEFL', 'THPT'] }
        ]),
        experience: 7,
        hourlyRate: 250000,
        occupation: 'Chuyên gia',
        rating: 50, // 5.0/5.0 * 10
        totalReviews: 95,
        totalStudents: 67,
        verificationStatus: 'verified',
        certifications: JSON.stringify(['IELTS 8.5', 'TOEFL 115', 'TESOL Certificate']),
        achievements: JSON.stringify(['Giảng viên xuất sắc năm 2022', 'Top 5 giáo viên IELTS tốt nhất'])
      },
      {
        username: 'tutor_tu',
        email: 'tu@example.com',
        fullName: 'Lê Minh Tú',
        avatar: 'https://i.pravatar.cc/150?img=33',
        bio: 'Sinh viên năm cuối ngành Công nghệ thông tin, đam mê giảng dạy Toán và Tin học cho học sinh THCS.',
        teachingMethod: 'Sử dụng các ví dụ thực tế và game hóa để làm cho việc học trở nên thú vị và dễ hiểu.',
        education: JSON.stringify([{
          degree: 'Sinh viên năm 4 Công nghệ thông tin',
          school: 'Đại học Bách khoa Hà Nội',
          year: '2025'
        }]),
        subjects: JSON.stringify([
          { subject: 'Toán', grades: ['lớp 6', 'lớp 7', 'lớp 8', 'lớp 9'] },
          { subject: 'Vật Lý', grades: ['lớp 8', 'lớp 9'] },
          { subject: 'Tin học', grades: ['lớp 6', 'lớp 7', 'lớp 8', 'lớp 9'] }
        ]),
        experience: 3,
        hourlyRate: 120000,
        occupation: 'Sinh viên',
        rating: 47, // 4.7/5.0 * 10
        totalReviews: 76,
        totalStudents: 34,
        verificationStatus: 'verified',
        certifications: JSON.stringify(['Giải Nhất Olympic Tin học sinh viên 2023']),
        achievements: JSON.stringify(['GPA 3.8/4.0'])
      },
      {
        username: 'tutor_ha',
        email: 'ha@example.com',
        fullName: 'Phạm Thu Hà',
        avatar: 'https://i.pravatar.cc/150?img=47',
        bio: 'Giáo viên Hóa học và Sinh học với 4 năm kinh nghiệm, chuyên luyện thi đại học khối B.',
        teachingMethod: 'Kết hợp lý thuyết với thực hành thí nghiệm. Tập trung vào hiểu bản chất và ứng dụng thực tế.',
        education: JSON.stringify([{
          degree: 'Cử nhân Hóa học',
          school: 'Đại học Khoa học Tự nhiên - ĐHQGHN',
          year: '2019'
        }]),
        subjects: JSON.stringify([
          { subject: 'Hóa học', grades: ['lớp 10', 'lớp 11', 'lớp 12'] },
          { subject: 'Sinh học', grades: ['lớp 10', 'lớp 11', 'lớp 12'] }
        ]),
        experience: 4,
        hourlyRate: 180000,
        occupation: 'Giáo viên',
        rating: 48, // 4.8/5.0 * 10
        totalReviews: 54,
        totalStudents: 28,
        verificationStatus: 'verified',
        certifications: JSON.stringify(['Chứng chỉ giảng dạy THPT']),
        achievements: JSON.stringify(['90% học sinh đỗ đại học khối B'])
      }
    ];

    for (const tutorData of tutorsData) {
      console.log(`Creating user and tutor: ${tutorData.fullName}...`);

      // Create user account
      const hashedPassword = await bcrypt.hash('password123', 10);
      const userResult = await db.insert(users).values({
        username: tutorData.username,
        email: tutorData.email,
        password: hashedPassword,
        role: 'tutor'
      });

      const userId = Number(userResult[0].insertId);

      // Create tutor profile
      await db.insert(tutors).values({
        userId: userId,
        fullName: tutorData.fullName,
        avatar: tutorData.avatar,
        bio: tutorData.bio,
        teachingMethod: tutorData.teachingMethod,
        education: tutorData.education,
        subjects: tutorData.subjects,
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

      console.log(`✓ Created ${tutorData.fullName}`);
    }

    console.log('\n✅ Successfully seeded all tutors!');
    console.log('\nLogin credentials for all tutors:');
    console.log('Password: password123');
    console.log('\nUsernames:');
    tutorsData.forEach(t => console.log(`- ${t.username}`));
  } catch (error) {
    console.error('❌ Error seeding tutors:', error);
    throw error;
  }
}

seedTutors()
  .then(() => {
    console.log('\n✨ Seed completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to seed:', error);
    process.exit(1);
  });
