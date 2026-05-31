# Domain Glossary

> This file defines the ubiquitous language for the Evolv project.
> All code, tests, and documentation should use these terms consistently.
> Updated as understanding deepens — never frozen.

## Core Concepts

### Vision Layer
**Definition**: The highest level of planning, defining long-term life identity, core values, and overall life trajectory.
**Also known as**: Life Vision

### Focus Area
**Definition**: A distinct category of a user's life (e.g., Health, Career, Wealth) used to balance goal setting.
**Also known as**: Life Area, Wheel of Life

### Yearly Goal
**Definition**: A major objective set for the year, typically broken down into actionable milestones.

### Quarterly Objective
**Definition**: A strategic priority for a 90-day period, bridging the gap between yearly goals and monthly execution.

### Monthly Reset
**Definition**: A reflection and planning process to define the month's theme, habits, and priorities.

### Monthly Life Score
**Definition**: A quantitative assessment across different life categories to measure overall balance and progress.

### Weekly Priority (MIT)
**Definition**: The Most Important Tasks (MITs) that must be accomplished within a week to consider it successful.

### Task
**Definition**: An actionable item with a clear outcome, capable of having dependencies, subtasks, and estimates.

### Deep Work Session
**Definition**: A scheduled block of time dedicated to high-concentration tasks without distractions.

### Habit
**Definition**: A recurring behavior the user wants to build or track, supporting identity and goals.
**Also known as**: Routine, Streak

### Reflection
**Definition**: A qualitative record of thoughts, mood, and lessons learned, enabling the AI to surface insights.
**Also known as**: Journal Entry

### AI Life Coach
**Definition**: The intelligent assistant that analyzes patterns, suggests plans, and provides accountability.

## Relationships

[Vision Layer] --guides--> [Yearly Goal]
[Yearly Goal] --broken down into--> [Quarterly Objective]
[Quarterly Objective] --informs--> [Monthly Reset]
[Monthly Reset] --drives--> [Weekly Priority]
[Weekly Priority] --executed via--> [Task]
[Task] --grouped by--> [Project]
[Task] --scheduled in--> [Time Block]
[Habit] --supports--> [Vision Layer]
[Habit] --protected by--> [Streak Shield]
[Reflection] --analyzed by--> [AI Life Coach]
[Focus Mode] --tracks--> [Deep Work Session]
[Shutdown Ritual] --produces--> [Reflection]
[Yearly Goal] --measured by--> [Key Result]
[Yearly Goal] --tracked via--> [Milestone]

## Additional Concepts

### Project
**Definition**: A container that groups related tasks together, providing organizational context and color-coded visual identity.

### Key Result
**Definition**: A boolean objective linked to a Goal. When all key results are completed, the goal's progress reaches 100%.

### Milestone
**Definition**: A checkpoint on the roadmap to achieving a goal, with a target date and status (upcoming, active, done).

### Time Block
**Definition**: A scheduled block of time for a specific day, used in the Weekly Planner to allocate focused work periods.
**Types**: deep_work, meeting, break, personal, admin

### Focus Mode
**Definition**: A distraction-free timer session with ambient audio synthesis, waveform visualization, and deep work scoring.
**Also known as**: Pomodoro, Deep Work Session

### Shutdown Ritual
**Definition**: A guided end-of-day reflection wizard that walks the user through reviewing wins, lessons, and gratitude before closing out the day.
**Also known as**: EOD Shutdown, Evening Reflection

### Streak Shield
**Definition**: A protective mechanism that preserves a habit streak when the user misses a day. Shields are earned through consistency (1 per 7-day streak, max 3).

### Monthly Life Score
**Definition**: A quantitative assessment across different life categories to measure overall balance and progress.
**Categories**: productivity, health, consistency, learning, happiness, social connection, focus

### Bucket List Item
**Definition**: An aspirational life experience or achievement the user wants to accomplish, categorized and tracked on the Vision Board.

