package services

import (
	"context"
	"encoding/json"
	"fmt"
	"os"

	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/option"
	"evolv-server/models"
)

var aiClient *genai.Client

// InitAI initializes the Gemini client
func InitAI() error {
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		fmt.Println("Warning: GEMINI_API_KEY is not set. AI features will be disabled.")
		return nil
	}

	client, err := genai.NewClient(context.Background(), option.WithAPIKey(apiKey))
	if err != nil {
		return fmt.Errorf("failed to create Gemini client: %v", err)
	}
	aiClient = client
	fmt.Println("Gemini AI Client Initialized")
	return nil
}

// GenerateChatResponse sends a prompt to the model and returns the response
func GenerateChatResponse(ctx context.Context, prompt string) (string, error) {
	if aiClient == nil {
		return "", fmt.Errorf("AI client not initialized")
	}

	model := aiClient.GenerativeModel("gemini-2.5-flash")
	model.SetTemperature(0.7)

	resp, err := model.GenerateContent(ctx, genai.Text(prompt))
	if err != nil {
		return "", err
	}

	if len(resp.Candidates) > 0 && len(resp.Candidates[0].Content.Parts) > 0 {
		if txt, ok := resp.Candidates[0].Content.Parts[0].(genai.Text); ok {
			return string(txt), nil
		}
	}
	return "", fmt.Errorf("no valid response from model")
}

// Subtask represents a broken-down task step
type Subtask struct {
	Title       string `json:"title"`
	Description string `json:"description"`
}

// BreakDownGoal asks the model to break down a larger goal into smaller subtasks, returning structured JSON
func BreakDownGoal(ctx context.Context, goalTitle string, goalDescription string) ([]Subtask, error) {
	if aiClient == nil {
		return nil, fmt.Errorf("AI client not initialized")
	}

	model := aiClient.GenerativeModel("gemini-2.5-flash")
	model.SetTemperature(0.2)
	model.ResponseMIMEType = "application/json"
	// Specify the JSON schema for the output
	model.ResponseSchema = &genai.Schema{
		Type: genai.TypeArray,
		Items: &genai.Schema{
			Type: genai.TypeObject,
			Properties: map[string]*genai.Schema{
				"title":       {Type: genai.TypeString},
				"description": {Type: genai.TypeString},
			},
			Required: []string{"title", "description"},
		},
	}

	prompt := fmt.Sprintf(`Break down the following goal into 3 to 5 actionable subtasks.
Goal Title: %s
Goal Description: %s`, goalTitle, goalDescription)

	resp, err := model.GenerateContent(ctx, genai.Text(prompt))
	if err != nil {
		return nil, err
	}

	if len(resp.Candidates) > 0 && len(resp.Candidates[0].Content.Parts) > 0 {
		if txt, ok := resp.Candidates[0].Content.Parts[0].(genai.Text); ok {
			var subtasks []Subtask
			if err := json.Unmarshal([]byte(txt), &subtasks); err != nil {
				return nil, fmt.Errorf("failed to parse JSON response: %v", err)
			}
			return subtasks, nil
		}
	}

	return nil, fmt.Errorf("no valid response from model")
}

// GenerateMorningBrief creates a highly actionable daily blueprint summary
func GenerateMorningBrief(ctx context.Context, userName string, tasks []models.Task, habits []models.Habit) (string, error) {
	if aiClient == nil {
		return "", fmt.Errorf("AI client not initialized")
	}

	model := aiClient.GenerativeModel("gemini-2.5-flash")
	model.SetTemperature(0.6)

	tasksStr := ""
	for _, t := range tasks {
		tasksStr += fmt.Sprintf("- [Priority: %s] %s\n", t.Priority, t.Title)
	}
	if tasksStr == "" {
		tasksStr = "No pending tasks listed."
	}

	habitsStr := ""
	for _, h := range habits {
		habitsStr += fmt.Sprintf("- [Category: %s] %s (Streak: %d)\n", h.Category, h.Title, h.Streak)
	}
	if habitsStr == "" {
		habitsStr = "No habits scheduled."
	}

	prompt := fmt.Sprintf(`You are Evolv AI Daily Coach, a premier performance and routine psychologist. Generate a short, highly motivating morning briefing for %s.
Review their daily alignment list:
Tasks:
%s

Habits:
%s

Generate a briefing (around 80-120 words) in clean Markdown. Start with a direct, custom daily theme (e.g. "Focus Area: High-Impact Execution"). Then list 2-3 specific, high-priority actions or mindset focus items for today. Keep the tone sharp, inspiring, and professional. Do not use conversational preambles like "Good morning!" or "Here is your briefing". Go straight to the markdown content.`, userName, tasksStr, habitsStr)

	resp, err := model.GenerateContent(ctx, genai.Text(prompt))
	if err != nil {
		return "", err
	}

	if len(resp.Candidates) > 0 && len(resp.Candidates[0].Content.Parts) > 0 {
		if txt, ok := resp.Candidates[0].Content.Parts[0].(genai.Text); ok {
			return string(txt), nil
		}
	}
	return "", fmt.Errorf("no response from AI")
}

