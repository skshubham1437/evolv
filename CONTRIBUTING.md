# Contributing to Evolv

Thank you for your interest in contributing to Evolv! This guide will help you get started.

## Development Setup

### Prerequisites
- **Go** v1.21+
- **Node.js** v18+ & **npm**
- **PostgreSQL** (running instance)
- **Google Gemini API Key** (optional, for AI features)

### Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/skshubham1437/evolv.git
   cd evolv
   ```

2. **Backend setup:**
   ```bash
   cd server
   cp .env.example .env
   # Edit .env with your database credentials and API keys
   go run main.go
   ```

3. **Frontend setup:**
   ```bash
   cd client
   cp .env.example .env
   npm install
   npm run dev
   ```

## Development Conventions

- Read `requirement.md` before starting any implementation
- Use domain terms from `CONTEXT.md` in code, tests, and documentation
- Write tests that verify behavior through public interfaces, not implementation details
- Follow the TDD red-green-refactor loop for new features and bug fixes
- Keep commits small and focused — one vertical slice per commit

## Branch Strategy

- `main` — stable, deployable code
- `feature/<name>` — new feature branches
- `fix/<name>` — bug fix branches

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes following the conventions above
3. Ensure `go build ./...` passes in `server/`
4. Ensure `npm run build` passes in `client/`
5. Update documentation if needed (README, CONTEXT.md, ADRs)
6. Submit a PR with a clear description of changes

## Project Structure

```
evolv/
├── client/                # React + TypeScript frontend
│   ├── src/
│   │   ├── api/           # API client modules (modular, tree-shakeable)
│   │   ├── components/    # Reusable UI components
│   │   │   ├── layout/    # Layout, Sidebar, ProtectedRoute
│   │   │   └── ui/        # Badge, Button, Card, Input, Modal, Skeleton
│   │   ├── context/       # React contexts (Auth, Theme, AI, Toast)
│   │   └── pages/         # Page-level components
│   └── .env.example       # Frontend env template
├── server/                # Go backend API
│   ├── database/          # DB connection
│   ├── handlers/          # HTTP handlers (split by domain)
│   ├── middleware/        # JWT auth middleware
│   ├── models/            # GORM database schemas
│   ├── services/          # AI service (Gemini)
│   └── .env.example       # Backend env template
├── docs/                  # Documentation
│   ├── adr/               # Architecture Decision Records
│   └── evolv_implementation_plan.md
├── CONTEXT.md             # Domain glossary (ubiquitous language)
└── requirement.md         # Product requirements
```

## Architecture Decision Records (ADRs)

When making significant architectural decisions, create a new ADR in `docs/adr/` following the existing format. See `docs/adr/0001-architecture-react-golang.md` for an example.

## Code Style

### Go (Backend)
- Follow standard Go formatting (`gofmt`)
- Use meaningful variable names
- Group handler functions by domain in separate files
- Shared helpers go in `handlers/helpers.go`

### TypeScript (Frontend)
- Use TypeScript strict mode
- API modules are organized by domain in `src/api/`
- Use CSS variables from the design system (never hardcode colors)
- Respect `prefers-reduced-motion` for all animations
