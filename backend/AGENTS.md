# Backend Agent Guidelines (translation-helper)

This file defines **backend-specific** conventions for LLM agents working in `backend/`. It extends the repository-wide [AGENTS.md](../AGENTS.md): follow those global guidelines first, then apply what is below.

**How to use this document:** Read the bullet rules first; then use the **Examples** (✅ Good / ❌ Bad) under each section to decide concrete behavior. When in doubt, prefer the "Good" pattern and avoid the "Bad" one.

---

## 1. Stack and Runtime

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Package manager**: npm — all dependency management via `package.json` and `package-lock.json`
- **Database**: PostgreSQL via **Neon** (serverless) with **Drizzle ORM**
- **Validation / schemas**: Zod (shared with frontend in `shared/schema.ts`)
- **Auth**: Passport.js (local strategy), bcryptjs for passwords
- **Session**: PostgreSQL-backed sessions (connect-pg-simple) with MemoryStore fallback
- **AI/LLM**: Google Gemini API (gemini-2.0-flash) for translation, transcription, and agent prompts
- **Other**: Multer for file uploads, express-rate-limit for rate limiting, ws for WebSocket (Neon)

Use only these stack choices. Do not introduce a different ORM, web framework, or auth library.

### Package management with npm

- **Add dependencies**: `npm install <package>` — adds to `package.json` and updates `package-lock.json`
- **Add dev dependencies**: `npm install --save-dev <package>`
- **Install all**: `npm install` — installs all dependencies from lockfile
- **Run scripts**: `npm run <script>` — runs script defined in package.json

**Examples:**

- ✅ **Good:** `npm install zod` to add a new dependency
- ❌ **Bad:** Manually editing `package.json` without running `npm install`
- ✅ **Good:** `npm run dev` to start the development server
- ❌ **Bad:** `yarn add` or `pnpm install` — use npm for all dependency management

---

## 2. Project Structure

```
backend/
├── index.ts          # Entry point, Express app setup, middleware registration
├── routes/           # Route definitions (organized by domain)
│   ├── index.ts      # Aggregates all routers and exports single router
│   ├── auth.ts       # Auth endpoints (signup, login, logout, user)
│   ├── users.ts      # User profile endpoints
│   ├── chats.ts      # Chat and message endpoints
│   ├── apiKeys.ts    # API key management endpoints
│   ├── audio.ts      # Audio processing endpoints (transcribe, speak)
│   ├── public.ts     # Public API endpoints
│   └── admin.ts      # Admin endpoints
├── services/         # Business logic services
│   ├── index.ts      # Service exports
│   ├── authService.ts    # Authentication business logic
│   ├── chatService.ts    # Chat/message business logic
│   └── userService.ts    # User profile business logic
├── middleware/       # Express middleware
│   ├── auth.ts           # Session-based authentication
│   ├── apiKeyAuth.ts     # API key authentication
│   └── index.ts          # Middleware exports
├── types/            # TypeScript type definitions
│   ├── express.d.ts      # Express request/session augmentation
│   └── index.ts          # Type exports
├── gemini.ts         # AI integration (Gemini API client, streaming)
├── prompts.ts        # Agent prompt definitions (Storyteller, Conversation Partner, etc.)
├── storage.ts        # Database layer (Drizzle queries, IStorage interface)
├── db.ts             # Database connection (Neon serverless)
└── config/           # Configuration (environment, settings)
    └── index.ts      # Centralized config with validation
```

### Shared schemas

- **shared/schema.ts** contains both **Drizzle ORM schema** (table definitions) and **Zod validation schemas** (insertSchema, selectSchema).
- When adding new tables or validation, edit `shared/schema.ts` so both backend and frontend can use the types.
- Do not duplicate schema definitions between backend and frontend.

### Routes layer: access only, no logic

- **Route files in `routes/`** are **only an access layer** for the frontend. They must **never** contain business logic, validation rules beyond Zod parsing, or complex data access. Every endpoint must **only** parse the request, validate with Zod, **call the appropriate service or storage function**, and return the response (or translate exceptions to HTTP).
- Routes are organized by domain: `auth.ts` (authentication), `users.ts` (user profile), `chats.ts` (conversations), `admin.ts` (admin operations), etc.
- The `routes/index.ts` aggregates all domain routers and exports a single `registerRoutes` function.
- Do not put Drizzle calls, business rules, or branching logic in the routes layer. If an endpoint needs more than "call service and return", move that behavior into a service and keep the route thin.
- Route files exist only to expose backend capabilities to the frontend over HTTP; the service/storage layer represents and implements each capability.

**Examples:**

