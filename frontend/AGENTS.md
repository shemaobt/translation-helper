# Frontend Agent Guidelines (translation-helper)

This file defines **frontend-specific** conventions for LLM agents working in `frontend/`. It extends the repository-wide [AGENTS.md](../AGENTS.md): follow those global guidelines first, then apply what is below.

---

## 1. Stack and Build

- **Framework**: React 18
- **Language**: TypeScript
- **Build / dev**: Vite
- **Styling**: **Tailwind CSS** only (no CSS-in-JS, no styled-components, no SASS unless already present)
- **UI primitives**: shadcn/ui (Radix UI components in `src/components/ui/`)
- **State / data fetching**: **TanStack React Query** for server state and data fetching
- **Routing**: **Wouter** (lightweight router)
- **Forms**: React Hook Form + Zod validation
- **HTTP**: fetch API (via React Query mutations/queries)
- **Icons**: lucide-react
- **Toasts**: sonner
- **Animations**: Framer Motion
- **Charts**: Recharts
- **Utilities**: clsx, tailwind-merge; use `cn()` from `src/lib/utils.ts` for merging class names

Use only these stack choices. Do not introduce Redux, MobX, or other state libraries; do not add a second styling system.

---

## 2. Project Structure

```
frontend/src/
├── App.tsx
├── main.tsx
├── components/
│   ├── ui/           # shadcn/ui primitives (Button, Card, Input, Dialog, etc.)
│   ├── chat/         # Chat feature components (WelcomeScreen, ChatHeader, MessageInput, etc.)
│   ├── admin/        # Admin feature components (UserFilters, UserCard, FeedbackCard, etc.)
│   ├── profile/      # Profile feature components (ProfilePictureCard, ChangePasswordCard, etc.)
│   ├── sidebar/      # Sidebar feature components (SidebarHeader, ChatList, UserMenu, etc.)
│   └── ...           # other feature components (message, feedback-form, etc.)
├── pages/            # page components (home, login, admin, etc.)
├── hooks/            # custom React hooks (useAuth, useSpeechSynthesis, etc.)
├── lib/              # utilities, config, API client setup
├── types/            # TypeScript type definitions (error types, API types)
└── index.css         # Tailwind CSS entry point
```

