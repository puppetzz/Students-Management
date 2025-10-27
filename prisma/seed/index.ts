import { PrismaClient, EConduct } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Bắt đầu seeding database...");

  // Tạo học kỳ
  const terms = await prisma.terms.createMany({
    data: [
      {
        name: "Học kỳ I",
        schoolYear: "2023-2024",
      },
      {
        name: "Học kỳ II",
        schoolYear: "2023-2024",
      },
      {
        name: "Học kỳ I",
        schoolYear: "2024-2025",
      },
    ],
  });
  console.log("✅ Đã tạo học kỳ");

  // Lấy học kỳ đã tạo
  const termList = await prisma.terms.findMany();

  // Tạo lớp học
  const classes = await prisma.classes.createMany({
    data: [
      {
        name: "10A1",
        description: "Lớp 10 chuyên Toán",
        termId: termList[0].id,
      },
      {
        name: "10A2",
        description: "Lớp 10 chuyên Lý",
        termId: termList[0].id,
      },
      {
        name: "11B1",
        description: "Lớp 11 chuyên Hóa",
        termId: termList[1].id,
      },
      {
        name: "12C1",
        description: "Lớp 12 chuyên Văn",
        termId: termList[2].id,
      },
    ],
  });
  console.log("✅ Đã tạo lớp học");

  // Lấy lớp học đã tạo
  const classList = await prisma.classes.findMany();

  // Tạo môn học
  const subjects = await prisma.subjects.createMany({
    data: [
      {
        name: "Toán học",
        description: "Môn Toán học cơ bản và nâng cao",
      },
      {
        name: "Vật lý",
        description: "Môn Vật lý từ cơ bản đến nâng cao",
      },
      {
        name: "Hóa học",
        description: "Môn Hóa học và thực hành",
      },
      {
        name: "Ngữ văn",
        description: "Môn Ngữ văn và văn học Việt Nam",
      },
      {
        name: "Tiếng Anh",
        description: "Môn Tiếng Anh giao tiếp và học thuật",
      },
      {
        name: "Lịch sử",
        description: "Môn Lịch sử Việt Nam và thế giới",
      },
      {
        name: "Địa lý",
        description: "Môn Địa lý tự nhiên và kinh tế",
      },
      {
        name: "Sinh học",
        description: "Môn Sinh học từ cơ bản đến nâng cao",
      },
    ],
  });
  console.log("✅ Đã tạo môn học");

  // Lấy môn học đã tạo
  const subjectList = await prisma.subjects.findMany();

  // Tạo quan hệ lớp-môn học
  const classSubjects = [];
  for (const classItem of classList) {
    // Mỗi lớp có 6-8 môn học
    const subjectsForClass = subjectList.slice(
      0,
      Math.floor(Math.random() * 3) + 6,
    );
    for (const subject of subjectsForClass) {
      classSubjects.push({
        class_id: classItem.id,
        subject_id: subject.id,
      });
    }
  }

  await prisma.classSubjects.createMany({
    data: classSubjects,
  });
  console.log("✅ Đã tạo quan hệ lớp-môn học");

  // Tạo học sinh
  const vietnameseFirstNames = [
    "Nguyễn",
    "Trần",
    "Lê",
    "Phạm",
    "Hoàng",
    "Huỳnh",
    "Phan",
    "Vũ",
    "Võ",
    "Đặng",
    "Bùi",
    "Đỗ",
    "Hồ",
    "Ngô",
    "Dương",
    "Lý",
    "Mai",
    "Đinh",
    "Tô",
    "Lưu",
  ];

  const vietnameseLastNames = [
    "Văn Minh",
    "Thị Lan",
    "Minh Tâm",
    "Hoàng Long",
    "Thị Hoa",
    "Văn Đức",
    "Thị Mai",
    "Minh Khoa",
    "Văn Hùng",
    "Thị Linh",
    "Minh Tuấn",
    "Thị Thu",
    "Văn Nam",
    "Thị Nga",
    "Minh Anh",
    "Thị Phương",
    "Văn Quân",
    "Thị Hương",
    "Minh Đức",
    "Thị Thảo",
    "Văn Kiên",
    "Thị Nhung",
    "Minh Hải",
    "Thị Vy",
    "Văn Tài",
    "Thị Xuân",
    "Minh Hoàng",
    "Thị Yến",
    "Văn Bình",
    "Thị Loan",
  ];

  const vietnameseHometowns = [
    "Hà Nội",
    "Hồ Chí Minh",
    "Đà Nẵng",
    "Hải Phòng",
    "Cần Thơ",
    "An Giang",
    "Bà Rịa - Vũng Tàu",
    "Bạc Liêu",
    "Bắc Giang",
    "Bắc Kạn",
    "Bắc Ninh",
    "Bến Tre",
    "Bình Định",
    "Bình Dương",
    "Bình Phước",
    "Bình Thuận",
    "Cà Mau",
    "Cao Bằng",
    "Đắk Lắk",
    "Đắk Nông",
    "Điện Biên",
    "Đồng Nai",
    "Đồng Tháp",
    "Gia Lai",
    "Hà Giang",
    "Hà Nam",
    "Hà Tĩnh",
    "Hải Dương",
    "Hậu Giang",
    "Hòa Bình",
    "Hưng Yên",
    "Khánh Hòa",
    "Kiên Giang",
  ];

  const students = [];
  const conducts = Object.values(EConduct);

  for (let i = 0; i < 120; i++) {
    const firstName =
      vietnameseFirstNames[
        Math.floor(Math.random() * vietnameseFirstNames.length)
      ];
    const lastName =
      vietnameseLastNames[
        Math.floor(Math.random() * vietnameseLastNames.length)
      ];
    const hometown =
      vietnameseHometowns[
        Math.floor(Math.random() * vietnameseHometowns.length)
      ];
    const conduct = conducts[Math.floor(Math.random() * conducts.length)];
    const classId = classList[Math.floor(Math.random() * classList.length)].id;

    // Tạo ngày sinh từ 2005-2008
    const year = 2005 + Math.floor(Math.random() * 4);
    const month = Math.floor(Math.random() * 12) + 1;
    const day = Math.floor(Math.random() * 28) + 1;
    const dayOfBirth = new Date(year, month - 1, day);

    students.push({
      firstName,
      lastName,
      dayOfBirth,
      hometown,
      conduct,
      classId,
      avgScoredSubjects: Math.round((Math.random() * 3 + 7) * 10) / 10, // 7.0 - 10.0
      avgOverall: Math.round((Math.random() * 3 + 7) * 10) / 10, // 7.0 - 10.0
    });
  }

  await prisma.students.createMany({
    data: students,
  });
  console.log("✅ Đã tạo học sinh");

  // Lấy học sinh đã tạo
  const studentList = await prisma.students.findMany();

  // Tạo kết quả thi cho học sinh
  const examResults = [];
  for (const student of studentList) {
    // Lấy các môn học của lớp của học sinh
    const studentClassSubjects = await prisma.classSubjects.findMany({
      where: { class_id: student.classId },
      include: { subject: true },
    });

    for (const classSubject of studentClassSubjects) {
      // Mỗi học sinh có điểm cho mỗi môn trong lớp
      examResults.push({
        student_id: student.id,
        subject_id: classSubject.subject_id,
        scored: Math.round((Math.random() * 3 + 7) * 10) / 10, // Điểm từ 7.0 đến 10.0
      });
    }
  }

  await prisma.examResults.createMany({
    data: examResults,
  });
  console.log("✅ Đã tạo kết quả thi");

  console.log("🎉 Hoàn thành seeding database!");
  console.log(`📊 Thống kê:`);
  console.log(`   - ${termList.length} học kỳ`);
  console.log(`   - ${classList.length} lớp học`);
  console.log(`   - ${subjectList.length} môn học`);
  console.log(`   - ${studentList.length} học sinh`);
  console.log(`   - ${examResults.length} kết quả thi`);
}

main()
  .catch((e) => {
    console.error("❌ Lỗi khi seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
