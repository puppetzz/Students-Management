# STUDENTS MANAGEMENT APP

## 📦 1. Environment Setup

System Requirements

Before running the app, ensure that you have:

- Node.js >= 20
- npm or yarn
- Docker Desktop or Docker Engine + Docker Compose
- PostgreSQL CLI (optional for DB management)

## 🗂 2. Project Structure

```
students-management/
│
├── docker-compose.yml
├── Dockerfile
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── src/
│   ├── app/
│   ├── pages/
│   ├── api/
│   └── components/
│
├── package.json
└── README.md
```

## ⚙️ 3. Environment Variables

Create a .env file in the project root:

```
DATABASE_URL="postgresql://db_user:db_password@db_host:5432/db_name"
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
AWS_S3_BUCKET_NAME="s3_bucket_name"
AWS_REGION="aws_region"
AWS_S3_BUCKET_URL="https://s3_bucket_name.s3.aws_region.amazonaws.com"
NEXTAUTH_URL="https://qlhv.example.com"
AUTH_TRUST_HOST="https://qlhv.example.com"
```

## 🐳 4. Running the App with Docker

### 👉 4.1 Build & Start Containers

From the project root, run:

```
docker-compose up --build
```

Docker will start:

- qlhv_app – Next.js app (port 3000)

- db – PostgreSQL database (port 5432)

Access the application at:

🔗 http://localhost:3000

### 👉 4.2 Run Database Migrations

```
docker-compose exec app npx prisma migrate deploy
```

### 👉 4.3 Create user admin user (the first time you run the app)

```
curl -X POST "http://localhost:3000/api/trpc/user.generateAdmin" -H "x-api-key: <API_KEY_VALUE>" -H "Content-Type: application/json"
```

## ▶️ 5. Running the App Locally (without Docker)

### 5.1 Install dependencies

```
npm install
```

### 5.2 Start PostgreSQL manually

Update .env to point to your local PostgreSQL instance:

```
DATABASE_URL="postgresql://postgres:password@localhost:5432/students_db"
```

### 5.3 Run the development server

```
npm run dev
```

App will run at:
👉 http://localhost:3000

## 🧪 6. Useful Commands

| Command                  | Description                     |
| ------------------------ | ------------------------------- |
| `npm run dev`            | Run Next.js in development mode |
| `npm run build`          | Build for production            |
| `npm start`              | Start production server         |
| `npx prisma studio`      | Open Prisma DB UI               |
| `docker-compose up -d`   | Start app in detached mode      |
| `docker-compose logs -f` | View logs                       |

## 🗑 7. Stop & Remove Containers

Stop containers:

```
docker-compose down
```

## 📄 8. Additional Notes

- Easy to deploy to cloud servers using Docker
- Ready to scale with modules like Classes, Teachers, Grades
- API is implemented via Next.js API Routes
