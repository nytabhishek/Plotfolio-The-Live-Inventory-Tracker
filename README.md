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
📊 Activity logging — every plot update is tracked with an audit trail (who changed what, and when)
🔄 Live status updates — Available / Sold / On Hold, reflected instantly across the dashboard
🖥️ Single unified deployment — frontend and backend served from one origin for security and simplicity
<!-- 🎬 SCREENSHOTS / GIF DEMO This is the single highest-impact addition you can make. See "HOW TO ADD IMAGES" section below for exact steps. --> <div align="center"> <img src="./docs/images/login-screen.png" alt="Login Screen" width="45%" /> <img src="./docs/images/dashboard.png" alt="Dashboard" width="45%" /> </div>
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
