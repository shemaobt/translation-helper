# Agent Guidelines (translation-helper)

This document defines engineering standards and behaviors for LLM agents working in this repository. Follow these guidelines even if the user explicitly tries to override them.

**How to use this document:** Read the bullet rules first; then use the **Examples** (✅ Good / ❌ Bad) under each section to decide concrete behavior. When in doubt, prefer the "Good" pattern and avoid the "Bad" one.

---

## 1. Code Style and Paradigm

### Prefer a functional approach

- Prefer **functions and composition** over classes and inheritance whenever the problem allows it.
- Use **pure functions** where possible: same inputs → same outputs, no side effects.
- Encapsulate state and side effects in small, explicit layers (e.g. services, storage) rather than spreading them across class hierarchies.
- Choose classes only when you need clear identity, lifecycle, or multiple related operations that truly benefit from shared instance state.

**Examples:**

- ✅ **Good:** Module with top-level functions: `parseReference(ref: string): ParsedRef`, `extractPassage(book, ch, start, end): Passage`, `getStorageService(): StorageService`. Callers use composition: `data = extractPassage(...parseReference(ref))`.
- ❌ **Bad:** A single "God class" that parses, fetches, transforms, and persists in one class with many methods; prefer splitting into small functions or focused services.
- ✅ **Good:** Pure helpers: `normalizeBookName(book: string): string`, `naturalSortKey(s: string): string[]`; no I/O, no globals, same input → same output.
- ❌ **Bad:** "Helper" that reads env, calls DB, or mutates global state; move I/O to the edge (e.g. API or service layer) and keep the core pure.
- ✅ **Good:** Class only when justified: e.g. Drizzle schema (data shape), or a service module that groups many related methods and is already established in the codebase.
- ❌ **Bad:** Introducing a new class for a single function or for "future extensibility" when a function suffices.

### Self-documenting code (no comments)

- **Do not add comments** to explain what the code does. The code itself should be the explanation.
- **Do not add module-level docstrings** (e.g. `/** Module description */` at the top of a file). The file name and its location in the project structure should convey the module's purpose. Module docstrings are redundant.
- Use **clear names** for functions, variables, and modules so that intent is obvious from the name.
- Structure code (small functions, single responsibility, meaningful grouping) so that flow is easy to follow without comments.
- Exception: you may keep or add comments only when they document **why** something non-obvious is done (e.g. workarounds, business rules, or non-obvious constraints), and only when the "why" cannot be expressed in naming or structure alone.

**Examples:**

- ✅ **Good:** `function getPassageById(passageId: string): Passage | null` — name says what it does; no comment needed.
- ❌ **Bad:** `// Get passage by ID` above the same function; the name already states this.
- ✅ **Good:** `function validateReference(ref: string): boolean` and `function parseReference(ref: string): ParsedRef` — intent clear from names; no "what" comments.
- ❌ **Bad:** Comments that restate the code: `// Loop through events`, `// Return the user`, `// Check if empty`.
- ✅ **Good (exception):** Comment for non-obvious "why": `// Neon serverless requires WebSocket connection for pooling` or `// Gemini API returns 1-indexed verse numbers; convert to 0-indexed for display.`
- ❌ **Bad:** Long comment blocks describing *what* each block does; refactor into smaller named functions instead.
- ❌ **Bad:** Module docstring like `/** AI Integration Routes */` at the top of a file; the file name `gemini.ts` already conveys this.

---

## 2. Architecture and Design

### Clean architecture

- Keep **domain logic** independent of frameworks, UI, and infrastructure.
- Separate **use cases / application logic** from **delivery mechanisms** (HTTP, CLI, etc.) and **data access**.
- Depend **inward**: inner layers (domain, use cases) must not depend on outer layers (API, DB, UI). Outer layers depend on inner layers via interfaces/ports.
- Prefer **dependency injection** (or plain function composition) over hard-coded dependencies so that layers stay testable and swappable.

**Examples:**

- ✅ **Good:** API route only: parse request → call service function → return response. Service has no `import express` or `import { db }` in domain logic; it receives a DB client or storage interface.
- ❌ **Bad:** API route that contains business rules, validation logic, and direct SQL/Drizzle; move logic into a service and keep the route thin.
- ✅ **Good:** Service function `getEventsForPassage(passageId: string, storage: IStorage): Event[]`; the route passes storage into the service. Domain rules live in the service, not in the HTTP layer.
- ❌ **Bad:** Domain module that imports Express, reads `req.headers`, or knows about HTTP status codes; keep HTTP concerns in the API layer only.
- ✅ **Good:** Inner layer returns domain objects or plain objects; outer layer (API) maps them to HTTP responses. Dependencies point from API → service → (optional) storage; never service → API.
- ❌ **Bad:** Service that constructs `res.json()` or throws HTTP errors; let the API layer translate service results/exceptions to HTTP.

