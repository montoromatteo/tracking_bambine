# Tracking Bambine

App Next.js per tracciare poppate, feci, urine e note per due gemelle (AM e AD).
Stack: Next.js (App Router) + Supabase (locale poi cloud) + Vercel.

## Workflow Orchestration

### 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately — don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes — don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests — then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plans**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Database**: Supabase (Postgres) — local dev, then cloud
- **UI**: Keep it simple — mobile-first, usable one-handed
- **Language**: Italian for UI, English for code
- **Deploy**: Vercel (auto-deploy from GitHub)

## Project Structure

```
app/                    # Next.js App Router pages
  layout.tsx
  page.tsx              # Dashboard / home
  inserisci/page.tsx    # Form inserimento dati
  storico/page.tsx      # Storico poppate
supabase/
  migrations/           # SQL migrations
lib/
  supabase.ts           # Supabase client
  types.ts              # TypeScript types
.env.local              # Local env vars (NEVER commit)
```

## Data Model

Due gemelle: AM e AD. Ogni entry traccia:
- Data e ora
- Seno (ml o tipo allattamento)
- Feci (sì/no)
- Urine (sì/no)
- Note (tirare latte, note mediche, ecc.)
