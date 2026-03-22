---
name: docker-compose
description: Best practices for managing Docker Compose environments and avoiding common configuration pitfalls.
license: MIT
---

# Docker Compose Best Practices

## Key Point

**Never source `.env` files into your shell** - let Docker Compose read them directly. Shell environment variables take precedence over `.env` files, causing hard-to-debug configuration mismatches.

```bash
# DON'T DO THIS
source .env
docker compose up -d

# DO THIS
docker compose up -d
```

**Docker Compose Variable Resolution Order:**
1. Shell environment (highest priority)
2. `.env` file in project root
3. Environment section in `docker-compose.yml`
4. Defaults

If you must source for debugging, immediately unset all variables afterward to prevent contamination.