// AIInsight represents a structured productivity tip
type AIInsight struct {
	Title          string `json:"title"`
	Category       string `json:"category"`
	Recommendation string `json:"recommendation"`
}

// GenerateProductivityInsights parses goals, tasks, and habits to return 2 highly targeted tips
func GenerateProductivityInsights(ctx context.Context, goals []models.Goal, tasks []models.Task, habits []models.Habit) ([]AIInsight, error) {
	if aiClient == nil {
		return nil, fmt.Errorf("AI client not initialized")
	}

	model := aiClient.GenerativeModel("gemini-2.5-flash")
	model.SetTemperature(0.4)
	model.ResponseMIMEType = "application/json"
	model.ResponseSchema = &genai.Schema{
		Type: genai.TypeArray,
		Items: &genai.Schema{
			Type: genai.TypeObject,
			Properties: map[string]*genai.Schema{
				"title":          {Type: genai.TypeString},
				"category":       {Type: genai.TypeString},
				"recommendation": {Type: genai.TypeString},
			},
			Required: []string{"title", "category", "recommendation"},
		},
	}

	goalsStr := ""
	for _, g := range goals {
		goalsStr += fmt.Sprintf("- Goal: %s (Progress: %d%%)\n", g.Title, g.Progress)
	}
	if goalsStr == "" {
		goalsStr = "No active goals set."
	}

	tasksStr := ""
	for _, t := range tasks {
		tasksStr += fmt.Sprintf("- Task: %s (Priority: %s)\n", t.Title, t.Priority)
	}
	if tasksStr == "" {
		tasksStr = "No active tasks."
	}

	habitsStr := ""
	for _, h := range habits {
		habitsStr += fmt.Sprintf("- Habit: %s (Category: %s, Streak: %d)\n", h.Title, h.Category, h.Streak)
	}
	if habitsStr == "" {
		habitsStr = "No habits."
	}

	prompt := fmt.Sprintf(`You are Evolv AI Productivity Coach. Analyze this user's current goals and daily consistency blueprint:
Goals:
%s

Tasks:
%s

Habits:
%s

Generate exactly 2 or 3 high-impact, context-aware productivity recommendations.
For example, notice if a habit supports a goal, suggest task prioritization, or highlight a potential bottleneck.
Keep the recommendations concise and extremely actionable.`, goalsStr, tasksStr, habitsStr)

	resp, err := model.GenerateContent(ctx, genai.Text(prompt))
	if err != nil {
		return nil, err
	}

	if len(resp.Candidates) > 0 && len(resp.Candidates[0].Content.Parts) > 0 {
		if txt, ok := resp.Candidates[0].Content.Parts[0].(genai.Text); ok {
			var insights []AIInsight
			if err := json.Unmarshal([]byte(txt), &insights); err != nil {
				return nil, fmt.Errorf("failed to parse JSON insights: %v", err)
			}
			return insights, nil
		}
	}

	return nil, fmt.Errorf("no response from AI")
}

// JournalAnalysis represents the structured output of journal sentiment & theme extraction
type JournalAnalysis struct {
	Sentiment string   `json:"sentiment"`
	Themes    []string `json:"themes"`
}

// AnalyzeJournalEntry calls Gemini to analyze a journal entry and return structured sentiment and themes
func AnalyzeJournalEntry(ctx context.Context, content string, gratitude string, wins string, lessons string) (string, []string, error) {
	if aiClient == nil {
		return "", nil, fmt.Errorf("AI client not initialized")
	}

	model := aiClient.GenerativeModel("gemini-2.5-flash")
	model.SetTemperature(0.3)
	model.ResponseMIMEType = "application/json"
	model.ResponseSchema = &genai.Schema{
		Type: genai.TypeObject,
		Properties: map[string]*genai.Schema{
			"sentiment": {Type: genai.TypeString},
			"themes": {
				Type: genai.TypeArray,
				Items: &genai.Schema{Type: genai.TypeString},
			},
		},
		Required: []string{"sentiment", "themes"},
	}

	prompt := fmt.Sprintf(`Analyze the following daily journal entry details.
Content: %s
Gratitude: %s
Wins: %s
Lessons: %s

Extract:
1. Sentiment: A concise, qualitative summary of the user's emotional state (e.g. "Stressed but Resilient", "Grateful & Energetic", "Exhausted & Overwhelmed", "Calm & Reflective"). Keep it under 4 words.
2. Themes: An array of 1 to 3 categories representing the topics mentioned (e.g., "Work", "Health", "Social", "Finance", "Learning", "Mindset", "Creativity").`, content, gratitude, wins, lessons)

	resp, err := model.GenerateContent(ctx, genai.Text(prompt))
	if err != nil {
		return "", nil, err
	}

	if len(resp.Candidates) > 0 && len(resp.Candidates[0].Content.Parts) > 0 {
		if txt, ok := resp.Candidates[0].Content.Parts[0].(genai.Text); ok {
			var analysis JournalAnalysis
			if err := json.Unmarshal([]byte(txt), &analysis); err != nil {
				return "", nil, fmt.Errorf("failed to parse JSON response: %v", err)
			}
			return analysis.Sentiment, analysis.Themes, nil
		}
	}

	return "", nil, fmt.Errorf("no response from AI")
}

