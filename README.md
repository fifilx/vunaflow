# VunaFlow — Smart Vuna Assistant (Vuna AI)

An AI-powered agricultural loan assistance platform that helps farmers, agribusiness
owners and loan applicants understand, apply for, track and manage agricultural loans —
with a strong focus on user experience, automation and **bilingual (English / Swahili)** support.

> This repository contains a working **web MVP** (React + Node/Express + SQLite). Heavier
> production pieces (real NLP models, Tesseract OCR, live SMS/OTP, Google OAuth, Flutter
> mobile app) are implemented as functional demos/stubs and can be wired to real providers.

## Features

- **Onboarding / Welcome** experience with benefits and **live feature previews** (chatbot,
  eligibility calculator, document upload, dashboard, tracking) — explorable **without signing up**.
- **Authentication**: email/password, phone + OTP (demo code `123456`), Google login (demo),
  password reset, **remember me**, and a **show/hide password eye toggle**. First-time signups
  are **persisted to the database** so users can log back in later.
- **Bilingual UI**: full **EN | SW** toggle across every screen, including the AI chatbot,
  notifications, forms, buttons and errors. Language preference is saved.
- **AI chatbot (Vuna AI)**: intent-based bilingual assistant with conversational memory,
  voice input (Web Speech API) and spoken replies, and staff escalation.
- **Smart eligibility assistant**: probability score, monthly repayment estimate, recommended
  product and explanations of missing requirements.
- **Document verification**: upload IDs / certificates / farm & financial docs with mock OCR
  text extraction, quality flagging and status.
- **Loan management**: multi-step application, save drafts, submit, and a **visual status
  tracker** (Submitted → Under Review → Verification → Approved/Rejected → Disbursed).
- **Notifications** (bilingual) for application updates, missing documents and reminders.
- **Roles**: Customer, Staff (review applications, update statuses, view docs, analytics) and
  Administrator (user management, role changes, audit log).
- **Analytics dashboard** with charts (approval rate, incomplete rate, applications over time, by status).
- **Accessibility**: dark mode, large-text mode, low-bandwidth mode, voice support.

## Tech stack

- **Frontend**: React + TypeScript + Vite, Tailwind CSS, react-i18next, Recharts, lucide-react
- **Backend**: Node.js + Express + TypeScript (tsx), JWT auth, bcrypt password hashing
- **Database**: SQLite via better-sqlite3 (schema mirrors the requested PostgreSQL design and
  is straightforward to port to Postgres)

## Getting started

```bash
# install dependencies for both apps
npm run install:all

# run backend (http://localhost:4000) and frontend (http://localhost:5173) together
npm run dev
```

The Vite dev server proxies `/api` to the backend. For a single-process production-style run:

```bash
npm run build   # builds the client into client/dist
npm start       # Express serves the API + the built client on http://localhost:4000
```

## Demo / seed accounts

| Role  | Email                 | Password   |
|-------|-----------------------|------------|
| Staff | staff@vunaflow.app    | staff1234  |
| Admin | admin@vunaflow.app    | admin1234  |

Customers are created via signup. Phone OTP demo code is `123456`.

## Project structure

```
vunaflow/
├── client/   # React + Vite frontend (i18n, pages, components)
└── server/   # Express + SQLite API (auth, applications, documents, chat, analytics)
```

## Database tables

`users`, `roles` (via user.role), `loan_products`, `applications`, `documents`,
`conversations`, `messages`, `notifications`, `audit_logs`.

## Security

JWT auth, bcrypt password hashing, role-based access control on staff/admin routes,
input validation, audit logging, and no user-enumeration on password reset.

## Roadmap (Phase 2+)

- Replace SQLite with PostgreSQL and add migrations
- Real NLP model + intent recognition service (Python/TensorFlow)
- Tesseract OCR microservice for true document extraction
- Live SMS/OTP (e.g. Africa's Talking / Twilio), email and push notifications
- Google OAuth, cloud document storage
- Flutter mobile app sharing the same API
