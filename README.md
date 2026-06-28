# 🚀 DeadlineAI — Autonomous AI Chief of Staff

> "Your raw schedule chaos, organized. Your deadlines, conquered. Your deliverables, drafted."

### 🌐 Live Production Application
🔗 **[Access the Deployed Platform Here](https://ai-chief-of-staff-967416242543.us-west1.run.app)**

DeadlineAI is an elite, full-stack **Autonomous AI Chief of Staff** that acts as a pro-active productivity partner. Unlike passive reminder apps, DeadlineAI parses messy text dumps or spoken voice notes of commitments, cross-references calendars, highlights conflicts, and takes actual action—such as drafting precise emails, writing technical outlines, and booking events to your Google Calendar via OAuth2 with one click.

---

## 📝 Hackathon Submission Case

### 🎯 Problem Statement Selected
**The Last-Minute Life Saver**  
Professionals, students, and creators face a high cognitive load when managing sudden shifts, unorganized commitments, unread emails, and loose thoughts. Existing calendar tools require tedious manual entry, while standard task managers merely remind you without providing the substance or time to actually *do* the work.

### 💡 Solution Overview
**DeadlineAI is an Autonomous AI Chief of Staff.** It solves calendar anxiety at its root:
1. **Translates Raw Stress Into Structured Plans:** Uses advanced Google Gemini models to extract tasks, score effort/urgency, and block time.
2. **First-Class Workspace Action Engine:** Directly drafts actionable email replies, outline deliverables, and checklist items.
3. **Frictionless Google Integration:** Fully connects with Google Calendar and Google Tasks via OAuth2 for instantaneous bi-directional scheduling.
4. **Proactive In-App Nudges:** Alerts you dynamically of upcoming free time windows, inviting you to kickstart priority outlines before deadlines hit.

---

## 🧠 System Architecture & Data Flow

```
                      [ Raw Chaos Dump / Voice Dictation ]
                                      |
                                      v
                             [ Express Backend ]
                                      |
         +----------------------------+----------------------------+
         |                                                         |
         v                                                         v
 [ Google Gemini API ]                                   [ Google OAuth2 APIs ]
  - Multi-Model Fallbacks                                 - Fetch Google Calendar Events
  - Structured JSON Output                                - Fetch Google Tasks
  - Task Priority Matrices                                - Add / Update Schedules & Tasks
         |                                                         |
         +----------------------------+----------------------------+
                                      |
                                      v
                            [ React SPA Console ]
       - Dark Glassmorphism Landing Page & App Dashboard
       - Interactive Urgent vs. Effort Charts & Timeline Slots
       - Multi-draft Copier & Custom Outlines
       - Simulated Speech waves & Browser Nudges
```

---

## 💫 Core Features

### 🎨 1. Premium SaaS Landing Page & Console
Designed with a dark, premium slate aesthetic utilizing electric blue/purple gradients, fluid glassmorphism borders, and elegant interactive transitions powered by `motion/react`. Features a complete interactive mock panel alongside the live production workspace dashboard.

### 🧠 2. Core AI Agent Intelligence (Gemini Engine)
When you input a text block, our agent parses every detail using structured schema generation to:
* **Urgency & Effort Matrix:** Auto-rates each item on a `1-10` scale.
* **Smart Prioritizer:** Automatically groups and prioritizes your tasks (`High`, `Medium`, `Low`).
* **Time Allocation:** Recommends dedicated focus blocks and durations.
* **Proactive Insight:** Appends a personalized, motivating strategic productivity insight to build confidence.

### 📅 3. Google Workspace Ecosystem (Calendar & Tasks)
Provides bi-directional connection using Google OAuth2:
* **Collision Audit:** Reads current calendar events and overlays AI-suggested focus blocks, highlighting time-slots.
* **One-Click "Book All":** Sequence-processes multiple booking inputs to Google Calendar instantly.
* **Google Tasks Integration:** Syncs parsed actions straight to your Google Tasks list with due dates and urgency metadata.

### ✍️ 4. AI Task Executor (Action Drafting)
Tackles the friction of starting deliverables. Generates immediate starting assets in clean Markdown:
* **Emails:** Ready-to-send draft responses adjusting to appropriate context.
* **Documents:** Structured briefs and outlines for reports or presentations.
* **Meeting Preparation:** Custom agendas and actionable talking points.

### 🔔 5. Smart Nudge Synthesizer
A proactive check loop system that identifies upcoming idle blocks on the user's schedule:
* Displays dynamic, actionable in-app alerts (e.g., *"You have 90 mins free at 3:00 PM. Start outline for Q3 Financials?"*).
* Instantly triggers the AI Task Executor to formulate drafts upon confirming.

### 📊 6. Dark Theme Glassmorphic Dashboard
A central command station that keeps you in command of your schedule:
* Highly responsive statistics (Emails Drafted, Slots Booked, Outlines Created, Streak Trackers).
* Real-time task tables sorted by urgency score and complete with interactive countdown timers that shift colors near deadlines.

### 🎤 7. Voice Input Console
Includes real-time speech-to-text transcription utilizing the Web Speech API:
* Displays a glowing microphone interface with responsive pulsing soundwave canvas animations during recording.
* Includes a graceful, intelligent simulator mode for browsers without native recording API support.

---

## 🛠️ Google Technologies Utilized

| Google Technology | Purpose in DeadlineAI |
| :--- | :--- |
| **Google Gemini API** | Leverages `gemini-3.5-flash`, `gemini-3.1-flash-lite`, and multi-model fallbacks to analyze scheduling data, output rigid JSON schemas, and draft high-quality documents. |
| **Google Calendar API** | Performs bidirection schedule queries and programmatically writes custom focus events onto user accounts. |
| **Google Tasks API** | Handles sync writebacks for extracted high-priority checklists. |
| **Google OAuth 2.0** | Secures secure workspace tokens and permissions natively. |
| **Google AI Studio** | Used to prototype system instructions, structure schemas, and configure secrets dynamically. |
| **Google Cloud Run** | Hosts the containerized Express/Vite full-stack application. |

---

## 📦 Tech Stack

* **Frontend:** React 19, TypeScript, Tailwind CSS, Vite, Lucide React, Motion (`motion/react`)
* **Backend:** Node.js, Express, `tsx` runner, `esbuild` (production bundling)
* **Authentication & Database:** Firebase Auth (Google OAuth2 Scope Handler)

---

## 🚀 Quick Start Guide

### 1. Prerequisites
Ensure you have Node.js (v18+) and npm installed.

### 2. Configure Environment Variables
Copy `.env.example` into `.env` at the root and fill in your details:
```env
# Google Gemini API Key
GEMINI_API_KEY="your-gemini-api-key"

# App Deployment/Callback Host URL (e.g. localhost or Cloud Run URL)
APP_URL="http://localhost:3000"
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Run Development Server
```bash
npm run dev
```
The server will bind on `0.0.0.0` port `3000`. Open `http://localhost:3000` to access the console.

### 5. Production Build & Execution
```bash
# Build Vite assets and compile CJS Server bundle with esbuild
npm run build

# Boot CJS build in Production
npm run start
```

---

## 🛡️ License
Distributed under the Apache-2.0 License. See `LICENSE` or file headers for details.