- ✅ **Good:** Route handler: get path/query params → validate body with Zod → `const result = await storage.getByPassage(passageId)` → `res.json(result)` (or handle error with proper status).
- ❌ **Bad:** Route that contains `await db.select().from(translations).where(...)`, `if (!user) { ... }`, or any business rule; move all of that into storage/service and call it from the route.
- ✅ **Good:** `router.get("/:id", async (req, res) => { const result = await storage.getTranslation(req.params.id); res.json(result); })`; no logic in the route.
- ❌ **Bad:** Route that builds response objects, loops over relations, or checks permissions beyond `req.isAuthenticated()`; put that in a service.
- ✅ **Good:** Route files only import from `storage`, `services`, `middleware`, and `shared/schema`; they do not implement domain or data logic.
- ❌ **Bad:** Route file that imports `db` and performs raw queries; the routes layer must not talk to the database directly.
- ✅ **Good:** Adding a new domain? Create `routes/newDomain.ts`, add the router to `routes/index.ts`.
- ❌ **Bad:** Putting all new routes into a single file; organize by domain for maintainability.

### AI layer: Gemini client and prompts

- **gemini.ts** is the **centralized location for Gemini API integration**. All LLM calls must go through this module. It provides:
  - Text generation with streaming (Server-Sent Events)
  - Audio transcription (speech-to-text)
  - Structured output with JSON parsing
- **prompts.ts** contains agent prompt definitions organized by purpose: Storyteller, Conversation Partner, Oral Performer, OBT Health Assessor, Back Translation Checker.
- Services import from `gemini.ts` and `prompts.ts` rather than calling the Gemini SDK directly.

**Examples:**

- ✅ **Good:** `import { generateTranslation } from './gemini'` in a service
- ❌ **Bad:** `import { GoogleGenerativeAI } from '@google/generative-ai'` and creating client instances in multiple files.
- ✅ **Good:** `const result = await generateWithStreaming(prompt, agentConfig)`
- ❌ **Bad:** Creating Gemini client instances manually in each route handler.
- ✅ **Good:** Adding a new agent prompt? Add to `prompts.ts` and export the configuration.
- ❌ **Bad:** Defining prompts inline in route handlers or duplicating prompt logic.

### Storage and services

- **storage.ts**  
  Data access layer. Implements the `IStorage` interface with Drizzle ORM queries. All database operations go through this module. Prefer **functional style** with exported functions.