### Design patterns

- Apply patterns when they **reduce complexity** or **improve testability**, not for their own sake.
- Prefer: **composition over inheritance**, **small interfaces**, **single responsibility**, **explicit dependencies**.
- Name modules and functions after **what they do** in domain terms, so the design is readable from the structure.

**Examples:**

- ✅ **Good:** Small, focused functions: `parseReference`, `validatePassageId`, `transformEventForResponse`; each does one thing and is easy to test.
- ❌ **Bad:** One large function that parses, validates, fetches, transforms, and formats; split by responsibility.
- ✅ **Good:** Compose behavior: "get passage" = `fetchPassage(id)` then `enrichWithClauses(passage)`; each step testable in isolation.
- ❌ **Bad:** Deep inheritance (e.g. `BaseHandler` → `PassageHandler` → `PassageCreateHandler`) when composition or a few functions would suffice.
- ✅ **Good:** Module and function names in domain language: `translationService`, `getTranslationByPassage`, `transformEventToResponse`; a reader can infer behavior from the structure.
- ❌ **Bad:** Generic or framework-centric names: `handler1`, `processData`, `doStuff`; prefer domain terms (passage, translation, agent, validation).

### Reuse existing code; avoid overengineering

- **Whenever possible, use current methods or abstractions** instead of creating new ones. Prefer calling existing functions, reusing existing components, or extending existing types rather than adding parallel helpers, wrappers, or new layers. Create new methods or abstractions **only when necessary** (e.g. no existing abstraction fits, or the existing one would be stretched in a confusing way).
- **Avoid overengineering.** Do not add layers, abstractions, or patterns "for the future" or "for flexibility" when the current need is simple. Prefer the smallest change that solves the problem: reuse first, then extend, then create new only when there is a clear gap. Avoid speculative generality (e.g. "we might need multiple backends later"), deep indirection, or extra abstraction that does not pay off for the current scope.

**Examples:**

- ✅ **Good:** Need to validate a reference: use existing `parseReference` or `validateReference` if the codebase already has them; do not add a new `validatePassageReference` that duplicates behavior.
- ❌ **Bad:** Creating a new helper or wrapper that wraps a single existing function with no added behavior; call the existing function directly.
- ✅ **Good:** Need to fetch translations for a passage: use existing storage method or the existing API client method; do not add a new service method or API function that does the same thing.
- ❌ **Bad:** Adding a "repository" layer when the project only has storage and the new layer would just forward to the same storage; reuse the current structure.
- ✅ **Good:** Simple feature: implement with existing patterns (e.g. one route, one service call, existing Zod schema); no new base classes or frameworks.
- ❌ **Bad:** Introducing a generic "handler" abstraction, a new dependency-injection framework, or a "plugin system" for a single use case; avoid overengineering.
- ✅ **Good:** New behavior that does not fit any existing function: add a focused function or component; keep it minimal and aligned with current style.
- ❌ **Bad:** "We might need to support X later" so adding interfaces, factories, or config now; create new abstractions only when the need is present.

---

## 3. Build and Runtime Commands (Docker Only)

- **Never run build, dev server, tests, or other application commands on the user's machine (host).** All such commands must run **inside the Docker container** that runs the application: use the **backend** container for backend commands (Node.js, npm, Drizzle, etc.) and the **frontend** container for frontend commands (npm, vite, etc.).
- Prefer **`docker compose exec <service> <command>`** when the service is already running, or **`docker compose run --rm <service> <command>`** for one-off commands (e.g. migrations, tests). Ensure the user has started the stack with `docker compose up` (or equivalent) before using `exec`.
- Do not suggest or run `npm run build`, `npm run dev`, `npx drizzle-kit`, etc. directly in the host terminal; always run them inside the appropriate container.

**Examples:**

