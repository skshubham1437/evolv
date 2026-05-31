# 7. Streak Shield Behavioral Mechanics

Date: 2026-05-22

## Status

Accepted

## Context

Habit tracking apps commonly use streak counters to motivate consistency. However, a strict "miss one day and lose everything" policy triggers the "what-the-hell effect" from behavioral psychology — users who break a streak often abandon the habit entirely rather than restarting from zero.

## Decision

We will implement **Streak Shields** — a protective mechanism that preserves a habit streak when the user misses a day. Key mechanics:

1. **Shield Activation**: Users can enable streak shields per habit
2. **Shield Consumption**: If a day is missed, a shield is automatically consumed to preserve the streak
3. **Shield Earning**: Every 7 consecutive completions grants +1 shield (max 3 per habit)
4. **Shield Exhaustion**: If all shields are consumed and a day is missed, the streak resets to 0
5. **Phantom Logs**: When a shield protects a day, a synthetic `HabitLog` entry is created at noon to maintain heatmap continuity

## Consequences

- **Pros:** Buffers perfectionism fatigue. Keeps users engaged after occasional misses. The earning mechanic (1 shield per 7 days) incentivizes continued consistency. Reduces first-48-hour churn from new habit abandonment.
- **Cons:** Slightly more complex streak validation logic (`validateHabitStreaks`). Phantom logs may skew analytics if not filtered. Users may perceive shields as "cheating."
- **Mitigations:** Shields are opt-in per habit. The maximum cap of 3 prevents abuse. The earning mechanic means shields are a reward for consistency, not a free pass.
