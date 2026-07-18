# Mentora AI

> Learn by teaching. Mentora AI is a study platform where you explain concepts to a confused AI student — exposing your real knowledge gaps before your exam does.

![Tech Stack](https://img.shields.io/badge/Stack-MERN-green)
![AI](https://img.shields.io/badge/AI-Gemini%202.5%20Flash-purple)

## What is Mentora AI?

Most students study by re-reading notes — the least effective method known to learning science. Mentora AI uses the **Feynman Technique**: you teach a concept to a confused AI student, and the AI asks the questions a real confused person would ask. Where your explanation breaks down is exactly where your knowledge gap is.

## Features

- **Live AI Conversation** — Real-time confused student persona powered by Gemini
- **Explanation Scoring** — Scored on completeness, accuracy, and clarity with evidence from your words
- **Concept Gap Map** — Every specific gap the AI has ever flagged in your explanations, grouped by topic — builds up whether or not you upload notes
- **Session History** — Review any past session's full transcript and scores, side by side
- **Smart Practice** — Jump back into an active session on a topic, or start fresh if your last attempt on it is complete
- **Voice Mode** — Explain out loud; your speech is transcribed by AI, and the AI's replies are read back to you
- **Notes Upload** — Upload PDFs and Mentora extracts every concept into a study plan
- **Streak Tracking, XP & Badges** — Daily streaks, XP for strong scores, and unlockable badges for milestones
- **Profile Management** — Edit your name/email and change your password from your account page
- **Password Reset via Email** — Forgot your password? Reset it via a secure, time-limited emailed link
- **Account Emails** — Welcome email on signup, and a security notification whenever your password changes

## Tech Stack

### Frontend
- React 18 + Vite
- Tailwind CSS
- Zustand (state management)
- TanStack Query (server state)
- Socket.io Client (real-time)
- Framer Motion (animations)

### Backend
- Node.js 20 + Express
- Socket.io (WebSocket server)
- Winston (logging)

### Database
- MongoDB Atlas (main database)

### AI
- Google Gemini (`gemini-2.5-flash-lite`) — conversation, scoring, concept extraction, **and voice transcription** (your spoken explanation → text)
- Browser Web Speech API (`SpeechSynthesis`) — text-to-speech for the AI's spoken replies in Voice Mode; free, client-side, no AI call involved

### Email
- Resend (transactional email API) — password reset, password-changed notifications, welcome emails. Sent via HTTPS API rather than SMTP, since most cloud hosts (including this project's, Render) block outbound SMTP ports by default.

### Deployment
- Frontend: Vercel
- Backend: Render
- Database: MongoDB Atlas

### Planned / not yet implemented
These are installed as dependencies or referenced in code comments, but not wired up yet:
- BullMQ + Upstash Redis — background job queues (would move notes/concept extraction and scoring off the request/response cycle)
- MongoDB Atlas Vector Search — semantic grouping of similar concepts/gaps across sessions (today, the Concepts page groups by exact topic-string match only)

## Getting Started

### Prerequisites
- Node.js 20+
- npm 10+
- MongoDB Atlas account (free)
- Google Gemini API key (free tier available)
- Resend account (free tier — for sending account emails)

### Installation

1. Clone the repository
```bash
   git clone https://github.com/yourusername/mentora-ai.git
   cd mentora-ai
```

2. Install frontend dependencies
```bash
   cd frontend
   npm install
```

3. Install backend dependencies
```bash
   cd ../backend
   npm install
```

4. Set up environment variables
```bash
   # In frontend/
   cp .env.example .env.local

   # In backend/
   cp .env.example .env
```

5. Fill in your environment variables (see .env.example files for guidance)

6. Run the development servers
```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev

   # Terminal 2 - Frontend
   cd frontend
   npm run dev
```

7. Open http://localhost:5173

## Project Structure
mentora-ai/
├── frontend/          # React + Vite frontend
├── backend/           # Node.js + Express backend
├── .github/           # GitHub Actions CI/CD
└── README.md

## Contributing

This is a portfolio project. Feel free to fork and build on it.
