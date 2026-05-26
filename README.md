# Evolv — AI-Powered Life Planning & Execution Platform

Evolv is a premium personal operating system designed to turn life vision into daily action. It blends long-term planning, short-term execution, task management, habit tracking, journaling, analytics, and AI coaching into a cohesive, high-performance workspace.

---

## 🌌 Core Planning Hierarchy

Evolv implements a structured, top-down life alignment model based on the following layers:

1. **Vision Layer**: Define your long-term life identity, core values, and life areas (Health, Career, Wealth, etc.).
2. **Yearly Planning**: Set yearly goals, themes, and word of the year, broken down into actionable milestones.
3. **Quarterly Planning**: Bridge strategy and execution with 90-day objectives and scorecards.
4. **Monthly Planning**: Set focus themes and habits, checked via the Monthly Reset and Monthly Life Score.
5. **Weekly Planning**: Set weekly priorities, plan Deep Work sessions, and build time-blocking schedules.
6. **Daily Planning**: Act on your top 3 daily focus priorities, record reflections, and track habits.
7. **Task Execution**: Manage tasks with dependencies, priorities, and difficulty metrics.
8. **Habit Tracking**: Track daily routine completion, build streaks, and monitor consistency.
9. **Journaling & Reflection**: Capture qualitative insights analyzed by the AI Life Coach.
10. **Analytics & AI Coaching**: Gain deep behavioral intelligence, burnout predictions, and action plans.

For detailed vocabulary and definitions, see [CONTEXT.md](file:///d:/Projects/evolv/CONTEXT.md).

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4 (vanilla CSS integration)
- **Icons**: Lucide React

### Backend
- **Language**: Go (Golang)
- **HTTP Routing**: Go Standard Library `net/http` ServeMux
- **ORM**: GORM (Go Object Relational Mapping)
- **Database**: PostgreSQL

### AI Engine
- **SDK**: Google Generative AI Go SDK (`github.com/google/generative-ai-go`)
- **Model**: `gemini-2.5-flash`

---

## 📋 Prerequisites

Ensure you have the following installed on your system:
- **Go** (v1.21 or later)
- **Node.js** (v18 or later) & **npm**
- **PostgreSQL** (running instance)
- **Google Gemini API Key** (from [Google AI Studio](https://aistudio.google.com/))

---

## ⚙️ Setup & Configuration

### 1. Backend Config
Navigate to the `server` directory and create/verify your `.env` file:
```env
DATABASE_URL=host=localhost user=postgres password=postgres dbname=evolv port=5432 sslmode=disable
JWT_SECRET=your-secure-jwt-secret-key
GEMINI_API_KEY=your-gemini-api-key
```

### 2. Database Setup
Create a PostgreSQL database named `evolv`:
```sql
CREATE DATABASE evolv;
```
*(The backend auto-migrates all tables automatically on startup).*

---

## 🚀 How to Run the Application

You need to start both the backend API server and the frontend dev server.

### Run the Backend (Go)
1. Open a terminal and navigate to the `server` directory:
   ```bash
   cd server
   ```
2. Run the server:
   ```bash
   go run main.go
   ```
   *The backend will run on `http://localhost:8081`.*

### Run the Frontend (React + Vite)
1. Open a new terminal window/tab and navigate to the `client` directory:
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
   *The frontend dev server will start (typically on `http://localhost:5173`).*

---

## 📁 Repository Structure

```
evolv/
├── client/          # React + TypeScript frontend
│   ├── src/         # UI components, pages, hooks, state
│   ├── public/      # Static assets
│   └── package.json # Frontend scripts and dependencies
├── server/          # Go backend API
│   ├── database/    # DB connection & migrations
│   ├── handlers/    # HTTP handlers / controller logic
│   ├── middleware/  # JWT Auth & CORS middleware
│   ├── models/      # GORM database schemas
│   ├── services/    # AI Service integration (Gemini)
│   ├── main.go      # Entry point
│   └── go.mod       # Go module definitions
├── CONTEXT.md       # Ubiquitous domain glossary
└── requirement.md   # Detailed product specifications
```
