#!/bin/bash
set -e

# This script initializes the Supabase database with required roles and users
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create roles
    CREATE ROLE anon NOLOGIN NOINHERIT;
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;

    -- Create service users with the same password as POSTGRES_PASSWORD
    CREATE USER authenticator WITH PASSWORD '$POSTGRES_PASSWORD' NOINHERIT;
    CREATE USER supabase_auth_admin WITH PASSWORD '$POSTGRES_PASSWORD' CREATEROLE CREATEDB;
    CREATE USER supabase_storage_admin WITH PASSWORD '$POSTGRES_PASSWORD' CREATEROLE CREATEDB;

    -- Grant roles
    GRANT anon, authenticated, service_role TO authenticator;
    GRANT ALL ON SCHEMA public TO supabase_auth_admin, supabase_storage_admin;
    GRANT ALL PRIVILEGES ON DATABASE postgres TO supabase_auth_admin, supabase_storage_admin;
EOSQL
