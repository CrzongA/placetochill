# 🇭🇰 WhereToChill (POC)

A Proof-of-Concept mapping application focused on finding and sharing the "chill" spots in Hong Kong. Users can submit locations with descriptions, tags, and photos, which are then moderated by admins before appearing on the public interactive map.

## 🚀 Features

- **Interactive Map**: Built with Leaflet.js and OpenStreetMap for discovering "chill" spots.
- **Crowdsourced Submissions**: Dedicated submission form with location search (Nominatim) and photo uploads.
- **Admin Moderation**: Secure dashboard for approving and managing submissions.
- **Tagging System**: Category-based filtering (e.g., 咖啡廳, 安靜, 有wifi).
- **Security First**: Row-Level Security (RLS) policies and hardened middleware protection.

## 🛠️ Tech Stack

- **Frontend**: [Next.js](https://nextjs.org/) (App Router), [Tailwind CSS](https://tailwindcss.com/)
- **Maps**: [Leaflet.js](https://leafletjs.org/), [React-Leaflet](https://react-leaflet.js.org/)
- **Backend/DB**: [Supabase](https://supabase.com/) (PostgreSQL + [PostGIS](https://postgis.net/))
- **Auth**: Supabase Auth (supports Google OAuth)
- **Deployment**: Optimized for [Vercel](https://vercel.com/)

## 🏗️ Architecture

For a detailed breakdown of the system design and data flow, please refer to the [ARCHITECTURE.md](./ARCHITECTURE.md) document.

## 📦 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (required to run local Supabase)
- [Supabase CLI](https://supabase.com/docs/guides/cli)

### 2. Installation
```bash
# Clone the repository
git clone <repository-url>
cd wheretochill

# Install frontend dependencies
cd frontend
npm install
```

### 3. Local Supabase Setup
```bash
# From the project root
npx supabase start

# The CLI will provide your local environment variables:
# NEXT_PUBLIC_SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### 4. Frontend Configuration
Create a `frontend/.env.local` file and add the credentials provided by the Supabase CLI:
```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### 5. Running the App
```bash
cd frontend
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to see the application.

## 🛡️ Security

- **Row-Level Security (RLS)**: Database policies strictly enforce that only approved spots are visible to the public and only admins can modify data.
- **Middleware**: server-side session validation prevents unauthorized access to protected routes (e.g., `/admin`).
- **Data Sanitization**: Built-in protection against SQL Injection (via Supabase client) and XSS (via Next.js).