- **services/**  
  Business logic that goes beyond simple CRUD. Can call storage functions and the AI layer. Keep services small and focused on a single domain.

- **config/**  
  Environment configuration. Use `process.env` with validation at startup. Do not scatter `process.env` calls throughout the codebase.

- **middleware/**  
  Express middleware for auth, session, rate limiting, etc. Keep middleware focused and reusable.

Do not add new top-level layers (e.g. "repositories" or "use_cases") unless the repository has already adopted them; keep the existing layering.

---

## 3. API Conventions

- **Routes**: Define all routes in `routes.ts` with consistent prefixes (e.g. `/api/...`). Group related endpoints together.
- **Auth**: Use `req.isAuthenticated()` for protected routes (Passport.js). Use the same middleware/helpers as in existing auth setup; do not add a second auth mechanism.
- **Errors**: Return appropriate HTTP status codes with JSON error responses. Do not return error payloads from services; let the routes layer translate exceptions to HTTP.
- **IDs**: Use integer IDs as in the current Drizzle schema; keep path params and request bodies consistent with existing APIs.

**Examples:**

- ✅ **Good:** Protected route: `if (!req.isAuthenticated()) { return res.status(401).json({ error: "Unauthorized" }); }` then `const result = await storage.create(data); res.json(result)`.
- ❌ **Bad:** Route that checks `req.user.roles` with complex logic; move permission logic into a service or middleware.
- ✅ **Good:** On storage error: `try { return res.json(await storage.get(id)); } catch (e) { return res.status(404).json({ error: "Not found" }); }`.
- ❌ **Bad:** Storage that returns `{ error: "..." }`; storage should throw or return domain data; the routes layer turns failures into HTTP.

### Validation with Zod

- **Use Zod schemas from `shared/schema.ts`** for request validation.
- Parse request bodies at the start of route handlers.
- Return 400 with validation errors if parsing fails.

**Examples:**

- ✅ **Good:** `const parsed = insertUserSchema.safeParse(req.body); if (!parsed.success) { return res.status(400).json({ error: parsed.error }); }`
- ❌ **Bad:** Manual validation with if/else chains; use Zod schemas.
- ✅ **Good:** Reuse existing schemas from `shared/schema.ts`.
- ❌ **Bad:** Defining duplicate validation logic in routes.

---

## 4. Database and Drizzle

- **Connection**: Use the Neon serverless client from `db.ts`. Do not create additional database connections.
- **Queries**: Use Drizzle ORM query builder (`db.select()`, `db.insert()`, etc.). Prefer the query builder over raw SQL.
- **Migrations**: Use `npx drizzle-kit push` to sync schema changes to the database. For production, use `npx drizzle-kit generate` and `npx drizzle-kit migrate`.
- **Schema changes**: Edit `shared/schema.ts` for schema changes. After editing, run `npx drizzle-kit push` (dev) or generate a migration (prod).

**Examples:**

- ✅ **Good:** In storage: `const result = await db.select().from(users).where(eq(users.id, id))`
- ❌ **Bad:** Creating a new database connection in a service; use the shared `db` from `db.ts`.
- ✅ **Good:** All Drizzle calls in storage layer: `await db.insert(translations).values(data)`
- ❌ **Bad:** Drizzle calls in route handlers; put them in storage.
- ✅ **Good:** After adding a field to `shared/schema.ts`, run `npx drizzle-kit push` to update the database.
- ❌ **Bad:** Editing the database schema manually without updating `shared/schema.ts`.

---

## 5. Code Style (Server-Specific)

### Prefer async operations; use a clear async structure

- **Whenever possible, use async operations** in the server to avoid blocking. Request handlers, service functions that do I/O (database, HTTP, file), and any code that waits on external resources should be `async` and use `await` for I/O. This keeps the event loop free and handles concurrent requests better.
- **Use a consistent async structure:** Route handlers are `async`; they `await` service/storage calls. Storage functions that perform I/O (Drizzle, HTTP) are `async` and `await` those operations. Do not mix sync blocking calls in async handlers; use async equivalents so that the server does not block under load.

**Examples:**

- ✅ **Good:** Route `app.get("/api/translations", async (req, res) => { const result = await storage.getAll(); res.json(result); })`; storage `async function getAll() { return await db.select().from(translations); }`; all I/O is awaited.
- ❌ **Bad:** Route or storage that uses sync file operations (`fs.readFileSync`) inside an async handler; use async versions (`fs.promises.readFile`).
- ✅ **Good:** All Drizzle calls use `await db.*`; all HTTP calls to external APIs use `await fetch(...)`.
- ❌ **Bad:** Sync operations in an async handler; blocks the event loop and hurts concurrency.

### Strong typing

- **The server must be strongly typed.** Use TypeScript types on all public functions (parameters and return type). Use Zod for all request validation and Drizzle-generated types for database operations. Avoid `any` unless necessary (e.g. third-party integration with unknown types).
- Prefer explicit types for storage/service function returns (e.g. `Promise<User[]>`, `Promise<Translation | null>`, or Zod-inferred types) so that callers and the routes layer know the contract.
- **Do not use `object` or untyped objects for data.** When a structure has a known shape (request body, response body, internal DTO), use a **proper type**: a Zod schema inference, a Drizzle type, or an interface. Use generic `object` only when the structure is truly dynamic.

**Examples:**

- ✅ **Good:** `async function getById(id: number): Promise<User | null>` with a clear return type; request body validated with Zod.
- ❌ **Bad:** `function getById(id)` with no types; or return type `any` when a concrete type is possible.
- ✅ **Good:** Route handler receives validated data from Zod and returns typed response; storage functions declare return types.
- ❌ **Bad:** Routes or storage that take `object` or `any` for request/response when a Zod/Drizzle type exists.
- ✅ **Good:** Storage returns `User[]` or `InferSelectModel<typeof users>`; internal helper returns typed object.
- ❌ **Bad:** `function createUser(data: object): Promise<object>`; use proper types from Zod or Drizzle.

### Avoid unnecessary type checks; rely on Zod

- **Do not add redundant runtime type checks** when the type is already guaranteed by the stack. When you validate with Zod schemas, the library already validates and coerces types; duplicating that with manual `typeof` or `if (!data.field)` checks is unnecessary.
- **Rely on:** Zod for request bodies (validation and parsing happen explicitly); TypeScript for static checking; Drizzle for database types. Only add runtime type checks when actually needed (e.g. data from external source not validated by Zod).

**Examples:**

- ✅ **Good:** Body validated with `insertUserSchema.parse(req.body)`; service receives typed data. No `if (typeof data.email !== 'string')` needed.
- ❌ **Bad:** After parsing with Zod, adding `if (!data.email || typeof data.email !== 'string')` checks; Zod already ensured the type.
- ✅ **Good:** Runtime check only when necessary: e.g. parsing raw JSON from an external API that hasn't gone through Zod; then validate once with Zod and use the validated object.
- ❌ **Bad:** Defensive `typeof` at every layer for values that came from a Zod parse; trust the layer that already validated.

### Configuration management

- **Use centralized configuration** for all environment variables: API keys, database URLs, and other configuration must be defined in `config/` and accessed via exported functions/objects. Do not use `process.env.*` directly in routes or services.
- **Validate at startup**: Required configuration should be validated when the app starts. Optional configuration can have undefined defaults.
- **Import config, not process.env**: Services should import from config module and access typed configuration.

**Examples:**

- ✅ **Good:** `import { config } from './config'; const apiKey = config.googleApiKey;`
- ❌ **Bad:** `const apiKey = process.env.GOOGLE_API_KEY` scattered throughout services.
- ✅ **Good:** All API keys defined once in config module.
- ❌ **Bad:** Multiple `process.env.*` calls for the same variable in different files.
- ✅ **Good:** Config validated at startup; missing required config fails fast with clear error.
- ❌ **Bad:** `apiKey || process.env.GOOGLE_API_KEY` pattern that defers validation until runtime.

### Other style

- **Functional preference**: Prefer functions and composition. Use classes only when they match existing patterns or provide clear benefits.
- **No inline comments for "what"**: Code and names should be self-explanatory. Inline comments only for non-obvious "why" (see root [AGENTS.md](../AGENTS.md)).
- **No module-level comments**: Do not add `/** Module description */` at the top of files. The file name and location convey purpose.
- **Naming**: Use `camelCase` for TypeScript. Match Drizzle field names in the schema.
- **Error handling**: Use try/catch for async operations. Return appropriate HTTP status codes. Log errors for debugging.

---

## 6. Summary Checklist (Backend)

**Quick decision reference:**

- **Routes layer:** Prefer only access: parse request → validate with Zod → call storage/service → return response. Avoid any logic, Drizzle, or business rules in routes; routes are only an access layer for the frontend.
- **Stack:** Prefer only Express, Drizzle, Zod, Passport, existing patterns. Avoid a different ORM, framework, or auth library.
- **Layering:** Prefer thin routes and logic in storage/services. Avoid putting logic or DB access in the routes layer.
- **Database:** Prefer shared `db` from `db.ts`, Drizzle query builder, schema in `shared/schema.ts`. After every schema change, run drizzle-kit push/migrate. Avoid extra DB connections or schema changes without updating shared schema.
- **Async:** Prefer async operations everywhere (async functions, await for I/O); use a clear async structure so the backend does not block. Avoid sync I/O in request handlers.
- **Typing:** Prefer strong typing: TypeScript types on all public functions, Zod for validation. Avoid `any` or untyped signatures when a concrete type is possible.
- **No generic object:** Avoid `object` or untyped objects for data; create proper types from Zod/Drizzle whenever the structure is known.
- **Type checks:** Prefer relying on Zod to validate types; avoid unnecessary `typeof` or manual checks for values that already passed through Zod.
- **Config:** Prefer centralized config module; avoid `process.env.*` scattered in routes/services.

- [ ] Follow root [AGENTS.md](../AGENTS.md) (functional preference, no "what" comments, clean architecture, no commit unless asked, semantic commits, build/run in Docker).
- [ ] Use only the stack above: Express, Drizzle, Zod, Passport, existing auth.
- [ ] Keep routes as access only: no logic, no Drizzle; only call storage/service that represents the operation.
- [ ] Put all business logic and data access in storage/services.
- [ ] Use shared `db` from `db.ts` and Drizzle query builder; one database connection.
- [ ] Schema changes go in `shared/schema.ts`; run drizzle-kit push/migrate after changes.
- [ ] Prefer async operations throughout (async/await for I/O); avoid sync I/O in request handlers.
- [ ] Keep the backend strongly typed: TypeScript types on all public functions, Zod for validation; avoid `any` when a concrete type is possible.
- [ ] Do not use `object` for data; create proper types from Zod/Drizzle whenever the structure is known.
- [ ] Avoid unnecessary type checks: rely on Zod to validate; do not add redundant `typeof` checks.
- [ ] Use centralized config module for environment variables; do not use `process.env.*` in routes/services.
- [ ] Register new routes in the appropriate domain file under `routes/`; add new domain routers to `routes/index.ts`.

---

*Backend-specific guidelines for translation-helper. Extends [AGENTS.md](../AGENTS.md). Built using [agents.md](https://agents.md/).*