// BurnoutAssessment represents the structured output of burnout calculation
type BurnoutAssessment struct {
	Risk    string `json:"risk"` // low, medium, high
	Details string `json:"details"`
}

// CalculateBurnoutRisk computes the burnout level using Gemini based on mood history, energy levels, and completion rates
func CalculateBurnoutRisk(ctx context.Context, moodHistory []int, energyHistory []int, completionRate float64) (string, string, error) {
	if aiClient == nil {
		return "low", "AI client not initialized. Staying at default calibration.", nil
	}

	model := aiClient.GenerativeModel("gemini-2.5-flash")
	model.SetTemperature(0.4)
	model.ResponseMIMEType = "application/json"
	model.ResponseSchema = &genai.Schema{
		Type: genai.TypeObject,
		Properties: map[string]*genai.Schema{
			"risk":    {Type: genai.TypeString}, // low, medium, high
			"details": {Type: genai.TypeString},
		},
		Required: []string{"risk", "details"},
	}

	prompt := fmt.Sprintf(`You are Evolv AI Performance and Wellbeing Coach.
Analyze the user's past 7 days logs to evaluate burnout risk:
Mood History (1=stressed, 3=calm, 5=focused): %v
Energy Levels (1-100%%): %v
Task/Habit Completion Rate: %.1f%%

Return:
1. Risk: Choose exactly one of "low", "medium", or "high".
2. Details: A short, professional feedback summary (around 30-50 words) with actionable advice tailored to their state. Do not use generic placeholders.`, moodHistory, energyHistory, completionRate)

	resp, err := model.GenerateContent(ctx, genai.Text(prompt))
	if err != nil {
		return "low", "Failed to compute assessment.", err
	}

	if len(resp.Candidates) > 0 && len(resp.Candidates[0].Content.Parts) > 0 {
		if txt, ok := resp.Candidates[0].Content.Parts[0].(genai.Text); ok {
			var assessment BurnoutAssessment
			if err := json.Unmarshal([]byte(txt), &assessment); err != nil {
				return "low", "Failed to parse assessment.", err
			}
			return assessment.Risk, assessment.Details, nil
		}
	}

	return "low", "No assessment generated.", fmt.Errorf("no response from AI")
}

// GenerateWeeklyReview evaluates the week's scorecard, tasks, habits, and journals to create an AI weekly retrospective
func GenerateWeeklyReview(ctx context.Context, plan models.WeeklyPlan, score int, tasks []models.Task, habits []models.Habit, journals []models.JournalEntry) (string, error) {
	if aiClient == nil {
		return "", fmt.Errorf("AI client not initialized")
	}

	model := aiClient.GenerativeModel("gemini-2.5-flash")
	model.SetTemperature(0.6)

	tasksStr := ""
	for _, t := range tasks {
		status := "Pending"
		if t.IsCompleted {
			status = "Completed"
		}
		tasksStr += fmt.Sprintf("- [%s] %s (Priority: %s)\n", status, t.Title, t.Priority)
	}
	if tasksStr == "" {
		tasksStr = "No tasks listed for this week."
	}

	habitsStr := ""
	for _, h := range habits {
		habitsStr += fmt.Sprintf("- [Category: %s] %s (Streak: %d)\n", h.Category, h.Title, h.Streak)
	}
	if habitsStr == "" {
		habitsStr = "No habits scheduled."
	}

	journalsStr := ""
	for _, j := range journals {
		journalsStr += fmt.Sprintf("- Date: %s | Mood Score: %d/5 | Energy: %d%% | Sentiment: %s | Gratitude: %s | Wins: %s | Lessons: %s\n",
			j.Date, j.Mood, j.Energy, j.Sentiment, j.Gratitude, j.Wins, j.Lessons)
	}
	if journalsStr == "" {
		journalsStr = "No journal entries written this week."
	}

	prompt := fmt.Sprintf(`You are Evolv AI Executive Performance Coach. Analyze the user's weekly execution dataset to compile a comprehensive, highly insightful Weekly Retrospective Review in clean Markdown format.

WEEK PARAMETERS:
- Year: %d
- Week Number: %d
- Focus Intent/Theme: "%s"
- Weekly Scorecard (Habit Consistency): %d/100
- Additional Notes: "%s"

WEEK'S TASKS:
%s

WEEK'S HABITS:
%s

WEEK'S DAILY REFLECTIONS & JOURNALS:
%s

Generate the weekly review in styled Markdown using the following structure:
### 1. Executive Performance Summary
Write a professional summary (around 60-80 words) evaluating the user's execution rate, habit score, and overall alignment with their weekly focus theme. Highlight whether they were proactive or reactive.

### 2. Core Wins & Breakthroughs
Synthesize key achievements from the daily wins, successful tasks, and journal entries. Highlight major focus moments.

### 3. Key Lessons & Friction Points
Analyze the friction points, lessons learned, and stress levels from the daily reflections. What held them back?

### 4. Recalibration Strategy for Next Week
Provide 2-3 specific, actionable adjustments for the upcoming week to improve consistency, energy management, and goal progression.

Keep the tone sharp, executive-level, encouraging yet objective, and professional. Go straight to the markdown headings. Do not output introduction or conversational preambles.`,
		plan.Year, plan.WeekNumber, plan.Theme, score, plan.Notes, tasksStr, habitsStr, journalsStr)

	resp, err := model.GenerateContent(ctx, genai.Text(prompt))
	if err != nil {
		return "", err
	}

	if len(resp.Candidates) > 0 && len(resp.Candidates[0].Content.Parts) > 0 {
		if txt, ok := resp.Candidates[0].Content.Parts[0].(genai.Text); ok {
			return string(txt), nil
		}
	}
	return "", fmt.Errorf("no response from AI")
}

