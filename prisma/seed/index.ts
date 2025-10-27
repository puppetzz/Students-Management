import { PrismaClient, EConduct } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Clear existing data in reverse order of dependencies
  await prisma.examResults.deleteMany();
  await prisma.classSubjects.deleteMany();
  await prisma.students.deleteMany();
  await prisma.classes.deleteMany();
  await prisma.subjects.deleteMany();
  await prisma.terms.deleteMany();

  // Create Terms
  const terms = await prisma.terms.createMany({
    data: [
      {
        name: "Học kỳ 1",
        schoolYear: "2024-2025",
      },
      {
        name: "Học kỳ 2",
        schoolYear: "2024-2025",
      },
      {
        name: "Học kỳ 1",
        schoolYear: "2023-2024",
      },
    ],
  });

  const createdTerms = await prisma.terms.findMany();

  // Create Subjects
  const subjects = await prisma.subjects.createMany({
    data: [
      { name: "Toán", description: "Môn Toán học" },
      { name: "Văn", description: "Môn Ngữ văn" },
      { name: "Anh", description: "Môn Tiếng Anh" },
      { name: "Lý", description: "Môn Vật lý" },
      { name: "Hóa", description: "Môn Hóa học" },
      { name: "Sinh", description: "Môn Sinh học" },
      { name: "Sử", description: "Môn Lịch sử" },
      { name: "Địa", description: "Môn Địa lý" },
      { name: "GDCD", description: "Môn Giáo dục công dân" },
    ],
  });

  const createdSubjects = await prisma.subjects.findMany();

  // Create Classes
  const classes = await prisma.classes.createMany({
    data: [
      {
        name: "12A1",
        description: "Lớp 12A1 - Khối A",
        termId: createdTerms[0].id,
      },
      {
        name: "12A2",
        description: "Lớp 12A2 - Khối A",
        termId: createdTerms[0].id,
      },
      {
        name: "12B1",
        description: "Lớp 12B1 - Khối B",
        termId: createdTerms[0].id,
      },
      {
        name: "11A1",
        description: "Lớp 11A1 - Khối A",
        termId: createdTerms[1].id,
      },
    ],
  });

  const createdClasses = await prisma.classes.findMany();

  // Create ClassSubjects relationships
  const classSubjectsData = [];
  for (const classItem of createdClasses) {
    // Each class has different subjects based on their focus
    if (classItem.name.includes("A")) {
      // Class A focuses on Math, Physics, Chemistry
      const subjectIds = createdSubjects
        .filter((s) => ["Toán", "Lý", "Hóa", "Văn", "Anh"].includes(s.name))
        .map((s) => s.id);

      for (const subjectId of subjectIds) {
        classSubjectsData.push({
          classId: classItem.id,
          subjectId: subjectId,
        });
      }
    } else {
      // Class B focuses on Biology, Chemistry, Math
      const subjectIds = createdSubjects
        .filter((s) => ["Toán", "Sinh", "Hóa", "Văn", "Anh"].includes(s.name))
        .map((s) => s.id);

      for (const subjectId of subjectIds) {
        classSubjectsData.push({
          classId: classItem.id,
          subjectId: subjectId,
        });
      }
    }
  }

  await prisma.classSubjects.createMany({
    data: classSubjectsData,
  });

  // Create Students
  const studentsData = [
    {
      firstName: "Nguyễn Văn",
      lastName: "An",
      dayOfBirth: new Date("2006-01-15"),
      hometown: "Hà Nội",
      permanentAddress: "123 Đường ABC, Hà Nội",
      vneid: "036206001234",
      conduct: EConduct.EXCELLENT,
      classId: createdClasses[0].id,
    },
    {
      firstName: "Trần Thị",
      lastName: "Bình",
      dayOfBirth: new Date("2006-03-20"),
      hometown: "Hồ Chí Minh",
      permanentAddress: "456 Đường XYZ, TP.HCM",
      vneid: "079206005678",
      conduct: EConduct.GOOD,
      classId: createdClasses[0].id,
    },
    {
      firstName: "Lê Văn",
      lastName: "Cường",
      dayOfBirth: new Date("2006-05-10"),
      hometown: "Đà Nẵng",
      permanentAddress: "789 Đường DEF, Đà Nẵng",
      vneid: "043206009876",
      conduct: EConduct.GOOD,
      classId: createdClasses[1].id,
    },
    {
      firstName: "Phạm Thị",
      lastName: "Dung",
      dayOfBirth: new Date("2006-07-25"),
      hometown: "Hải Phòng",
      permanentAddress: "321 Đường GHI, Hải Phòng",
      vneid: "031206004321",
      conduct: EConduct.AVERAGE,
      classId: createdClasses[1].id,
    },
    {
      firstName: "Hoàng Văn",
      lastName: "Em",
      dayOfBirth: new Date("2006-09-12"),
      hometown: "Cần Thơ",
      permanentAddress: "654 Đường JKL, Cần Thơ",
      vneid: "092206007890",
      conduct: EConduct.EXCELLENT,
      classId: createdClasses[2].id,
    },
    {
      firstName: "Vũ Thị",
      lastName: "Giang",
      dayOfBirth: new Date("2007-02-08"),
      hometown: "Hà Nội",
      permanentAddress: "987 Đường MNO, Hà Nội",
      vneid: "036207001122",
      conduct: EConduct.GOOD,
      classId: createdClasses[3].id,
    },
  ];

  const students = await prisma.students.createMany({
    data: studentsData,
  });

  const createdStudents = await prisma.students.findMany();

  // Create ExamResults
  const examResultsData = [];
  const classSubjects = await prisma.classSubjects.findMany({
    include: {
      class: {
        include: {
          students: true,
        },
      },
      subject: true,
    },
  });

  // Generate random scores for each student in subjects they study
  for (const classSubject of classSubjects) {
    for (const student of classSubject.class.students) {
      const score = Math.round((Math.random() * 4 + 6) * 10) / 10; // Random score between 6.0 and 10.0
      examResultsData.push({
        student_id: student.id,
        subject_id: classSubject.subjectId,
        scored: score,
      });
    }
  }

  await prisma.examResults.createMany({
    data: examResultsData,
  });

  // Update student averages
  for (const student of createdStudents) {
    const studentResults = await prisma.examResults.findMany({
      where: { student_id: student.id },
    });

    if (studentResults.length > 0) {
      const avgScoredSubjects =
        studentResults.reduce((sum, result) => sum + result.scored, 0) /
        studentResults.length;
      const avgOverall = avgScoredSubjects; // In this case, they're the same

      await prisma.students.update({
        where: { id: student.id },
        data: {
          avgScoredSubjects: Math.round(avgScoredSubjects * 100) / 100,
          avgOverall: Math.round(avgOverall * 100) / 100,
        },
      });
    }
  }

  console.log("Seed data created successfully!");
  console.log(`Created ${createdTerms.length} terms`);
  console.log(`Created ${createdSubjects.length} subjects`);
  console.log(`Created ${createdClasses.length} classes`);
  console.log(`Created ${createdStudents.length} students`);
  console.log(`Created ${examResultsData.length} exam results`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
