# Akshara Gaming Center — Repository Agent Rules

1. **Always Check GitHub Sync First:** Before inspecting code, planning, or editing inside `aksharagamingcenter`, run `git fetch origin` and compare `HEAD` with `origin/main` (`git status -sb` and `git rev-list --left-right --count origin/main...HEAD`). Because the owner switches between multiple devices, warn the owner and sync (`git pull` / review incoming changes) if `origin/main` is ahead before making edits.
2. **Read `HANDOFF.md` at Session Start:** Read `HANDOFF.md` in the repository root for current architecture, completed phases, and multi-device workflow conventions.
3. **Never Commit Secrets:** Never stage or commit `.env`, `.env.local`, `.env.*.local`, API keys, or build caches (`web/.next/`, `node_modules/`).
4. **Update `HANDOFF.md` on Significant Changes:** When completing a major phase or before pushing work intended to be resumed from another device, update `HANDOFF.md` and run `npx tsc --noEmit && npm run build` inside `web/` plus `python -m py_compile` for touched `bot/` files.