// GenerateMonthlyReview evaluates the month's targeted goals, weekly scores, and journals to create an AI monthly retrospective
func GenerateMonthlyReview(ctx context.Context, plan models.MonthlyPlan, goals []models.Goal, journals []models.JournalEntry) (string, error) {
	if aiClient == nil {
		return "", fmt.Errorf("AI client not initialized")
	}

	model := aiClient.GenerativeModel("gemini-2.5-flash")
	model.SetTemperature(0.6)

	goalsStr := ""
	for _, g := range goals {
		goalsStr += fmt.Sprintf("- Goal: %s | Description: %s | Priority: %s | Progress: %d%%\n", g.Title, g.Description, g.Priority, g.Progress)
	}
	if goalsStr == "" {
		goalsStr = "No active targeted goals listed."
	}

	journalsStr := ""
	for _, j := range journals {
		journalsStr += fmt.Sprintf("- Date: %s | Mood Score: %d/5 | Energy: %d%% | Sentiment: %s | Themes: %s | Wins: %s | Lessons: %s\n",
			j.Date, j.Mood, j.Energy, j.Sentiment, j.Themes, j.Wins, j.Lessons)
	}
	if journalsStr == "" {
		journalsStr = "No journal entries written this month."
	}

	prompt := fmt.Sprintf(`You are Evolv AI Strategic Behavioral Strategist. Analyze the user's monthly progress dataset to compile a structured, high-value Monthly Reset & Retrospective Review in clean Markdown format.

MONTH PARAMETERS:
- Year: %d
- Month Number: %d
- Month Focus Theme: "%s"
- Initial Life Balance Radar Score Snapshot: %s

TARGETED YEARLY GOALS THIS MONTH:
%s

DAILY JOURNAL LOGS & MINDSET DATA FOR THE MONTH:
%s

Generate the monthly reset review in styled Markdown using the following structure:
### 1. Strategic Goal Progression
Analyze their progress towards the targeted yearly goals. Are they moving at a healthy pace or stalling?

### 2. Cognitive Load & Energy Audit
Summarize the energy trends, stress levels (mood scores), and qualitative sentiment themes from their daily reflections. Identify specific energy drains or peaks.

### 3. Keystone Habit & Theme Alignment
Assess how well the user integrated their monthly theme into their daily/weekly routines, referencing journal themes and habits.

### 4. Recalibration Protocol
Suggest exactly 3 strategic actions or routine changes for the upcoming month to optimize wellbeing, balance their wheel of life, and unblock key objectives.

Keep the tone mature, analytical, insightful, and professional. Go straight to the markdown headings. Do not output conversational preambles.`,
		plan.Year, plan.Month, plan.Theme, plan.LifeScores, goalsStr, journalsStr)

	resp, err := model.GenerateContent(ctx, genai.Text(prompt))
	if err != nil {
		return "", err
	}

	if len(resp.Candidates) > 0 && len(resp.Candidates[0].Content.Parts) > 0 {
		if txt, ok := resp.Candidates[0].Content.Parts[0].(genai.Text); ok {
			return string(txt), nil
		}
	}
	return "", fmt.Errorf("no response from AI")
}


