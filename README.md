# Mentora AI

> Learn by teaching. Mentora AI is a study platform where you explain concepts to a confused AI student — exposing your real knowledge gaps before your exam does.

![Tech Stack](https://img.shields.io/badge/Stack-MERN-green)
![AI](https://img.shields.io/badge/AI-Claude%20Haiku-purple)
![License](https://img.shields.io/badge/License-MIT-blue)

## What is Mentora AI?

Most students study by re-reading notes — the least effective method known to learning science. Mentora AI uses the **Feynman Technique**: you teach a concept to a confused AI student, and the AI asks the questions a real confused person would ask. Where your explanation breaks down is exactly where your knowledge gap is.

## Features

- **Live AI Conversation** — Real-time confused student persona powered by Claude Haiku
- **Explanation Scoring** — Scored on completeness, accuracy, and clarity with evidence from your words
- **Concept Gap Map** — Visual map of every concept you have studied and where you are weak
- **Voice Mode** — Explain out loud using Whisper transcription
- **Notes Upload** — Upload PDFs and Mentora extracts every concept into a study plan
- **Streak Tracking** — Daily streaks, XP, and badges for consistent studying

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
- BullMQ (job queues)
- Winston (logging)

### Database
- MongoDB Atlas (main database)
- Atlas Vector Search (concept similarity)
- Upstash Redis (queues + caching)

### AI
- Anthropic Claude Haiku (conversation + scoring)
- OpenAI Whisper (voice transcription)

### Deployment
- Frontend: Vercel
- Backend: Render
- Database: MongoDB Atlas

## Getting Started

### Prerequisites
- Node.js 20+
- npm 10+
- MongoDB Atlas account (free)
- Anthropic API key (free credits)

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