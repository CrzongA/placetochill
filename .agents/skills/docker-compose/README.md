# Docker Compose Environment Variable Management

## Summary

Critical best practice for Docker Compose development: **Never source .env files directly in your shell**. If temporarily needed for debugging, **always unset variables immediately after**.

## The Problem

```bash
# This pollutes your shell and causes hard-to-debug issues
source .env
docker compose up -d
```

**Consequences**:
- Shell variables override .env file values (Shell > .env > defaults)
- Variables persist across sessions
- Causes configuration mismatches
- Results in "role does not exist", CORS, and network errors

## The Solution

```bash
# ✅ CORRECT: Let Docker Compose read .env directly
docker compose up -d

# ✅ IF debugging requires sourcing:
source .env
echo "Debug: $SOME_VAR"
unset SOME_VAR  # CRITICAL: Clean up immediately!
```

## Quick Reference

### Before Starting Services
```bash
# Verify no shell contamination
env | grep NEXT_PUBLIC  # Should be empty
docker compose config | grep NEXT_PUBLIC_SUPABASE_URL  # Should match .env
```

### After .env Changes
```bash
# 1. Unset shell variables
unset NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY

# 2. Recreate affected containers
docker compose stop frontend
docker compose rm -f -v frontend
docker compose up -d frontend

# 3. Hard refresh browser (Ctrl+Shift+R)
```

### Use 127.0.0.1 for Browser URLs
```bash
# ✅ CORRECT: Avoids IPv4/IPv6 issues
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321

# ❌ WRONG: May fail on Windows/WSL2
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
```

## See SKILL.md for Complete Documentation

Detailed explanations, verification checklists, and troubleshooting for:
- Environment variable precedence
- Next.js NEXT_PUBLIC_* caching
- Browser cache issues
- IPv4/IPv6 resolution problems
- Common error patterns and solutions
