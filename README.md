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

### 3. Environment Configuration

Copy the template file to create your local environment variables:

```bash
cp .env.template .env
```

Open `.env` and fill in the values. **Crucially, you must initialize the JWT tokens and secrets**:

1.  **JWT_SECRET**: Generate a secure 32+ character string using `openssl rand -base64 32`. This secret is used to sign all auth tokens.
2.  **SUPABASE_ANON_KEY** & **SUPABASE_SERVICE_ROLE_KEY**: These are not random strings; they are JWTs signed with your `JWT_SECRET`. You can generate them at [jwt.io](https://jwt.io) (Algorithm: HS256) with these payloads:
    -   **Anon Key Payload**: `{ "role": "anon", "iss": "supabase" }`
    -   **Service Role Key Payload**: `{ "role": "service_role", "iss": "supabase" }`
    -   **Secret**: Use your `JWT_SECRET` value in the "Verify Signature" section.
3.  **POSTGRES_PASSWORD**: Set a secure password for the database.

### 4. Running the Stack (Docker Compose)

The entire stack (Supabase backend + Next.js frontend) can be started with a single command:

```bash
# Start all services (Database, Auth, API, Gateway, Studio, Frontend)
docker compose up -d

# Run database migrations (Required on first launch or schema updates)
docker compose --profile migrate up migrate
```

### 5. Accessing the Application

Once the containers are running, you can access the following services:

-   **Frontend**: [http://localhost:3000](http://localhost:3000)
-   **Supabase Studio (Dashboard)**: [http://localhost:54323](http://localhost:54323)
-   **Email Testing UI (Inbucket)**: [http://localhost:54324](http://localhost:54324)
-   **Database**: `localhost:54322` (User: `postgres`, Password: your `.env` value)

> [!TIP]
> To view logs for the frontend, use `docker compose logs -f frontend`. To tear down the stack and delete all data, use `docker compose down -v`.

## 🛡️ Security

- **Row-Level Security (RLS)**: Database policies strictly enforce that only approved spots are visible to the public and only admins can modify data.
- **Middleware**: server-side session validation prevents unauthorized access to protected routes (e.g., `/admin`).
- **Data Sanitization**: Built-in protection against SQL Injection (via Supabase client) and XSS (via Next.js).
