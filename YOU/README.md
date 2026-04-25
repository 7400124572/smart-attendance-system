# Smart Attendance System (Full Stack)

Minimal, functional Smart Attendance System:

- Backend: Node.js + Express + MongoDB (Mongoose) + JWT
- Frontend: React (Vite)

## Folder structure

```
YOU/
  backend/
  frontend/
```

## Prerequisites

- Node.js 18+ (recommended)
- MongoDB running locally (or use MongoDB Atlas)

## Backend setup (Express + MongoDB)

1. Open a terminal in `backend/`
2. Install dependencies:

```bash
npm install
```

3. Create `.env` (copy from `.env.example`) and update values:

```bash
copy .env.example .env
```

4. Start the API:

```bash
npm run dev
```

API runs on `http://localhost:5000`.

## Frontend setup (React)

1. Open a terminal in `frontend/`
2. Install dependencies:

```bash
npm install
```

3. Create `.env` (copy from `.env.example`) if needed:

```bash
copy .env.example .env
```

4. Start the app:

```bash
npm run dev
```

Frontend runs on `http://localhost:5173`.

## How to use

1. Register as **Teacher**, then login.
2. On Teacher dashboard:
   - Click **Generate Code** (default timer is 3 minutes)
   - Share the code with students
   - Watch **Live Attendance** and **Analytics**
   - Create a **Poll** and view results
3. Register as **Student**, login:
   - Enter the attendance code before it expires
   - Answer any live polls
   - View attendance history

## Implemented API endpoints

### Auth
- `POST /api/register`
- `POST /api/login`

### Teacher
- `POST /api/session/create`
- `GET /api/session/:id`
- `GET /api/session/:id/analytics`
- `POST /api/poll/create`
- `GET /api/poll/:id/results`

### Student
- `POST /api/session/join`
- `POST /api/poll/answer`
- `GET /api/student/attendance`

### Shared helper
- `GET /api/poll/session/:sessionId` (fetch active polls)

