import { PrismaClient, EConduct } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Clear existing data (optional - remove if you want to keep existing data)
  await prisma.examResults.deleteMany();
  await prisma.classSubjects.deleteMany();
  await prisma.students.deleteMany();
  await prisma.classes.deleteMany();
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
      },
    }),
    prisma.subjects.create({
      data: {
        code: "STCB",
        name: "Súng trường CKC",
        description: "Môn học về súng trường CKC",
      },
    }),
    prisma.subjects.create({
      data: {
        code: "CTQS",
        name: "Chính trị quân sự",
        description: "Môn học chính trị quân sự",
      },
    }),
    prisma.subjects.create({
      data: {
        code: "KTQS",
        name: "Kỹ thuật quân sự",
        description: "Môn học kỹ thuật quân sự",
      },
    }),
    prisma.subjects.create({
      data: {
        code: "TDQS",
        name: "Thể dục quân sự",
        description: "Môn học thể dục quân sự",
      },
    }),
    prisma.subjects.create({
      data: {
        code: "PLQS",
        name: "Pháp luật quân sự",
        description: "Môn học pháp luật quân sự",
      },
    }),
  ]);

  // Create Classes for different courses
  const classes = await Promise.all([
    // Classes for K71
    prisma.classes.create({
      data: {
        name: "K71A1",
        description: "Lớp A1 khóa 71",
        termId: k71.id,
      },
    }),
    prisma.classes.create({
      data: {
        name: "K71B1",
        description: "Lớp B1 khóa 71",
        termId: k71.id,
      },
    }),
    // Classes for K72
    prisma.classes.create({
      data: {
        name: "K72A1",
        description: "Lớp A1 khóa 72",
        termId: k72.id,
      },
    }),
    prisma.classes.create({
      data: {
        name: "K72A2",
        description: "Lớp A2 khóa 72",
        termId: k72.id,
      },
    }),
    prisma.classes.create({
      data: {
        name: "K72B1",
        description: "Lớp B1 khóa 72",
        termId: k72.id,
      },
    }),
    // Classes for K73
    prisma.classes.create({
      data: {
        name: "K73A1",
        description: "Lớp A1 khóa 73",
        termId: k73.id,
      },
    }),
  ]);

  // Create ClassSubjects relationships
  for (const cls of classes) {
    for (const subject of subjects) {
      await prisma.classSubjects.create({
        data: {
          classId: cls.id,
          subjectId: subject.id,
        },
      });
    }
  }

  // Student data arrays
  const firstNames = [
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

  const lastNames = [
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

  for (let classIndex = 0; classIndex < classes.length; classIndex++) {
    const classObj = classes[classIndex];
    const studentsPerClass = classIndex < 2 ? 8 : 10; // K71 classes have 8 students, others have 10

    for (let i = 0; i < studentsPerClass; i++) {
      const firstName =
        firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const hometown = hometowns[Math.floor(Math.random() * hometowns.length)];
      const conduct = conducts[Math.floor(Math.random() * conducts.length)];

      // Generate birth year based on course
      let birthYear = 2001; // Default for K71
      if (classObj.name.startsWith("K72")) birthYear = 2002;
      if (classObj.name.startsWith("K73")) birthYear = 2003;

      const birthMonth = Math.floor(Math.random() * 12) + 1;
      const birthDay = Math.floor(Math.random() * 28) + 1;

      // Generate unique VNEID
      const vneid = `00${birthYear}${String(birthMonth).padStart(2, "0")}${String(classIndex).padStart(2, "0")}${String(i).padStart(3, "0")}`;

      const student = await prisma.students.create({
        data: {
          firstName,
          lastName,
          dayOfBirth: new Date(birthYear, birthMonth - 1, birthDay),
          hometown,
          permanentAddress: `${Math.floor(Math.random() * 999) + 1} Đường ${lastName}, ${hometown}`,
          vneid,
          conduct,
          classId: classObj.id,
        },
      });

      allStudents.push(student);
    }
  }

  // Create ExamResults
  const examResults = [];
  for (const student of allStudents) {
    for (const subject of subjects) {
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
        student_id: student.id,
        subject_id: subject.id,
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
      where: { student_id: student.id },
    });

    const avgScoredSubjects =
      results.reduce((sum, result) => sum + result.scored, 0) / results.length;

    await prisma.students.update({
      where: { id: student.id },
      data: {
        avgScoredSubjects: Math.round(avgScoredSubjects * 10) / 10,
        avgOverall: Math.round(avgScoredSubjects * 10) / 10,
      },
    });
  }

  console.log("Seed data created successfully!");
  console.log(`Created ${subjects.length} subjects`);
  console.log(`Created ${classes.length} classes`);
  console.log(`Created ${allStudents.length} students`);
  console.log("Distribution:");

  for (const cls of classes) {
    const studentCount = allStudents.filter((s) => s.classId === cls.id).length;
    console.log(`  ${cls.name}: ${studentCount} students`);
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
