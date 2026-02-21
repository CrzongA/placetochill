# WhereToChill - Architectural Solution Guideline (POC)

## Overview
A Proof of Concept (POC) for mapping "chill" spots in Hong Kong via crowdsourced user submissions. The focus is on minimizing infrastructure costs while validating the core user experience.

## System Architecture

### 1. Frontend (Web/Mobile-Responsive App)
- **Framework**: Next.js (React). Chosen for its built-in routing and SEO capabilities (SSR/SSG) which will be valuable post-POC.
- **Hosting**: Vercel or Netlify (Generous free tiers, perfect for POCs).
- **Map Integration**: 
  - **Leaflet.js + OpenStreetMap**: 100% free and open-source.
  - **Alternative**: Mapbox GL JS (Generous free tier up to 50k loads/month, looks more premium).
- **Styling**: Tailwind CSS for rapid styling.
- **User Authentication**: Google OAuth (via Supabase Auth) for users to log in and leave comments on map entries.
- **Admin Dashboard**: A protected portal/route for administrators to review, edit, and approve newly submitted locations before they go live on the public map.

### 2. Backend & Database
- **Platform**: Supabase (PostgreSQL-based Backend-as-a-Service).
- **Why Supabase?**
  - Robust free tier including Auth (Google OAuth built-in), Database, and Edge Functions.
  - Built-in **PostGIS** support, critical for spatial/geospatial queries.
- **Database Schema Highlights**:
  - `locations` table with an `approved` boolean flag (default `false`), `google_maps_landmark`, and `description` fields.
  - `tags` text array for filtering (e.g., "游樂場", "咖啡廳", "寧靜").
  - `photos` integration via Supabase Storage for custom photo uploads.
  - `comments` table linked to users and locations.

### 3. User Submission Form
- **Submission Page**: A dedicated web page for any user to submit their "chill" place.
- **Form Data Fields**:
  - **Google Maps Landmark**: For precise location and coordinate association.
  - **Description**: Detailing what makes the spot special.
  - **Tag**: Highlighting which aspects make it "chill" (e.g., 游樂場, 咖啡廳, 安靜, 有wifi).
  - **Custom Photo Upload**: Allows users to upload their own images of the spot (stored via Supabase Storage).

---

## Technical Flow
1. **User Submission**: A user visits the dedicated submission page, inputs the Google Maps landmark, writes a description, selects/adds tags, and uploads a custom photo.
2. **Storage (Pending Approval)**: Form data is pushed into the Supabase database and the photo to Supabase Storage. The entry gets an `approved: false` status, keeping it hidden from the public map.
3. **Admin Curation**: An admin logs into the Admin Dashboard, reviews the newly submitted entries and photos, makes any necessary edits, and approves them.
4. **Client Access**: The public frontend securely queries only approved POIs (Points of Interest) from Supabase. Users can view the photos, description, and filter by tags.
5. **Community**: Visitors log in via Google OAuth to drop comments on the approved POIs.
