package main

import (
	"fmt"
	"log"
	"os"
	"time"

	"evolv-server/database"
	"evolv-server/models"

	"github.com/joho/godotenv"
)

func parseDate(s string) *time.Time {
	if s == "" || s == "Ongoing" {
		return nil
	}
	t, err := time.Parse("2006-01-02", s)
	if err == nil {
		return &t
	}
	t, err = time.Parse("January 2, 2006", s)
	if err == nil {
		return &t
	}
	t, err = time.Parse("January 2, 2006", s+", 2026")
	if err == nil {
		return &t
	}
	return nil
}

func main() {
	_ = godotenv.Load()
	database.Connect()

	// ── Find the user ──────────────────────────────────────────────────
	var user models.User
	if err := database.DB.Where("email = ?", "skshubham1437@gmail.com").First(&user).Error; err != nil {
		log.Fatalf("User not found: %v", err)
	}
	uid := user.ID
	fmt.Printf("✅ Found user: %s (ID=%d)\n", user.Name, uid)

	// ── Timelines ──────────────────────────────────────────────────────
	// Today: 2026-05-31.  None of the original goals are completed, so
	// we remap the original Q1-Q4 plan into the 7 months remaining:
	//
	// Q3 2026 (Jul-Sep) ← Original Q1 + Q2 goals (Switch job, Backend,
	//                      System Design, DSA, Health, Communication)
	// Q4 2026 (Oct-Dec) ← Original Q3 + Q4 goals (DevOps, Finance,
	//                      Physical, Leadership, Personal Growth, Reflection)
	//
	// June 2026 (current month) is the ramp-up / catch-up month.

	// ─────────────────────────────────────────────────────────────────────
	// 1. YEARLY GOALS
	// ─────────────────────────────────────────────────────────────────────
	yearlyGoals := []models.Goal{
		// ── Learning ──
		{UserID: uid, Title: "Learn & Build Microservices", Description: "Build production-ready microservices using Spring Boot and Go", Priority: "high", DueDate: parseDate("2026-12-31"), Status: "active"},
		{UserID: uid, Title: "Master DevOps Skills", Description: "Docker, CI/CD, cloud fundamentals (AWS/Azure), and deploy real projects", Priority: "high", DueDate: parseDate("2026-12-31"), Status: "active"},
		{UserID: uid, Title: "Learn System Design & DSA", Description: "System design fundamentals to advanced scalability patterns + DSA for interviews", Priority: "high", DueDate: parseDate("2026-12-31"), Status: "active"},

		// ── Career ──
		{UserID: uid, Title: "Learn New Skills & Switch Job", Description: "Revise resume, practice DSA, apply to companies, and land a better role", Priority: "high", DueDate: parseDate("2026-09-30"), Status: "active"},
		{UserID: uid, Title: "Learn Management Skills", Description: "Management basics, mentoring juniors, guiding peers, leadership positioning", Priority: "medium", DueDate: parseDate("2026-12-31"), Status: "active"},

		// ── Personal Growth ──
		{UserID: uid, Title: "Build Confidence & Communication", Description: "Work on communication polish, clear writing, grammar, and reduce self-doubt", Priority: "high", DueDate: parseDate("2026-12-31"), Status: "active"},

		// ── Health ──
		{UserID: uid, Title: "Exercise & Health Consistency", Description: "Exercise 4-5 days/week, eat healthy meals, run 6 km by year end", Priority: "high", DueDate: parseDate("2026-12-31"), Status: "active"},

		// ── Finance ──
		{UserID: uid, Title: "Invest More & Wisely", Description: "Learn investing basics, track expenses, start SIP/investment plan", Priority: "medium", DueDate: parseDate("2026-12-31"), Status: "active"},
	}

	// Insert yearly goals and capture IDs
	goalIDs := make(map[string]uint) // title → ID
	for i := range yearlyGoals {
		database.DB.Create(&yearlyGoals[i])
		goalIDs[yearlyGoals[i].Title] = yearlyGoals[i].ID
		fmt.Printf("  📎 Goal: %s (ID=%d)\n", yearlyGoals[i].Title, yearlyGoals[i].ID)
	}

	// ─────────────────────────────────────────────────────────────────────
	// 2. KEY RESULTS for each yearly goal
	// ─────────────────────────────────────────────────────────────────────
	keyResults := []models.KeyResult{
		// Microservices
		{GoalID: goalIDs["Learn & Build Microservices"], Text: "Complete a Spring Boot microservices course"},
		{GoalID: goalIDs["Learn & Build Microservices"], Text: "Build 2 small backend microservice projects"},
		{GoalID: goalIDs["Learn & Build Microservices"], Text: "Deploy a microservice project to the cloud"},

		// DevOps
		{GoalID: goalIDs["Master DevOps Skills"], Text: "Learn Docker & containerize a project"},
		{GoalID: goalIDs["Master DevOps Skills"], Text: "Set up CI/CD pipeline for a real project"},
		{GoalID: goalIDs["Master DevOps Skills"], Text: "Deploy a project on AWS or Azure"},

		// System Design & DSA
		{GoalID: goalIDs["Learn System Design & DSA"], Text: "Study system design basics (load balancers, caching, DB sharding)"},
		{GoalID: goalIDs["Learn System Design & DSA"], Text: "Design 2 real backend systems on paper"},
		{GoalID: goalIDs["Learn System Design & DSA"], Text: "Solve 150+ DSA problems on LeetCode"},

		// Switch Job
		{GoalID: goalIDs["Learn New Skills & Switch Job"], Text: "Revise resume for backend + system design focus"},
		{GoalID: goalIDs["Learn New Skills & Switch Job"], Text: "Apply to 5-10 companies per day consistently"},
		{GoalID: goalIDs["Learn New Skills & Switch Job"], Text: "Clear interviews and land an offer by end of Q3"},

		// Management
		{GoalID: goalIDs["Learn Management Skills"], Text: "Read 2 management/leadership books"},
		{GoalID: goalIDs["Learn Management Skills"], Text: "Mentor 1-2 juniors or guide peers at work"},
		{GoalID: goalIDs["Learn Management Skills"], Text: "Decide next career direction by year end"},

		// Confidence & Communication
		{GoalID: goalIDs["Build Confidence & Communication"], Text: "Practice clear writing daily for 30 days"},
		{GoalID: goalIDs["Build Confidence & Communication"], Text: "Improve grammar through structured learning"},
		{GoalID: goalIDs["Build Confidence & Communication"], Text: "Deliver 3 presentations or demos at work"},

		// Health
		{GoalID: goalIDs["Exercise & Health Consistency"], Text: "Exercise 4-5 days/week consistently for 6 months"},
		{GoalID: goalIDs["Exercise & Health Consistency"], Text: "Maintain clean, healthy diet daily"},
		{GoalID: goalIDs["Exercise & Health Consistency"], Text: "Run 6 km continuously by December 2026"},

		// Finance
		{GoalID: goalIDs["Invest More & Wisely"], Text: "Learn basics of stock market and mutual funds"},
		{GoalID: goalIDs["Invest More & Wisely"], Text: "Track expenses monthly using a spreadsheet or app"},
		{GoalID: goalIDs["Invest More & Wisely"], Text: "Start SIP or systematic investment plan"},
	}

	for i := range keyResults {
		database.DB.Create(&keyResults[i])
	}
	fmt.Printf("  🔑 Created %d key results\n", len(keyResults))

	// ─────────────────────────────────────────────────────────────────────
	// 3. QUARTERLY OBJECTIVES
	// ─────────────────────────────────────────────────────────────────────

	// Helper to create a *uint pointer
	ptr := func(id uint) *uint { return &id }

	quarterlyObjectives := []models.QuarterlyObjective{
		// ── Q3 2026 (Jul–Sep) — Switch job, Backend mastery, Health start ──
		{UserID: uid, GoalID: ptr(goalIDs["Learn New Skills & Switch Job"]), Year: 2026, Quarter: 3,
			Title:   "Switch Job — Land a New Role",
			Outcome: "Clear interviews at 2+ companies and accept an offer by September end",
			Status:  "not_started"},
		{UserID: uid, GoalID: ptr(goalIDs["Learn & Build Microservices"]), Year: 2026, Quarter: 3,
			Title:   "Core Backend & System Design Depth",
			Outcome: "Complete Spring Boot course, study system design basics, build 2 small projects",
			Status:  "not_started"},
		{UserID: uid, GoalID: ptr(goalIDs["Learn System Design & DSA"]), Year: 2026, Quarter: 3,
			Title:   "DSA Practice + Interview Prep",
			Outcome: "Solve 100+ DSA problems, advance system design knowledge (scalability, HLD)",
			Status:  "not_started"},
		{UserID: uid, GoalID: ptr(goalIDs["Exercise & Health Consistency"]), Year: 2026, Quarter: 3,
			Title:   "Health Consistency — Build Foundation",
			Outcome: "Exercise 4-5 days/week consistently, run 2-3 km, clean diet",
			Status:  "not_started"},
		{UserID: uid, GoalID: ptr(goalIDs["Build Confidence & Communication"]), Year: 2026, Quarter: 3,
			Title:   "Communication & Writing Improvement",
			Outcome: "Improve team communication, practice clear writing daily, learn grammar",
			Status:  "not_started"},

		// ── Q4 2026 (Oct–Dec) — DevOps, Finance, Physical, Leadership ──
		{UserID: uid, GoalID: ptr(goalIDs["Master DevOps Skills"]), Year: 2026, Quarter: 4,
			Title:   "DevOps Fundamentals — Docker, CI/CD, Cloud",
			Outcome: "Learn Docker, set up CI/CD, deploy a real project on AWS/Azure",
			Status:  "not_started"},
		{UserID: uid, GoalID: ptr(goalIDs["Invest More & Wisely"]), Year: 2026, Quarter: 4,
			Title:   "Financial Discipline — Start Investing",
			Outcome: "Learn investing basics, track expenses monthly, start SIP",
			Status:  "not_started"},
		{UserID: uid, GoalID: ptr(goalIDs["Exercise & Health Consistency"]), Year: 2026, Quarter: 4,
			Title:   "Physical Limits — Run 6 km",
			Outcome: "Run 5-6 km continuously, maintain exercise consistency, improve sleep routine",
			Status:  "not_started"},
		{UserID: uid, GoalID: ptr(goalIDs["Learn Management Skills"]), Year: 2026, Quarter: 4,
			Title:   "Leadership & Career Positioning",
			Outcome: "Learn management basics, mentor juniors, decide next career direction",
			Status:  "not_started"},
		{UserID: uid, GoalID: ptr(goalIDs["Build Confidence & Communication"]), Year: 2026, Quarter: 4,
			Title:   "Personal Growth & Confidence",
			Outcome: "Polish communication, build confidence through action, reduce self-doubt",
			Status:  "not_started"},
	}

	for i := range quarterlyObjectives {
		database.DB.Create(&quarterlyObjectives[i])
	}
	fmt.Printf("  📋 Created %d quarterly objectives\n", len(quarterlyObjectives))

	// ─────────────────────────────────────────────────────────────────────
	// 4. MONTHLY PLANS
	// ─────────────────────────────────────────────────────────────────────
	monthlyPlans := []models.MonthlyPlan{
		// June 2026 — Ramp-up & catch-up month
		{UserID: uid, Year: 2026, Month: 6,
			Theme: "Ramp-Up: Resume + DSA Foundation + Health Kickoff",
			Goals: `["Revise resume (backend + system design focus)","Start DSA practice (easy/medium LeetCode)","Begin Spring Boot deep-dive","Exercise 4 days/week — start running 1-2 km","Practice clear writing 15 min/day"]`,
		},
		// July 2026
		{UserID: uid, Year: 2026, Month: 7,
			Theme: "Job Hunt Begins + System Design Basics",
			Goals: `["Apply to 5-10 companies/day","Study system design basics (caching, load balancers, DB)","Continue DSA — target 30 problems this month","Spring Boot project #1 — REST API service","Run 2 km consistently, exercise 4-5 days/week","Grammar learning — start structured course"]`,
		},
		// August 2026
		{UserID: uid, Year: 2026, Month: 8,
			Theme: "Interview Sprint + Backend Project Depth",
			Goals: `["Prepare for and attend interviews","Advance system design (scalability, HLD patterns)","DSA — target 40 problems, focus on trees/graphs","Build Spring Boot project #2 — microservice","Run 2-3 km, maintain exercise consistency","Improve team communication at work"]`,
		},
		// September 2026
		{UserID: uid, Year: 2026, Month: 9,
			Theme: "Close Job Search + Q3 Review",
			Goals: `["Final interview rounds — accept best offer","Design 2 real backend systems on paper","DSA revision — mock interview practice","Complete 100+ LeetCode problems total","Run 3 km consistently","Review Q3 progress and set Q4 goals"]`,
		},
		// October 2026
		{UserID: uid, Year: 2026, Month: 10,
			Theme: "DevOps Start + New Job Settling + Finance",
			Goals: `["Learn Docker fundamentals — containerize a project","Understand new codebase deeply (if new job)","Learn basics of investing / mutual funds","Start tracking expenses monthly","Run 4 km, exercise 4-5 days/week","Read management/leadership book #1"]`,
		},
		// November 2026
		{UserID: uid, Year: 2026, Month: 11,
			Theme: "CI/CD + Cloud + Physical Push",
			Goals: `["Set up CI/CD pipeline for a project","Learn AWS/Azure basics — deploy something real","Start SIP or investment plan","Run 5 km consistently","Mentor 1-2 juniors / guide peers","Deliver a presentation or demo at work"]`,
		},
		// December 2026
		{UserID: uid, Year: 2026, Month: 12,
			Theme: "Consolidation, Reflection & 2027 Planning",
			Goals: `["Deploy real project on cloud (AWS/Azure)","Run 6 km continuously — hit year-end target","Review full year — celebrate wins","Decide next career direction","Improve sleep routine","Set 2027 roadmap and goals"]`,
		},
	}

	for i := range monthlyPlans {
		database.DB.Create(&monthlyPlans[i])
	}
	fmt.Printf("  📅 Created %d monthly plans\n", len(monthlyPlans))

	// ─────────────────────────────────────────────────────────────────────
	// 5. WEEKLY PLANS (seed 4 weeks: June W1-W4)
	// ─────────────────────────────────────────────────────────────────────
	weeklyPlans := []models.WeeklyPlan{
		// June W1 (Week 23: Jun 1–7)
		{UserID: uid, Year: 2026, WeekNumber: 23,
			Theme: "Resume Overhaul + DSA Day 1",
			Notes: "Focus: Revise resume with backend + system design focus. Solve 5 easy LeetCode problems. Start Spring Boot tutorial. Run 1 km 3 times this week."},
		// June W2 (Week 24: Jun 8–14)
		{UserID: uid, Year: 2026, WeekNumber: 24,
			Theme: "DSA Momentum + Spring Boot Basics",
			Notes: "Target 7 DSA problems (arrays, strings). Complete Spring Boot REST API tutorial chapter. Exercise 4 days. Practice writing 15 min/day."},
		// June W3 (Week 25: Jun 15–21)
		{UserID: uid, Year: 2026, WeekNumber: 25,
			Theme: "System Design Intro + Job Applications Begin",
			Notes: "Read system design primer (caching, load balancers). Start applying to 3-5 companies. 7 DSA problems (linked lists, stacks). Run 1.5 km 3 times."},
		// June W4 (Week 26: Jun 22–28)
		{UserID: uid, Year: 2026, WeekNumber: 26,
			Theme: "Month-End Review + Application Ramp",
			Notes: "Apply to 5 companies/day. Finish Spring Boot basics. 7 DSA problems (sorting, recursion). Run 2 km. Review June progress."},
	}

	for i := range weeklyPlans {
		database.DB.Create(&weeklyPlans[i])
	}
	fmt.Printf("  📆 Created %d weekly plans\n", len(weeklyPlans))

	// ─────────────────────────────────────────────────────────────────────
	// 6. TASKS (for this week and next week)
	// ─────────────────────────────────────────────────────────────────────
	now := time.Now()
	d := func(daysFromNow int) *time.Time {
		t := now.AddDate(0, 0, daysFromNow)
		return &t
	}

	tasks := []models.Task{
		// ── Today / Tomorrow — Immediate ──
		{UserID: uid, Title: "Update resume — add backend projects & system design skills", Priority: "high", DueDate: d(0), Tags: "career,resume", Position: 1},
		{UserID: uid, Title: "Solve 2 LeetCode Easy problems (Arrays)", Priority: "high", DueDate: d(0), Tags: "dsa,learning", Position: 2},
		{UserID: uid, Title: "Go for a 1 km run or 30-min walk", Priority: "medium", DueDate: d(0), Tags: "health,running", Position: 3},
		{UserID: uid, Title: "Practice clear writing — journal for 15 minutes", Priority: "medium", DueDate: d(0), Tags: "communication,growth", Position: 4},

		// ── Tomorrow ──
		{UserID: uid, Title: "Solve 2 LeetCode problems (Strings)", Priority: "high", DueDate: d(1), Tags: "dsa,learning", Position: 1},
		{UserID: uid, Title: "Start Spring Boot tutorial — project setup & first endpoint", Priority: "high", DueDate: d(1), Tags: "learning,backend", Position: 2},
		{UserID: uid, Title: "Exercise — bodyweight workout (30 min)", Priority: "medium", DueDate: d(1), Tags: "health", Position: 3},

		// ── Day 2 ──
		{UserID: uid, Title: "Research 10 target companies for job applications", Priority: "high", DueDate: d(2), Tags: "career,job-search", Position: 1},
		{UserID: uid, Title: "Solve 1 LeetCode Medium (Two Pointers)", Priority: "high", DueDate: d(2), Tags: "dsa", Position: 2},
		{UserID: uid, Title: "Spring Boot — CRUD endpoints + JPA setup", Priority: "medium", DueDate: d(2), Tags: "learning,backend", Position: 3},
		{UserID: uid, Title: "Run 1 km", Priority: "medium", DueDate: d(2), Tags: "health,running", Position: 4},

		// ── Day 3 ──
		{UserID: uid, Title: "Apply to 5 companies on LinkedIn / Naukri", Priority: "high", DueDate: d(3), Tags: "career,job-search", Position: 1},
		{UserID: uid, Title: "Solve 2 LeetCode problems (HashMaps)", Priority: "high", DueDate: d(3), Tags: "dsa", Position: 2},
		{UserID: uid, Title: "Read system design primer — Chapter 1 (Scalability)", Priority: "medium", DueDate: d(3), Tags: "learning,system-design", Position: 3},

		// ── Day 4 ──
		{UserID: uid, Title: "Apply to 5 more companies", Priority: "high", DueDate: d(4), Tags: "career,job-search", Position: 1},
		{UserID: uid, Title: "Solve 2 LeetCode problems (Sliding Window)", Priority: "high", DueDate: d(4), Tags: "dsa", Position: 2},
		{UserID: uid, Title: "Exercise — gym or bodyweight workout", Priority: "medium", DueDate: d(4), Tags: "health", Position: 3},
		{UserID: uid, Title: "Practice writing — summarize what you learned today", Priority: "low", DueDate: d(4), Tags: "communication", Position: 4},

		// ── Day 5 ──
		{UserID: uid, Title: "Solve 2 LeetCode problems (Stacks/Queues)", Priority: "high", DueDate: d(5), Tags: "dsa", Position: 1},
		{UserID: uid, Title: "Spring Boot — add authentication (JWT)", Priority: "medium", DueDate: d(5), Tags: "learning,backend", Position: 2},
		{UserID: uid, Title: "Run 1.5 km", Priority: "medium", DueDate: d(5), Tags: "health,running", Position: 3},

		// ── Day 6 ──
		{UserID: uid, Title: "Weekly review — tally DSA problems, review applications sent", Priority: "medium", DueDate: d(6), Tags: "review", Position: 1},
		{UserID: uid, Title: "Read system design — load balancers & caching", Priority: "medium", DueDate: d(6), Tags: "learning,system-design", Position: 2},
		{UserID: uid, Title: "Exercise — stretching + light jog", Priority: "low", DueDate: d(6), Tags: "health", Position: 3},

		// ── Next week highlights ──
		{UserID: uid, Title: "Apply to 5-10 companies/day (build pipeline)", Priority: "high", DueDate: d(7), Tags: "career,job-search", Position: 1},
		{UserID: uid, Title: "Start grammar course (online / YouTube)", Priority: "medium", DueDate: d(8), Tags: "communication,learning", Position: 1},
		{UserID: uid, Title: "System design — database sharding & replication", Priority: "medium", DueDate: d(9), Tags: "learning,system-design", Position: 1},
		{UserID: uid, Title: "Spring Boot — complete project #1 (REST API service)", Priority: "high", DueDate: d(10), Tags: "learning,backend", Position: 1},
		{UserID: uid, Title: "Run 2 km — first 2 km attempt", Priority: "high", DueDate: d(11), Tags: "health,running", Position: 1},
		{UserID: uid, Title: "Learn basics of investing — watch 3 videos on mutual funds", Priority: "low", DueDate: d(12), Tags: "finance,learning", Position: 1},
	}

	for i := range tasks {
		database.DB.Create(&tasks[i])
	}
	fmt.Printf("  ✅ Created %d tasks\n", len(tasks))

	// ─────────────────────────────────────────────────────────────────────
	// 7. HABITS
	// ─────────────────────────────────────────────────────────────────────
	habits := []models.Habit{
		{UserID: uid, Title: "Solve DSA Problem", Description: "Solve at least 1 LeetCode problem daily", Frequency: "daily", Category: "Learning", RoutineType: "morning", Position: 1, StreakShieldActive: true, StreakShieldsRemaining: 1},
		{UserID: uid, Title: "Exercise / Workout", Description: "30-min workout or run (4-5 days/week)", Frequency: "daily", Category: "Health", RoutineType: "morning", Position: 2, StreakShieldActive: true, StreakShieldsRemaining: 1},
		{UserID: uid, Title: "Practice Clear Writing", Description: "Write for 15 minutes — journal, summary, or article", Frequency: "daily", Category: "Growth", RoutineType: "night", Position: 3},
		{UserID: uid, Title: "Read / Learn for 30 min", Description: "System design, backend concepts, or management books", Frequency: "daily", Category: "Learning", RoutineType: "night", Position: 4},
		{UserID: uid, Title: "Apply to Jobs", Description: "Apply to 5-10 companies per day", Frequency: "daily", Category: "Career", RoutineType: "morning", Position: 5},
		{UserID: uid, Title: "Eat Clean & Healthy", Description: "No junk food, balanced meals", Frequency: "daily", Category: "Health", RoutineType: "none", Position: 6},
		{UserID: uid, Title: "Run / Jog", Description: "Progressive running — start 1 km, target 6 km by Dec", Frequency: "weekly", Category: "Health", RoutineType: "morning", Position: 7, StreakShieldActive: true, StreakShieldsRemaining: 1},
		{UserID: uid, Title: "Track Expenses", Description: "Log daily expenses in spreadsheet or app", Frequency: "daily", Category: "Finance", RoutineType: "night", Position: 8},
	}

	for i := range habits {
		database.DB.Create(&habits[i])
	}
	fmt.Printf("  🔁 Created %d habits\n", len(habits))

	// ─────────────────────────────────────────────────────────────────────
	// 8. TIME BLOCKS (seed today's schedule)
	// ─────────────────────────────────────────────────────────────────────
	today := now.Format("2006-01-02")
	tomorrow := now.AddDate(0, 0, 1).Format("2006-01-02")

	timeBlocks := []models.TimeBlock{
		// Today
		{UserID: uid, Date: today, StartTime: "06:00", EndTime: "06:30", Title: "Morning Run / Walk (1 km)", BlockType: "personal"},
		{UserID: uid, Date: today, StartTime: "07:00", EndTime: "08:00", Title: "DSA Practice — 2 LeetCode Problems", BlockType: "deep_work"},
		{UserID: uid, Date: today, StartTime: "08:30", EndTime: "09:30", Title: "Resume Revision — Backend + System Design", BlockType: "deep_work"},
		{UserID: uid, Date: today, StartTime: "10:00", EndTime: "12:00", Title: "Spring Boot Tutorial — Setup & First Endpoint", BlockType: "deep_work"},
		{UserID: uid, Date: today, StartTime: "14:00", EndTime: "15:30", Title: "Job Applications — Research Companies", BlockType: "admin"},
		{UserID: uid, Date: today, StartTime: "16:00", EndTime: "16:30", Title: "System Design Reading (30 min)", BlockType: "deep_work"},
		{UserID: uid, Date: today, StartTime: "21:00", EndTime: "21:15", Title: "Clear Writing Practice — Journal", BlockType: "personal"},
		{UserID: uid, Date: today, StartTime: "21:15", EndTime: "21:30", Title: "Expense Tracking & Day Review", BlockType: "personal"},

		// Tomorrow
		{UserID: uid, Date: tomorrow, StartTime: "06:00", EndTime: "06:45", Title: "Bodyweight Workout (30 min)", BlockType: "personal"},
		{UserID: uid, Date: tomorrow, StartTime: "07:00", EndTime: "08:00", Title: "DSA Practice — 2 LeetCode (Strings)", BlockType: "deep_work"},
		{UserID: uid, Date: tomorrow, StartTime: "09:00", EndTime: "11:00", Title: "Spring Boot — CRUD Endpoints + JPA", BlockType: "deep_work"},
		{UserID: uid, Date: tomorrow, StartTime: "14:00", EndTime: "15:30", Title: "Apply to 5 Companies", BlockType: "admin"},
		{UserID: uid, Date: tomorrow, StartTime: "16:00", EndTime: "17:00", Title: "System Design — Caching & Load Balancers", BlockType: "deep_work"},
		{UserID: uid, Date: tomorrow, StartTime: "21:00", EndTime: "21:15", Title: "Writing Practice", BlockType: "personal"},
	}

	for i := range timeBlocks {
		database.DB.Create(&timeBlocks[i])
	}
	fmt.Printf("  ⏱️  Created %d time blocks\n", len(timeBlocks))

	// ─────────────────────────────────────────────────────────────────────
	// 9. MILESTONES for key goals
	// ─────────────────────────────────────────────────────────────────────
	milestones := []models.Milestone{
		// Switch Job milestones
		{GoalID: goalIDs["Learn New Skills & Switch Job"], Quarter: "Q3", TargetDate: parseDate("June 7"), Title: "Resume finalized", Status: "upcoming"},
		{GoalID: goalIDs["Learn New Skills & Switch Job"], Quarter: "Q3", TargetDate: parseDate("July 15"), Title: "Applied to 100+ companies", Status: "upcoming"},
		{GoalID: goalIDs["Learn New Skills & Switch Job"], Quarter: "Q3", TargetDate: parseDate("August 31"), Title: "Cleared 2+ interview pipelines", Status: "upcoming"},
		{GoalID: goalIDs["Learn New Skills & Switch Job"], Quarter: "Q3", TargetDate: parseDate("September 30"), Title: "Accepted offer at new company", Status: "upcoming"},

		// System Design & DSA
		{GoalID: goalIDs["Learn System Design & DSA"], Quarter: "Q3", TargetDate: parseDate("July 31"), Title: "50+ LeetCode problems solved", Status: "upcoming"},
		{GoalID: goalIDs["Learn System Design & DSA"], Quarter: "Q3", TargetDate: parseDate("August 31"), Title: "100+ LeetCode problems solved", Status: "upcoming"},
		{GoalID: goalIDs["Learn System Design & DSA"], Quarter: "Q4", TargetDate: parseDate("December 31"), Title: "150+ problems + 2 system designs completed", Status: "upcoming"},

		// Health
		{GoalID: goalIDs["Exercise & Health Consistency"], Quarter: "Q3", TargetDate: parseDate("July 31"), Title: "Running 2 km consistently", Status: "upcoming"},
		{GoalID: goalIDs["Exercise & Health Consistency"], Quarter: "Q3", TargetDate: parseDate("September 30"), Title: "Running 3 km consistently", Status: "upcoming"},
		{GoalID: goalIDs["Exercise & Health Consistency"], Quarter: "Q4", TargetDate: parseDate("November 30"), Title: "Running 5 km continuously", Status: "upcoming"},
		{GoalID: goalIDs["Exercise & Health Consistency"], Quarter: "Q4", TargetDate: parseDate("December 31"), Title: "Running 6 km — year-end target achieved!", Status: "upcoming"},

		// DevOps
		{GoalID: goalIDs["Master DevOps Skills"], Quarter: "Q4", TargetDate: parseDate("October 31"), Title: "Docker fundamentals learned", Status: "upcoming"},
		{GoalID: goalIDs["Master DevOps Skills"], Quarter: "Q4", TargetDate: parseDate("November 30"), Title: "CI/CD pipeline set up for a project", Status: "upcoming"},
		{GoalID: goalIDs["Master DevOps Skills"], Quarter: "Q4", TargetDate: parseDate("December 31"), Title: "Project deployed on cloud (AWS/Azure)", Status: "upcoming"},

		// Finance
		{GoalID: goalIDs["Invest More & Wisely"], Quarter: "Q4", TargetDate: parseDate("October 31"), Title: "Investing basics learned", Status: "upcoming"},
		{GoalID: goalIDs["Invest More & Wisely"], Quarter: "Q4", TargetDate: parseDate("November 30"), Title: "SIP/investment plan started", Status: "upcoming"},
	}

	for i := range milestones {
		database.DB.Create(&milestones[i])
	}
	fmt.Printf("  🏁 Created %d milestones\n", len(milestones))

	// ─────────────────────────────────────────────────────────────────────
	// 10. FOCUS AREAS (Life Balance Radar)
	// ─────────────────────────────────────────────────────────────────────
	focusAreas := []models.FocusArea{
		{UserID: uid, Name: "Learning & Skills", Icon: "school", CurrentScore: 4, TargetScore: 9},
		{UserID: uid, Name: "Career & Impact", Icon: "work", CurrentScore: 5, TargetScore: 9},
		{UserID: uid, Name: "Health & Energy", Icon: "fitness_center", CurrentScore: 3, TargetScore: 8},
		{UserID: uid, Name: "Communication", Icon: "forum", CurrentScore: 4, TargetScore: 8},
		{UserID: uid, Name: "Finance & Wealth", Icon: "savings", CurrentScore: 3, TargetScore: 7},
		{UserID: uid, Name: "Confidence & Growth", Icon: "psychology", CurrentScore: 4, TargetScore: 9},
	}

	for i := range focusAreas {
		database.DB.Create(&focusAreas[i])
	}
	fmt.Printf("  🎯 Created %d focus areas\n", len(focusAreas))

	// ─────────────────────────────────────────────────────────────────────
	fmt.Println("\n🎉 All data seeded successfully for skshubham1437@gmail.com!")
	fmt.Println("   Summary:")
	fmt.Printf("   • %d Yearly Goals (with %d Key Results & %d Milestones)\n", len(yearlyGoals), len(keyResults), len(milestones))
	fmt.Printf("   • %d Quarterly Objectives\n", len(quarterlyObjectives))
	fmt.Printf("   • %d Monthly Plans (Jun–Dec 2026)\n", len(monthlyPlans))
	fmt.Printf("   • %d Weekly Plans (June weeks)\n", len(weeklyPlans))
	fmt.Printf("   • %d Tasks (today + next 2 weeks)\n", len(tasks))
	fmt.Printf("   • %d Habits\n", len(habits))
	fmt.Printf("   • %d Time Blocks (today + tomorrow)\n", len(timeBlocks))
	fmt.Printf("   • %d Focus Areas\n", len(focusAreas))
	os.Exit(0)
}