- **components/**  
  Use **functional components** only. No class components. Prefer small, reusable components; avoid huge single-file pages.

### Component size and modularization

- **Target size**: Individual component files should generally be **under 300 lines**. If a component exceeds 400 lines, it almost certainly needs to be broken down.
- **Modularize by responsibility**: Split large components into smaller, focused sub-components. Each component should have a single responsibility.
- **Extract reusable patterns**: If a UI pattern appears more than once, extract it into a reusable component in `components/`.
- **Co-locate related components**: Sub-components that are only used by one parent can live in the same folder.
- **Avoid unnecessary breaking**: Don't split a component just to hit a line count. Split when there is a clear separation of concerns, reusability potential, or when the component becomes hard to read/maintain.
- **Keep state close**: Sub-components should receive data via props. Lift state only when necessary for sharing between siblings.

**Signs a component needs splitting:**

- More than 400 lines
- Multiple large JSX blocks that could be named components
- Many useState hooks managing unrelated state
- Helper functions that are only used for one section of the UI
- Hard to understand the component's main purpose at a glance

**Examples:**

- ✅ **Good:** `TranslationPage/index.tsx` (main logic ~200 lines) + `TranscriptionPanel.tsx` + `TranslationOutput.tsx` + `AgentSelector.tsx`
- ❌ **Bad:** Single 1000+ line file with all logic, all JSX, and all helpers mixed together.
- ✅ **Good:** Extract `AgentCard` that receives `agent`, `isSelected`, `onSelect` as props and renders one card.
- ❌ **Bad:** Inline 50+ lines of JSX for each agent inside a `.map()` in the parent component.
- ✅ **Good:** Reusable `ConfirmDialog` in `components/` used across multiple pages.
- ❌ **Bad:** Copy-pasting dialog markup in every component that needs a confirmation modal.

- **Modularize**: Split large components into smaller ones. Reuse primitives from `components/ui/` (Button, Card, Input, Dialog, Select, etc.). Do not duplicate UI patterns that already exist in `ui/`.

- **pages/**  
  Full-page views (e.g. HomePage, LoginPage, AdminPage). Compose from components and ui primitives.

---

## 3. Styling and Tailwind

- **Use Tailwind only** for layout, spacing, colors, typography, and responsive behavior.
- **Avoid inline styles** for things Tailwind can do (e.g. `className="flex items-center gap-2"` instead of `style={{ display: 'flex', alignItems: 'center' }}`). Use inline `style` only when necessary (e.g. dynamic values, third-party integration).
- **Use the design tokens** from `tailwind.config.ts` and shadcn/ui theme. Do not introduce arbitrary hex values in JSX; extend the theme if new tokens are needed.

### Class merging

- **Always use `cn()`** from `src/lib/utils.ts` when combining conditional or overridden classes (e.g. `cn('base-class', className)`).
- Use `cva` (class-variance-authority) for variant-based components (see `components/ui/button.tsx`).
- **No raw HTML for layout**: Prefer React components and Tailwind classes. Do not rely on hand-written HTML/CSS files for app layout or styling.

**Examples:**

- ✅ **Good:** `<div className={cn("flex items-center gap-2", isActive && "bg-primary")}>` — uses cn for conditional classes
- ❌ **Bad:** `<div className="flex items-center gap-2" style={{ backgroundColor: isActive ? '#3b82f6' : undefined }}>` — mixing Tailwind with inline styles
- ✅ **Good:** `<Button variant="outline" size="sm">` — using shadcn/ui button variants
- ❌ **Bad:** `<button className="border border-gray-300 px-3 py-1 rounded">` — recreating button styles instead of using Button component

---

## 4. State Management

### TanStack React Query for server state

- **Use React Query** for all server state: fetching data, caching, mutations, invalidation.
- Define queries with `useQuery` and mutations with `useMutation`.
- Use query keys consistently for cache management.
- Invalidate related queries after mutations.

**Examples:**

- ✅ **Good:** `const { data, isLoading } = useQuery({ queryKey: ['translations'], queryFn: fetchTranslations })`
- ❌ **Bad:** `const [translations, setTranslations] = useState([]); useEffect(() => { fetch('/api/translations').then(...) }, [])` — use React Query instead
- ✅ **Good:** `const mutation = useMutation({ mutationFn: createTranslation, onSuccess: () => queryClient.invalidateQueries(['translations']) })`
- ❌ **Bad:** Manual state updates after API calls; let React Query handle cache invalidation

### Local state for UI

- **Use `useState`** for component-local UI state (e.g. form fields, modals, toggles).
- Do not lift state to React Query or context unless it is shared across routes or components.

**Examples:**

- ✅ **Good:** `const [isOpen, setIsOpen] = useState(false)` for a modal toggle
- ❌ **Bad:** Using React Query for a modal's open state
- ✅ **Good:** Form state with React Hook Form: `const { register, handleSubmit } = useForm()`
- ❌ **Bad:** Passing modal state through multiple component layers when it's only used locally

### Context for global UI state

- **Use React Context sparingly** for truly global UI state that needs to be accessed across many components (e.g. theme, sidebar collapse).
- Do not use Context for server data; use React Query for that.

---

## 5. API and Data

- **Use React Query** for all API calls. Define query functions that call the backend API.
- **Fetch API**: Use native `fetch` for HTTP requests within query/mutation functions.
- **Types**: Use types from `@shared/schema` (Zod-inferred types). Keep request/response types aligned with the backend.
- **Error handling**: React Query handles loading/error states. Use `isLoading`, `isError`, `error` from query results.

**Examples:**

- ✅ **Good:** 
  ```typescript
  const fetchTranslations = async (): Promise<Translation[]> => {
    const res = await fetch('/api/translations');
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
  };
  const { data } = useQuery({ queryKey: ['translations'], queryFn: fetchTranslations });
  ```
- ❌ **Bad:** Creating multiple fetch utilities or axios instances; use native fetch with React Query.
- ✅ **Good:** Import types from `@shared/schema`: `import type { User, Translation } from '@shared/schema'`
- ❌ **Bad:** Duplicating type definitions in frontend when they exist in shared schema.

---

## 6. Routing with Wouter

- **Use Wouter** for frontend routing. It's a lightweight alternative to React Router.
- Define routes in the main App component or a dedicated routes file.
- Use `useLocation` and `useRoute` hooks for navigation and route matching.

**Examples:**

- ✅ **Good:** `<Route path="/login" component={LoginPage} />`
- ✅ **Good:** `const [, setLocation] = useLocation(); setLocation('/dashboard');`
- ❌ **Bad:** Using `window.location` for navigation; use Wouter's hooks
- ❌ **Bad:** Installing react-router when Wouter is already the project's router

---

## 7. Forms and Validation

- **Use React Hook Form** for form state management.
- **Use Zod** for validation with `@hookform/resolvers/zod`.
- Reuse Zod schemas from `@shared/schema` when possible.

**Examples:**

- ✅ **Good:**
  ```typescript
  const form = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: { username: '', email: '' }
  });
  ```
- ❌ **Bad:** Manual form state with multiple `useState` calls and custom validation
- ✅ **Good:** `<Input {...form.register('email')} />` with React Hook Form
- ❌ **Bad:** `<input value={email} onChange={(e) => setEmail(e.target.value)} />` for complex forms

---

## 8. Components and UI

- **Functional components**: Only function components; no class components.
- **UI primitives**: Use and extend components in `components/ui/` (Button, Card, Input, Dialog, Select, etc.). They use Radix + Tailwind + `cva` + `cn`. Match their API (e.g. `variant`, `size`, `className`).
- **Icons**: Use **lucide-react** only. Do not add another icon library.
- **Toasts**: Use **sonner** (`toast.success`, `toast.error`, `toast.warning`, etc.) as in the rest of the app.
- **Animations**: Use **Framer Motion** for animations when needed.

**Examples:**

- ✅ **Good:** `import { Button } from '@/components/ui/button'` then `<Button variant="destructive">Delete</Button>`
- ❌ **Bad:** `<button className="bg-red-500 text-white px-4 py-2">Delete</button>` — use the Button component
- ✅ **Good:** `import { Trash2 } from 'lucide-react'` then `<Trash2 className="h-4 w-4" />`
- ❌ **Bad:** Installing FontAwesome or another icon library
- ✅ **Good:** `toast.success('Translation saved!')` for success feedback
- ❌ **Bad:** Custom alert/modal for every notification; use sonner

---

## 9. Code Style (Frontend-Specific)

- **No comments for "what"**: Code and names should be self-explanatory. Comments only for non-obvious "why" (see root [AGENTS.md](../AGENTS.md)).
- **No module-level comments**: Do not add `/** Module description */` or similar at the top of files. The file name and location convey purpose.
- **TypeScript**: Prefer explicit types for props and for API/store types. Avoid `any` where a proper type exists.
- **File names**: PascalCase for components (e.g. `TranslationPage.tsx`); camelCase for utilities, hooks (e.g. `useAuth.ts`, `utils.ts`).
- **Imports**: Use path aliases (`@/components/...`, `@shared/...`) as configured in `tsconfig.json`.

---

## 10. Summary Checklist (Frontend)

- [ ] Follow root [AGENTS.md](../AGENTS.md) (functional preference, no comments for "what", clean architecture, no commit unless asked, semantic commits).
- [ ] Use only the stack above: React, TypeScript, Vite, Tailwind, TanStack Query, Wouter, React Hook Form, shadcn/ui, lucide-react, sonner.
- [ ] **React**: Functional components only; modularize; reuse `components/ui/` primitives.
- [ ] **Component size**: Keep components under 300 lines; split if over 400 lines. Extract sub-components by responsibility.
- [ ] **Styling**: Tailwind only; use `cn()` from `lib/utils.ts`; avoid inline styles except when necessary.
- [ ] **State**: TanStack React Query for server state; local useState for component UI state; Context sparingly for global UI.
- [ ] **API**: Use React Query with native fetch; import types from `@shared/schema`.
- [ ] **Routing**: Use Wouter for navigation; do not use window.location.
- [ ] **Forms**: Use React Hook Form + Zod for form handling and validation.
- [ ] **Icons**: Use lucide-react only; no other icon libraries.
- [ ] **Toasts**: Use sonner for notifications.
- [ ] No raw HTML/CSS for app layout; no new state or styling libraries.

---

*Frontend-specific guidelines for translation-helper. Extends [AGENTS.md](../AGENTS.md). Built using [agents.md](https://agents.md/).*
