# Mentora AI

> Learn by teaching. Mentora AI is a study platform where you explain concepts to a confused AI student — exposing your real knowledge gaps before your exam does.

![Tech Stack](https://img.shields.io/badge/Stack-MERN-green)
![AI](https://img.shields.io/badge/AI-Gemini%203.5%20Flash-purple)

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
- **Email Verification** — New accounts confirm their address before starting a session, so a typo at signup can never lock someone out of their own password reset
- **Safe Email Changes** — Changing your email needs your password, and only takes effect once the new address confirms it; the old address is told either way
- **Account Emails** — A welcome once verified, and a security notification whenever your password changes

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
- Google Gemini (`gemini-3.5-flash-lite` by default, set with `GEMINI_MODEL`) — conversation, scoring, concept extraction, **and voice transcription** (your spoken explanation → text)
- Free-tier request quotas are counted per model, so switching `GEMINI_MODEL` gives a fresh daily allowance. Whichever model you pick must accept audio input, since Voice Mode transcribes through it.
- Browser Web Speech API (`SpeechSynthesis`) — text-to-speech for the AI's spoken replies in Voice Mode; free, client-side, no AI call involved

### Email
- Brevo (transactional email API). Sent via HTTPS API rather than SMTP, since most cloud hosts (including this project's, Render) block outbound SMTP ports by default.
- Six emails are sent: address verification at signup, a welcome once that is confirmed, password reset, password changed, and — for an email change — a confirmation link to the new address plus a notice to the old one.
- Every email is sent with both an HTML and a plain-text part, which mail providers weigh when deciding what is spam.
- Links in emails are built from `APP_URL`, deliberately separate from `FRONTEND_URL`: that one is a CORS allow-list and may hold several comma-separated origins, which would produce a dead link if pasted into a URL.
- Sender is a single verified email address (not a domain), so deliverability is decent but not guaranteed — occasional spam-folder placement is possible, especially for first-time recipients. Every email includes a note to check spam if it's missing from the inbox.
- Sending never blocks a request: a failed send is logged, and the action it accompanied (registering, resetting a password) still succeeds. The one exception is the "resend verification" button, where the user is waiting on an answer and deserves an honest one.

### Deployment
- Frontend: Vercel
- Backend: Render
- Database: MongoDB Atlas

### Planned / not yet implemented
Referenced in code comments or planned, but not wired up:
- MongoDB Atlas Vector Search — semantic grouping of similar concepts/gaps across sessions (today, the Concepts page groups by exact topic-string match only)
- Custom domain email sending — verifying a real domain (rather than a single mailbox address) with Brevo would improve deliverability and remove the current spam-folder risk on account emails
- Background job queues — notes/concept extraction and scoring both run on the request. BullMQ and Upstash Redis were installed for this and removed again: nothing imported them, and carrying an unused queue dependency was worse than not having one.

## Getting Started

### Prerequisites
- Node.js 20+
- npm 10+
- MongoDB Atlas account (free)
- Google Gemini API key (free tier available)
- Brevo account (free tier, 300 emails/day — for sending account emails), with one sender address verified in their dashboard

Without a working Brevo key the app still runs, but new accounts cannot verify their address, and so cannot start a session. The server warns about this at startup rather than failing quietly.

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

5. Fill in your environment variables — each one is commented in the `.env.example` files. The ones worth calling out:

   | Variable | Where | Notes |
   | --- | --- | --- |
   | `MONGODB_URI` | backend | Atlas connection string |
   | `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | backend | Two *different* random strings |
   | `GEMINI_API_KEY` | backend | Required — the AI student, scoring and transcription all use it |
   | `BREVO_API_KEY` | backend | Required for account emails |
   | `EMAIL_FROM` | backend | Must match the sender verified in Brevo exactly, or every send fails |
   | `APP_URL` | backend | One URL, no trailing slash. Where links inside emails point |
   | `FRONTEND_URL` | backend | CORS allow-list; may be several origins, comma-separated |
   | `VITE_API_URL` | frontend | Where the browser reaches the backend |

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
