# Evolv — AI Development Configuration

## Project Overview

This is the Evolv project. See `requirement.md` for project requirements.

## Agent Skills

The following skills are installed in `.gemini/skills/` and available on demand:

### Engineering Skills
- **`/tdd`** — Test-driven development with red-green-refactor loop (vertical slices, not horizontal)
- **`/diagnose`** — Disciplined debugging: reproduce → minimise → hypothesise → instrument → fix → regression-test
- **`/grill-with-docs`** — Stress-test plans against the domain model, update CONTEXT.md and ADRs inline
- **`/improve-codebase-architecture`** — Find deepening opportunities, turn shallow modules into deep ones
- **`/to-prd`** — Convert conversation context into a structured PRD
- **`/to-issues`** — Break plans into vertical-slice implementation tasks
- **`/zoom-out`** — Get a high-level architectural map of unfamiliar code
- **`/prototype`** — Build throwaway prototypes to validate designs
- **`/ubiquitous-language`** — Extract and maintain consistent domain vocabulary

### Productivity Skills
- **`/grill-me`** — Relentless design interview to surface assumptions and gaps
- **`/caveman`** — Ultra-compressed communication mode (~75% fewer tokens)
- **`/write-a-skill`** — Create new skills with proper structure

## Domain Docs

- `CONTEXT.md` — Domain glossary (ubiquitous language)
- `docs/adr/` — Architecture Decision Records

## Development Conventions

- Read `requirement.md` before starting any implementation
- Use domain terms from `CONTEXT.md` in code, tests, and documentation
- Write tests that verify behavior through public interfaces, not implementation details
- Follow the TDD red-green-refactor loop for new features and bug fixes
- Keep commits small and focused — one vertical slice per commit
