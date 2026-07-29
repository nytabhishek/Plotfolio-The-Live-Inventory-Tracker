<div align="center"> <!-- 🖼️ LOGO / BANNER Replace the src below with your own banner image once uploaded. See "HOW TO ADD IMAGES" notes at the bottom of this file. --> <img src="./docs/images/banner.png" alt="Dream Valley Banner" width="100%" />
🏢 Dream Valley — Live Inventory Tracker

A full-stack real estate plot inventory & CRM system, built to track plot availability, sales-rep activity, and admin operations in real time.

<!-- BADGES: see "HOW TO ADD BADGES" section below for how these work -->

Show Image Show Image Show Image Show Image Show Image

🔗 Live Demo · 📖 Features · 🛠 Tech Stack · ⚙️ Setup

</div>
📌 About the Project

Dream Valley is a live inventory management system built for a real estate sales team to track plot status (Available / Sold / On Hold), manage sales representative access, and give admins full CRM control — all in one dashboard, updating in real time.

This project was built end-to-end: designing the database schema, building the API, building the React dashboard, and — most importantly — deploying it as a production-grade full-stack application, handling real-world challenges like cross-origin authentication, session persistence, and monorepo deployment pipelines.

💡 Why this project stands out: Building the app is one thing — getting a full-stack app with authentication actually live and working in production is where most tutorials stop. This project involved debugging real deployment issues (session cookies, database provisioning, CI/CD build pipelines) that mirror what engineers deal with in actual production environments.

✨ Features
🔐 Dual authentication system — separate login flows for Sales Reps (RM Code) and CRM Admins (email/password)
🏘️ Real-time plot inventory — track plot number, dimensions, area, facing direction, and status
➕ Add & manage plots — register new plots with full specifications (dimensions, area, facing, PLC type)
🔑 RM Code management — CRM admins can create and manage sales personnel access codes
📊 Activity logging — every plot update is tracked with a full audit trail (who changed what, and when)
🔄 Live status updates — Available / Allotted / Freeze / Hold, reflected instantly across the dashboard
📤 Excel export — one-click export of the full inventory
🖥️ Single unified deployment — frontend and backend served from one origin for security and simplicity
📸 Screenshots
<div align="center">
Sales Rep Login & Dashboard
<img src="./docs/images/sales-login.png" alt="Sales Login" width="48%" /> <img src="./docs/images/sales-dashboard.png" alt="Sales Dashboard" width="48%" />

Sales reps log in with a unique RM Code to view live, filterable plot availability.

CRM Admin Login & Inventory Management
<img src="./docs/images/crm-login.png" alt="CRM Admin Login" width="48%" /> <img src="./docs/images/inventory-management.png" alt="Inventory Management" width="48%" />

Admins get a full command center: total/available/unavailable plot breakdowns and inline editing.

Add Plot & RM Code Management
<img src="./docs/images/add-plot.png" alt="Add New Plot" width="48%" /> <img src="./docs/images/rm-codes.png" alt="RM Codes Management" width="48%" />

Register new plots with full specs, and manage sales rep access codes in one place.

Activity Logs
<img src="./docs/images/activity-logs.png" alt="Activity Logs" width="70%" />

Every change is logged with a before/after diff and timestamp — a full audit trail.

</div>
🛠 Tech Stack
Layer	Technology
Frontend	React, Vite, TypeScript, TailwindCSS
Backend	Express.js, TypeScript, Node.js
Database	PostgreSQL (hosted on Neon), Drizzle ORM
Auth & Sessions	express-session + connect-pg-simple (Postgres-backed sessions)
Deployment	Railway (single-service deployment, monorepo build pipeline)
Tooling	pnpm workspaces (monorepo), esbuild
🏗️ Architecture
┌─────────────────────────────────────────────┐
│              Railway (single service)        │
│                                               │
│   ┌───────────────┐      ┌────────────────┐  │
│   │  React (Vite) │◄────►│  Express API   │  │
│   │  static build │      │  /api/* routes │  │
│   └───────────────┘      └───────┬────────┘  │
│                                   │           │
└───────────────────────────────────┼───────────┘
                                    ▼
                         ┌─────────────────────┐
                         │  PostgreSQL (Neon)  │
                         │  plots · rm_codes   │
                         │  crm_users · logs   │
                         └─────────────────────┘

Frontend and backend are served from the same origin — a deliberate architectural choice made after encountering (and solving) cross-origin cookie/session issues during initial deployment.

⚙️ Local Setup
bash
# Clone the repo
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>

# Install dependencies (uses pnpm workspaces)
pnpm install

# Set environment variables
cp .env.example .env
# Fill in DATABASE_URL, SESSION_SECRET

# Run in development
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/dream-valley run dev
🚧 Challenges & What I Learned
Cross-origin session cookies: Initially deployed frontend (Vercel) and backend (Render) separately, which broke cookie-based auth. Solved by consolidating to a single-origin deployment.
Monorepo CI/CD builds: Configured a pnpm-workspace build pipeline on Railway, resolving package-manager version pinning and lockfile issues.
Production session storage: Diagnosed and fixed a session-store initialization bug that only appeared in the production environment.
📬 Contact

Abhishek Vishwakarma LinkedIn

</div>
