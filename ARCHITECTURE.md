# WhereToChill - Architectural Solution Guideline (POC)

## Overview
A Proof of Concept (POC) for mapping "chill" spots in Hong Kong based on social media mentions. The focus is on minimizing infrastructure costs while validating the core user experience.

## System Architecture

### 1. Frontend (Web/Mobile-Responsive App)
- **Framework**: Next.js (React) or Vite (React).
- **Hosting**: Vercel or Netlify (Generous free tiers, perfect for POCs).
- **Map Integration**: 
  - **Leaflet.js + OpenStreetMap**: 100% free and open-source.
  - **Alternative**: Mapbox GL JS (Generous free tier up to 50k loads/month, looks more premium).
- **Styling**: Tailwind CSS for rapid styling.
- **User Authentication**: Google OAuth (via Supabase Auth) for users to log in and leave comments on map entries.
- **Admin Dashboard**: A protected portal/route for administrators to review, edit, and approve newly scraped locations before they go live on the public map.

### 2. Backend & Database
- **Platform**: Supabase (PostgreSQL-based Backend-as-a-Service).
- **Why Supabase?**
  - Robust free tier including Auth (Google OAuth built-in), Database, and Edge Functions.
  - Built-in **PostGIS** support, critical for spatial/geospatial queries.
- **Database Schema Highlights**:
  - `locations` table with an `approved` boolean flag (default `false`).
  - `tags` text array for filtering (e.g., "游樂場", "咖啡廳", "寧靜").
  - `comments` table linked to users and locations.

### 3. Scraper & Data Pipeline
- **Scraping Engine**: **Apify**. It provides maintained, ready-made social media scrapers. For the POC, it will use a given set of keywords, specific target accounts, and pre-selected posts to extract high-quality starting data.
- **Data Extraction & Auto-Tagging (LLM)**: Pass the scraped captions/comments into a low-cost LLM (e.g., GPT-4o-mini, Claude 3 Haiku, or Gemini 1.5 Flash). 
  - The LLM will extract the `place_name`.
  - The LLM will automatically suggest and append descriptive tags based on the context (e.g., 游樂場, 咖啡廳, 安靜, 有wifi).
- **Geocoding**: Pass the extracted location name + "Hong Kong" to APIs (like Google Maps Geocoding) to retrieve Latitude/Longitude coordinates.
- **Job Scheduler**: Run this pipeline as a scheduled batch job set to trigger **once a day** using **GitHub Actions**.

---

## Technical Flow
1. **Daily Batch Job**: A scheduled GitHub Action runs once a day.
2. **Scraping**: The Action triggers Apify to scrape the provided set of keywords, accounts, and posts.
3. **Extraction & Tagging**: Raw text is parsed by an LLM to extract the location name and automatically suggest relevant tags (e.g. 游樂場/咖啡廳/安靜/有wifi etc.).
4. **Geocoding**: Location names are converted into GPS coordinates.
5. **Storage (Pending Approval)**: Data is pushed into the Supabase database with an `approved: false` status so it remains hidden from the public map.
6. **Admin Curation**: An admin logs into the Admin Dashboard, reviews the LLM's suggested entries and tags, makes any edits, and approves them.
7. **Client Access**: The public frontend securely queries only approved POIs (Points of Interest) from Supabase. Users can filter by the auto-generated tags.
8. **Community**: Visitors log in via Google OAuth to drop comments on the approved POIs.
