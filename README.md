# PlanRight V21 - Victory Log Edition

Your intelligent PWA planner with Task Management, Projects, Notes, Templates, and Victory Log.

## Features
- Tasks with priority, status, categories, dependencies
- Project management with vault for quick references
- Notes organized by project
- Task templates for recurring workflows
- Growth dashboard with weekly analytics
- Victory Log showing completed achievements
- Pomodoro timer for focus sessions
- Full offline support (PWA)

## Deployment

### Cloudflare Deploy Button

Deploy to Cloudflare in one click:

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/itsformehplaner/planright-v21)

### What gets created:
- **Cloudflare Pages** — Static frontend from Next.js export
- **Cloudflare Worker** — API server handling tasks, projects, notes, auth
- **D1 Database** — Persistent storage for all data
- **Security** — Admin password protection with session-based auth

## Local Development

```bash
npm install
npm run dev
```

## Tech Stack
- Next.js 15 (Static Export)
- Cloudflare Workers + D1
- Tailwind CSS + Radix UI
- React 18

## License
Private - All Rights Reserved
