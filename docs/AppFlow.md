# Application User Flows — Week 9 Gaps & Enhancements

This document maps out the interactive app flows and user journeys introduced for the Week 9 functional enhancements in the Evolv portal.

---

## 1. Strategic Planning Flow (Goals & Milestones)

The user establishes objectives and maps them to a roadmap using concrete date controls:

```mermaid
sequenceDiagram
    autonumber
    actor User as Builder (User)
    participant UI as Goals Page (Client)
    participant API as Goals API (/api/goals)
    participant DB as Database (Postgres)

    User->>UI: Clicks "New Goal"
    UI->>User: Displays Modal with Date Picker Input
    User->>UI: Selects target due date (e.g. 2026-12-31) & inputs details
    User->>UI: Clicks "Deploy Goal"
    UI->>API: POST /api/goals (due_date in RFC3339 format)
    API->>DB: INS TO goals (due_date as TIMESTAMPTZ)
    DB-->>API: Success
    API-->>UI: Returns Created Goal Struct
    UI->>User: Renders Goal card with progress bar (0%) & formatted date

    User->>UI: Selects Goal card & clicks "Add Node" (Milestone)
    UI->>User: Displays Milestone form with HTML5 date selector
    User->>UI: Selects date (e.g. 2026-09-30) and quarter (e.g. Q3)
    User->>UI: Clicks "Save Node"
    UI->>API: POST /api/goals/{id}/milestones
    API->>DB: INS TO milestones (date as TIMESTAMPTZ)
    DB-->>API: Success
    API-->>UI: Returns Milestone
    UI->>User: Appends Milestone node chronologically to Timeline Roadmap
```

---

## 2. Priority Queue & Eisenhower Matrix Flow

The builder prioritizes their actions using a toggleable list and 4-quadrant layout:

```mermaid
flowchart TD
    Start([User opens Priority Queue]) --> Toggle{View Mode Toggle}
    
    Toggle -->|Queue View| ListView[Display Projects & Standalone Actions list]
    Toggle -->|Eisenhower View| GridView[Display 2x2 Quadrant Grid]
    
    ListView --> OpenTask[User expands Task detail panel]
    GridView --> OpenTask
    
    OpenTask --> ChangeFlags[User toggles Urgent / Important checkboxes]
    ChangeFlags --> API[PATCH /api/tasks/:id]
    API --> DB[(DB: Update task.is_urgent / task.is_important)]
    
    DB --> RealtimeUpdate[Tasks Page State Updates]
    RealtimeUpdate -->|Queue View| StateUpdate1[Update Priority pills on TaskRow]
    RealtimeUpdate -->|Eisenhower View| StateUpdate2[Task dynamically slides to new Quadrant in real-time]
```

### 2.1. Task Creation & Progress Propagation Flow
1. **Define Task**: Builder clicks **Add Task** and specifies properties (Title, Project, Parent Task, Dependency, Linkage Goal, Urgency, Importance).
2. **Persistence**: Client calls `POST /api/tasks`.
3. **Database Transaction**:
   - Inserts task record with foreign keys (`goal_id`, `objective_id`) and flags (`is_urgent`, `is_important`).
   - Trigger recalculation function: Computes overall completion percentage of the parent goal from its key results and associated tasks.
   - Atomically updates the `progress` column in the `goals` table.
4. **Reactive Feedback**: The UI updates the goal's progress bar dynamically without requiring a page reload.

---

## 3. Circadian Energy Check-in Flow

The user logs their energy levels to build a real-time circadian battery heatmap:

```mermaid
sequenceDiagram
    autonumber
    actor User as Builder (User)
    participant Dash as Dashboard (Client)
    participant API as Energy API (/api/energy)
    participant Analytics as Analytics Page (Client)

    User->>Dash: Views "Energy Check-in" card on right widget panel
    Dash->>User: Displays 1 (Low) to 5 (High) interactive scale buttons
    User->>Dash: Clicks "4" button
    Dash->>API: POST /api/energy { "energy": 4 }
    API-->>Dash: Response (201 Created)
    Dash->>User: Dispatches success Toast: "Energy log registered: Level 4/5"

    Note over User, Analytics: Later in the day...
    User->>Analytics: Navigates to Analytics Page
    Analytics->>API: GET /api/analytics/summary
    Note right of API: Compiles logged_at slots. For missing hours,<br/>falls back to daily average mood/energy from journals.
    API-->>Analytics: Returns aggregated circadian hourly matrix
    Analytics->>User: Renders premium non-simulated color-graded heatmap
```