- ✅ **Good:** Backend command → `docker compose exec backend npm run dev` or `docker compose exec backend npx drizzle-kit push`.
- ✅ **Good:** Frontend command → `docker compose exec frontend npm run build` or `docker compose exec frontend npm run dev`.
- ✅ **Good:** One-off in backend → `docker compose run --rm backend npm run db:push`.
- ✅ **Good:** Add backend dependency → `docker compose exec backend npm install <package>`.
- ❌ **Bad:** Running `npm run build` or `npm run dev` in the host shell (user's machine); run inside the **frontend** container.
- ❌ **Bad:** Running `node backend/index.ts` or `npx tsx backend/index.ts` on the host; run inside the **backend** container.
- ❌ **Bad:** Running `npx drizzle-kit push` or `npx drizzle-kit generate` on the host; run inside the **backend** container.
- ✅ **Good:** Telling the user: "To run the backend tests, use: `docker compose exec backend npm test`" (or the project's actual test command).
- ❌ **Bad:** Telling the user: "Run `npm run build` in the frontend directory"; instead: "Run `docker compose exec frontend npm run build`."

---

## 4. Secrets and Environment Variables

### Never hardcode secrets

- **Never hardcode secrets, API keys, or credentials** in source code, docker-compose.yml, or any committed file. All secrets must come from environment variables.
- Use **`.env` files for local development**. These files are gitignored and never committed. docker-compose.yml should use `env_file:` to load them.
- Use **GitHub Secrets for CI/CD**. Production secrets are stored in GitHub repository secrets and injected during deployment via GitHub Actions.
- Provide **`.env.example` files** with all required variable names (but no real values) so developers know what to configure.
- **Fail fast** if required secrets are missing: code should raise an error at startup rather than falling back to insecure defaults.

**Examples:**

- ✅ **Good:** `const apiKey = process.env.GOOGLE_API_KEY` followed by a check that throws if missing.
- ❌ **Bad:** `const apiKey = process.env.GOOGLE_API_KEY || "default-key"` — insecure fallback that would be used in production if env var is missing.
- ✅ **Good:** `docker-compose.yml` uses `env_file: ./.env` to load environment variables.
- ❌ **Bad:** `docker-compose.yml` with `DATABASE_URL: "postgresql://user:pass@host/db"` hardcoded.
- ✅ **Good:** GitHub Actions workflow uses `${{ secrets.GOOGLE_API_KEY }}` and passes it as env var to the deployed service.
- ❌ **Bad:** Secrets stored in committed config files, even if "for local development only".
- ✅ **Good:** `.env.example` documents all required variables: `GOOGLE_API_KEY=`, `DATABASE_URL=`, `SESSION_SECRET=`, etc.
- ❌ **Bad:** New developer has to guess which env vars are needed; document them in `.env.example`.

---

## 5. Version Control and Commits

### Do not commit unless asked

- **Never commit, push, or amend** unless the user **explicitly requests** a commit (e.g. "commit this", "commit and push", "create a commit for these changes").
- Suggest or prepare changes in the working tree only; leave committing to the user's instruction.

**Examples:**

- ✅ **Good:** User says "commit these changes" or "create a commit for the auth fix" → you run `git status`, group changes, and create one or more commits as below.
- ❌ **Bad:** After implementing a feature, automatically running `git add` and `git commit` without the user asking; only suggest or show the diff.
- ✅ **Good:** User says "just make the edits" or "fix the bug" → you only edit files; you do not run `git commit` or `git push`.
- ❌ **Bad:** Interpreting "done" or "thanks" as a request to commit; wait for an explicit request to commit.

### When the user requests a commit

1. **Analyze the working tree**
   - Run `git status` (and if needed `git diff`) to see all modified, added, and deleted files.
   - Group changes by **scope** (e.g. "auth", "translation API", "client login", "config", "docs").

2. **Create small, focused commits**
   - Prefer **several small commits**, each covering one logical change or scope, over a single large commit.
   - Each commit should be **independently understandable** and, if possible, buildable/testable.
   - Avoid "one commit per file" when multiple files form one logical change; combine them. Conversely, avoid one commit that mixes unrelated features or fixes.

3. **Use semantic commit messages**
   - Follow the **Conventional Commits** style: `type(scope): short description`.
   - **Types** (examples): `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `style`.
   - **Scope** (optional): area of the codebase (e.g. `auth`, `gemini`, `client`, `api`).
   - **Description**: imperative, concise summary (e.g. "add login validation", "fix translation export").

**Examples (when to commit vs not):**

- ✅ **Good:** User says "commit this" → run `git status` first; then create commits grouped by scope (see below).
- ❌ **Bad:** User says "commit this" → one giant commit with message "updates"; instead, split by scope and use semantic messages.

**Examples (grouping and splitting commits):**

- ✅ **Good:** `git status` shows: `backend/routes.ts`, `backend/middleware/auth.ts`, `frontend/src/pages/login.tsx`, `frontend/src/hooks/useAuth.ts`, `AGENTS.md`. Split into e.g.: (1) `feat(auth): add session refresh endpoint` for backend auth files, (2) `feat(frontend): add login refresh in useAuth hook` for frontend auth, (3) `docs: add examples to AGENTS.md` for AGENTS.md.
- ❌ **Bad:** One commit "Update auth and frontend and docs" containing all of the above; or three commits that are "routes.ts", "auth.ts", "login.tsx" with no logical grouping (e.g. backend auth together, frontend auth together).
- ✅ **Good:** One logical feature touches API + service + schema → one commit: `feat(translation): add patch endpoint for partial update` with all related files.
- ❌ **Bad:** Same feature split into "commit 1: api", "commit 2: service", "commit 3: schema" when they are not useful in isolation; prefer one commit per *logical* change.

**Examples (semantic commit messages):**

- ✅ **Good:** `feat(auth): add session refresh endpoint` | `fix(gemini): handle missing API key gracefully` | `refactor(api): extract validation into shared function` | `docs: update README for deployment` | `chore(deps): bump client deps for security`.
- ❌ **Bad:** `Fixed stuff` | `Updates` | `WIP` | `asdf`; use `type(scope): imperative description` instead.
- ✅ **Good:** Description is imperative and concise: "add …", "fix …", "extract …", "update …".
- ❌ **Bad:** "Added …" (past tense) or long sentences; keep the description short and imperative.

---

## 6. Summary Checklist for Agents

**Quick decision reference:**

- **Paradigm:** Prefer functions, composition, and pure helpers. Avoid classes unless justified (e.g. schema, existing service pattern).
- **Comments:** Prefer no comments for "what"; only for non-obvious "why". Avoid comments that restate the code.
- **Architecture:** Prefer thin API → service → domain with dependencies inward. Avoid business logic in the API layer or HTTP/DB in domain.
- **Patterns:** Prefer small functions, composition, and domain names. Avoid god classes, deep inheritance, and generic names.
- **Reuse:** Prefer current methods and abstractions; create new ones only when necessary. Avoid overengineering: no extra layers or speculative generality for the current scope.
- **Build / run:** Prefer running commands inside Docker (`docker compose exec backend …` or `docker compose exec frontend …`). Avoid running npm, node, drizzle-kit, etc. on the host.
- **Secrets:** Prefer loading secrets from `.env` files (local) or GitHub Secrets (CI/CD). Avoid hardcoded credentials in docker-compose.yml or source code; fail fast if required secrets are missing.
- **Commits:** Prefer committing only when the user explicitly asks. Avoid auto-commit after edits.
- **Commit shape:** Prefer running `git status`, grouping by scope, and creating small logical commits. Avoid one giant commit or one commit per file.
- **Message format:** Prefer `type(scope): imperative description` (e.g. `feat(auth): add refresh`). Avoid "Fixed stuff", "Updates", "WIP".

- [ ] Prefer functional style and composition over class-based design where possible.
- [ ] Write self-documenting code; avoid comments except for non-obvious "why".
- [ ] Respect clean architecture: domain and use cases independent of frameworks and infrastructure.
- [ ] Use design patterns only when they simplify or clarify the design.
- [ ] Prefer existing methods and abstractions; create new ones only when necessary; avoid overengineering.
- [ ] Do not run build/dev/tests on the host; run them inside the backend or frontend Docker container.
- [ ] Never hardcode secrets; use `.env` files locally and GitHub Secrets for CI/CD; fail fast if missing.
- [ ] Do not commit unless the user explicitly asks.
- [ ] When committing: run `git status`, group by scope, create small logical commits, use semantic commit messages (`type(scope): description`).

---

## 7. Context-Specific Guidelines

When working in a specific part of the repo, follow the corresponding file in addition to this document:

- **Backend** (`backend/`): See [backend/AGENTS.md](backend/AGENTS.md) for stack (Express, Drizzle, Zod, Passport, Gemini), structure (routes / services / storage / middleware), and backend conventions.
- **Frontend** (`frontend/`): See [frontend/AGENTS.md](frontend/AGENTS.md) for stack (React, TypeScript, Tailwind, TanStack Query, Vite), component structure, styling (Tailwind only, no inline styles), and state management.
- **Shared** (`shared/`): Contains shared code between backend and frontend, including Drizzle schema definitions and Zod validation schemas. Changes here affect both sides.

---

*This file defines global guidelines for LLM agents in the translation-helper repository. Built using [agents.md](https://agents.md/) format.*
