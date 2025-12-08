import { PrismaClient, EConduct, EGender } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Clear existing data (optional - remove if you want to keep existing data)
  await prisma.examResults.deleteMany();
  await prisma.studentProfiles.deleteMany();
  await prisma.trainingProgramSubjects.deleteMany();
  await prisma.students.deleteMany();
  await prisma.classes.deleteMany();
  await prisma.trainingProgram.deleteMany();
  await prisma.subjects.deleteMany();
  await prisma.terms.deleteMany();

  // Create Terms (Khóa học)
  const k71 = await prisma.terms.create({
    data: {
      name: "K71",
      schoolYear: "2024",
    },
  });

  const k72 = await prisma.terms.create({
    data: {
      name: "K72",
      schoolYear: "2025",
    },
  });

  const k73 = await prisma.terms.create({
    data: {
      name: "K73",
      schoolYear: "2026",
    },
  });

  // Create Subjects with codes
  const subjects = await Promise.all([
    prisma.subjects.create({
      data: {
        code: "TLAK",
        name: "Tiểu Liên AK",
        description: "Môn học về tiểu liên AK",
        scoreCoefficient: 2,
        material: [
          {
            name: "Giáo trình Tiểu liên AK cơ bản",
            unit: "cuốn",
            amount: "1",
            note: "Sách giáo khoa chính",
          },
          {
            name: "Sách hướng dẫn sử dụng AK-47",
            unit: "cuốn",
            amount: "1",
            note: "Tài liệu tham khảo",
          },
          {
            name: "Tiểu liên AK mô phỏng",
            unit: "khẩu",
            amount: "1",
            note: "Dụng cụ thực hành",
          },
          {
            name: "Đạn tập",
            unit: "viên",
            amount: "20",
            note: "Cho buổi thực hành",
          },
          {
            name: "Thời gian thực hành",
            unit: "giờ",
            amount: "40",
            note: "Tổng thời gian thực hành trong khóa học",
          },
        ],
      },
    }),
    prisma.subjects.create({
      data: {
        code: "STCB",
        name: "Súng trường CKC",
        description: "Môn học về súng trường CKC",
        scoreCoefficient: 2,
        material: [
          {
            name: "Giáo trình Súng trường CKC",
            unit: "cuốn",
            amount: "1",
            note: "Sách giáo khoa chính",
          },
          {
            name: "Hướng dẫn bảo dưỡng súng trường",
            unit: "cuốn",
            amount: "1",
            note: "Tài liệu hướng dẫn",
          },
          {
            name: "Súng trường CKC",
            unit: "khẩu",
            amount: "1",
            note: "Dụng cụ thực hành",
          },
          {
            name: "Đạn tập",
            unit: "viên",
            amount: "15",
            note: "Cho buổi thực hành",
          },
          {
            name: "Dụng cụ vệ sinh súng",
            unit: "bộ",
            amount: "1",
            note: "Bảo dưỡng thiết bị",
          },
          {
            name: "Thời gian thực hành",
            unit: "giờ",
            amount: "35",
            note: "Tổng thời gian thực hành trong khóa học",
          },
        ],
      },
    }),
    prisma.subjects.create({
      data: {
        code: "CTQS",
        name: "Chính trị quân sự",
        description: "Môn học chính trị quân sự",
        scoreCoefficient: 1,
        material: [
          {
            name: "Giáo trình Chính trị quân sự",
            unit: "cuốn",
            amount: "1",
            note: "Sách giáo khoa chính",
          },
          {
            name: "Tư tưởng Hồ Chí Minh về quân sự",
            unit: "cuốn",
            amount: "1",
            note: "Tài liệu tham khảo",
          },
          {
            name: "Thời gian học lý thuyết",
            unit: "giờ",
            amount: "20",
            note: "Thời gian học trên lớp",
          },
        ],
      },
    }),
    prisma.subjects.create({
      data: {
        code: "KTQS",
        name: "Kỹ thuật quân sự",
        description: "Môn học kỹ thuật quân sự",
        scoreCoefficient: 2,
        material: [
          {
            name: "Giáo trình Kỹ thuật quân sự",
            unit: "cuốn",
            amount: "1",
            note: "Sách giáo khoa chính",
          },
          {
            name: "Sách hướng dẫn công binh",
            unit: "cuốn",
            amount: "1",
            note: "Tài liệu chuyên ngành",
          },
          {
            name: "Dụng cụ công binh",
            unit: "bộ",
            amount: "1",
            note: "Dụng cụ thực hành",
          },
          {
            name: "Máy đo",
            unit: "chiếc",
            amount: "1",
            note: "Thiết bị đo đạc",
          },
          {
            name: "Bản đồ địa hình",
            unit: "tờ",
            amount: "3",
            note: "Bản đồ khu vực thực hành",
          },
          {
            name: "Thời gian thực hành",
            unit: "giờ",
            amount: "45",
            note: "Tổng thời gian thực hành trong khóa học",
          },
        ],
      },
    }),
    prisma.subjects.create({
      data: {
        code: "TDQS",
        name: "Thể dục quân sự",
        description: "Môn học thể dục quân sự",
        scoreCoefficient: 1,
        material: [
          {
            name: "Quy định về thể dục quân sự",
            unit: "cuốn",
            amount: "1",
            note: "Tài liệu hướng dẫn",
          },
          {
            name: "Đồng phục thể dục",
            unit: "bộ",
            amount: "2",
            note: "Trang phục tập luyện",
          },
          {
            name: "Giày thể thao",
            unit: "đôi",
            amount: "1",
            note: "Giày chạy bộ chuyên dụng",
          },
          {
            name: "Dụng cụ tập luyện",
            unit: "bộ",
            amount: "1",
            note: "Thiết bị hỗ trợ tập luyện",
          },
          {
            name: "Thời gian thực hành",
            unit: "giờ",
            amount: "30",
            note: "Tổng thời gian tập luyện trong khóa học",
          },
        ],
      },
    }),
    prisma.subjects.create({
      data: {
        code: "PLQS",
        name: "Pháp luật quân sự",
        description: "Môn học pháp luật quân sự",
        scoreCoefficient: 1,
        material: [
          {
            name: "Pháp luật quân sự Việt Nam",
            unit: "cuốn",
            amount: "1",
            note: "Sách giáo khoa chính",
          },
          {
            name: "Các văn bản pháp quy quân sự",
            unit: "tập",
            amount: "1",
            note: "Tài liệu pháp lý",
          },
          {
            name: "Thời gian học lý thuyết",
            unit: "giờ",
            amount: "15",
            note: "Thời gian học trên lớp",
          },
        ],
      },
    }),
  ]);

  // Create Training Programs
  const trainingPrograms = await Promise.all([
    prisma.trainingProgram.create({
      data: {
        name: "Chương trình đào tạo Sĩ quan dự bị",
        description: "Chương trình đào tạo sĩ quan dự bị cơ bản",
      },
    }),
    prisma.trainingProgram.create({
      data: {
        name: "Chương trình đào tạo Hạ sĩ quan",
        description: "Chương trình đào tạo hạ sĩ quan chuyên nghiệp",
      },
    }),
    prisma.trainingProgram.create({
      data: {
        name: "Chương trình đào tạo Chiến sĩ",
        description: "Chương trình đào tạo chiến sĩ cơ bản",
      },
    }),
  ]);

  const [programA, programB, programC] = trainingPrograms;

  // Create TrainingProgramSubjects relationships
  // Program A (Sĩ quan dự bị) - all subjects
  for (const subject of subjects) {
    await prisma.trainingProgramSubjects.create({
      data: {
        trainingProgramId: programA.id,
        subjectId: subject.id,
      },
    });
  }

  // Program B (Hạ sĩ quan) - most subjects except PLQS
  const programBSubjects = subjects.filter((s) => s.code !== "PLQS");
  for (const subject of programBSubjects) {
    await prisma.trainingProgramSubjects.create({
      data: {
        trainingProgramId: programB.id,
        subjectId: subject.id,
      },
    });
  }

  // Program C (Chiến sĩ) - basic subjects only
  const programCSubjectCodes = ["TLAK", "STCB", "TDQS", "CTQS"];
  const programCSubjects = subjects.filter((s) =>
    programCSubjectCodes.includes(s.code),
  );
  for (const subject of programCSubjects) {
    await prisma.trainingProgramSubjects.create({
      data: {
        trainingProgramId: programC.id,
        subjectId: subject.id,
      },
    });
  }

  // Create Classes for different courses with training programs
  const classes = await Promise.all([
    // Classes for K71 - Program A
    prisma.classes.create({
      data: {
        name: "K71A1",
        description: "Lớp A1 khóa 71 - Sĩ quan dự bị",
        termId: k71.id,
        trainingProgramId: programA.id,
      },
    }),
    prisma.classes.create({
      data: {
        name: "K71B1",
        description: "Lớp B1 khóa 71 - Hạ sĩ quan",
        termId: k71.id,
        trainingProgramId: programB.id,
      },
    }),
    // Classes for K72 - Mix of programs
    prisma.classes.create({
      data: {
        name: "K72A1",
        description: "Lớp A1 khóa 72 - Sĩ quan dự bị",
        termId: k72.id,
        trainingProgramId: programA.id,
      },
    }),
    prisma.classes.create({
      data: {
        name: "K72A2",
        description: "Lớp A2 khóa 72 - Sĩ quan dự bị",
        termId: k72.id,
        trainingProgramId: programA.id,
      },
    }),
    prisma.classes.create({
      data: {
        name: "K72B1",
        description: "Lớp B1 khóa 72 - Hạ sĩ quan",
        termId: k72.id,
        trainingProgramId: programB.id,
      },
    }),
    // Classes for K73 - Program C
    prisma.classes.create({
      data: {
        name: "K73A1",
        description: "Lớp A1 khóa 73 - Chiến sĩ",
        termId: k73.id,
        trainingProgramId: programC.id,
      },
    }),
  ]);

  // Student data arrays
  const lastNames = [
    "Nguyễn Văn",
    "Trần Văn",
    "Lê Thị",
    "Phạm Văn",
    "Hoàng Thị",
    "Vũ Văn",
    "Phan Thị",
    "Đỗ Văn",
    "Bùi Thị",
    "Đặng Văn",
    "Ngô Thị",
    "Dương Văn",
    "Lý Thị",
    "Mai Văn",
    "Cao Thị",
    "Tô Văn",
    "Chu Thị",
    "Lưu Văn",
    "Hà Thị",
    "Đinh Văn",
  ];

  const firstNames = [
    "An",
    "Bình",
    "Cúc",
    "Dũng",
    "Hoa",
    "Em",
    "Giang",
    "Hùng",
    "Linh",
    "Nam",
    "Oanh",
    "Phong",
    "Quyên",
    "Sơn",
    "Tú",
    "Uyên",
    "Vinh",
    "Xuân",
    "Yến",
    "Đức",
    "Minh",
    "Thành",
    "Hạnh",
    "Kiên",
    "Lan",
    "Mạnh",
    "Nga",
    "Phúc",
    "Quang",
    "Hải",
  ];

  const hometowns = [
    "Hà Nội",
    "Hồ Chí Minh",
    "Đà Nẵng",
    "Hải Phòng",
    "Cần Thơ",
    "Nghệ An",
    "Thanh Hóa",
    "Nam Định",
    "Thái Bình",
    "Hưng Yên",
    "Bắc Ninh",
    "Quảng Ninh",
    "Lạng Sơn",
    "Cao Bằng",
    "Hà Giang",
    "Lào Cai",
    "Sơn La",
    "Điện Biên",
    "Lai Châu",
    "Yên Bái",
  ];

  const conducts = [
    EConduct.POOR,
    EConduct.AVERAGE,
    EConduct.GOOD,
    EConduct.EXCELLENT,
  ];

  // Create Students for each class
  const allStudents = [];
  let studentCounter = 1; // Global counter for unique student IDs

  for (let classIndex = 0; classIndex < classes.length; classIndex++) {
    const classObj = classes[classIndex];
    if (!classObj) continue;

    const studentsPerClass = classIndex < 2 ? 8 : 10; // K71 classes have 8 students, others have 10

    for (let i = 0; i < studentsPerClass; i++) {
      const firstName =
        firstNames[Math.floor(Math.random() * firstNames.length)]!;
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]!;
      const hometown = hometowns[Math.floor(Math.random() * hometowns.length)]!;
      const conduct = conducts[Math.floor(Math.random() * conducts.length)]!;

      // Generate birth year based on course
      let birthYear = 2001; // Default for K71
      if (classObj.name.startsWith("K72")) birthYear = 2002;
      if (classObj.name.startsWith("K73")) birthYear = 2003;

      const birthMonth = Math.floor(Math.random() * 12) + 1;
      const birthDay = Math.floor(Math.random() * 28) + 1;
      const dayOfBirth = new Date(birthYear, birthMonth - 1, birthDay);

      // Generate unique VNEID with exactly 12 characters
      // Format: YYYYMMDDXXXX where YYYY is birth year, MM is birth month, DD is birth day, XXXX is unique counter
      const vneid = `${birthYear}${String(birthMonth).padStart(2, "0")}${String(birthDay).padStart(2, "0")}${String(studentCounter).padStart(4, "0")}`;
      studentCounter++;

      // Generate random gender
      const genders = [EGender.MALE, EGender.FEMALE];
      const gender = genders[Math.floor(Math.random() * genders.length)]!;

      // Create student record first
      const student = await prisma.students.create({
        data: {
          firstName,
          lastName,
          vneid,
          conduct,
          classId: classObj.id,
        },
      });

      // Create student profile
      await prisma.studentProfiles.create({
        data: {
          studentId: student.id,
          gender,
          dayOfBirth,
          placeOfBirth: hometown,
          hometown,
          permanentAddress: `${Math.floor(Math.random() * 999) + 1} Đường ${lastName}, ${hometown}`,
          phoneNumber: `09${Math.floor(Math.random() * 100000000)
            .toString()
            .padStart(8, "0")}`,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/\s+/g, "")}.${studentCounter}@example.com`,
          fatherName: `${lastNames[Math.floor(Math.random() * lastNames.length)]!} ${firstNames[Math.floor(Math.random() * firstNames.length)]!}`,
          motherName: `${lastNames[Math.floor(Math.random() * lastNames.length)]!} ${firstNames[Math.floor(Math.random() * firstNames.length)]!}`,
          ethnicity: "Kinh",
          religion: Math.random() > 0.7 ? "Phật giáo" : null,
          educationLevel: "12/12",
        },
      });

      allStudents.push(student);
    }
  }

  // Create ExamResults based on training program subjects
  const examResults = [];
  for (const student of allStudents) {
    // Get the class to find its training program
    const studentClass = classes.find((c) => c.id === student.classId);
    if (!studentClass) continue;

    // Get subjects for this training program
    const programSubjects = await prisma.trainingProgramSubjects.findMany({
      where: { trainingProgramId: studentClass.trainingProgramId },
      include: { subject: true },
    });

    for (const programSubject of programSubjects) {
      // Generate realistic scores based on conduct
      let baseScore = 7;
      if (student.conduct === EConduct.EXCELLENT) baseScore = 9;
      else if (student.conduct === EConduct.GOOD) baseScore = 8;
      else if (student.conduct === EConduct.AVERAGE) baseScore = 7;
      else baseScore = 6; // POOR

      // Add some randomness
      const variation = (Math.random() - 0.5) * 2; // -1 to +1
      const score = Math.max(5, Math.min(10, baseScore + variation));

      examResults.push({
        studentId: student.id,
        subjectId: programSubject.subjectId,
        scored: Math.round(score * 10) / 10, // Round to 1 decimal place
      });
    }
  }

  await prisma.examResults.createMany({
    data: examResults,
  });

  // Update student averages
  for (const student of allStudents) {
    const results = await prisma.examResults.findMany({
      where: { studentId: student.id },
      include: {
        subject: {
          select: {
            scoreCoefficient: true,
          },
        },
      },
    });

    // Calculate weighted average using subject coefficients
    const totalWeighted = results.reduce(
      (sum, result) => sum + result.scored * result.subject.scoreCoefficient,
      0,
    );
    const totalCoefficient = results.reduce(
      (sum, result) => sum + result.subject.scoreCoefficient,
      0,
    );

    const avgScoredSubjects =
      totalCoefficient > 0 ? totalWeighted / totalCoefficient : 0;

    await prisma.students.update({
      where: { id: student.id },
      data: {
        avgScoredSubjects: Math.round(avgScoredSubjects * 10) / 10,
        avgOverall: Math.round(avgScoredSubjects * 10) / 10,
      },
    });
  }

  console.log("Seed data created successfully!");
  console.log(`Created ${trainingPrograms.length} training programs`);
  console.log(`Created ${subjects.length} subjects`);
  console.log(`Created ${classes.length} classes`);
  console.log(`Created ${allStudents.length} students with profiles`);
  console.log("Distribution:");

  for (const cls of classes) {
    const studentCount = allStudents.filter((s) => s.classId === cls.id).length;
    const program = trainingPrograms.find(
      (p) => p.id === cls.trainingProgramId,
    );
    console.log(
      `  ${cls.name}: ${studentCount} students (${program?.name ?? "Unknown"})`,
    );
  }

  console.log("Terms: K71 (2024), K72 (2025), K73 (2026)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
