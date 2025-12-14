# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Package Management**: This project uses **bun** as the package manager
- **Install dependencies**: `bun install` - Install project dependencies
- **Add dependency**: `bun add <package>` - Add new dependency
- **Add dev dependency**: `bun add -d <package>` - Add development dependency
- **Development**: `bun run dev` - Start development server
- **Build**: `bun run build` - Build the project
- **Format/Lint**: `bun run lint` - Run Biome formatter with auto-fix
- **Preview**: `bun run preview` - Preview production build locally

## Architecture Overview

This is a modern React 19 application using TypeScript with the following key architectural patterns:

### Tech Stack
- **React 19** with React Compiler enabled for performance optimization
- **TanStack Router** for file-based routing with automatic code splitting
- **TanStack Query** for server state management
- **Tailwind CSS v4** with shadcn/ui components (New York style)
- **Zod** for runtime type validation
- **Biome** for code formatting (uses tabs, single quotes)
- **i18next** with react-i18next for internationalization (Russian/English)
- **Bun** as package manager for fast dependency management

### Directory Structure

**`src/app/`** - Global application configuration and providers
- Contains ContextHole for centralized provider management
- Global providers like QueryClient, Auth context

**`src/routes/`** - File-based routing system
- Uses `createFileRoute` from TanStack Router
- Route files automatically generate route tree in `routeTree.gen.ts`
- `__root.tsx` contains the root layout with QueryClient and ContextHole providers

**`src/components/`** - Reusable UI components
- shadcn/ui components in `/components/ui/`
- Form components (LoginForm, SignupForm)
- Uses Radix UI primitives with Tailwind styling

**`src/pages/`** - Page-level components
- Thin wrappers that render the actual page content
- Referenced by route files

**`src/entities/`** - Domain models and business logic
- User entity with Zod schema validation
- Authentication hooks and context
- Separation of domain concerns from UI

**`src/lib/`** - Utility functions and helpers
- Shared utilities like `cn()` for class merging
- i18n configuration and initialization
- HTTP client for API calls

**`src/locales/`** - Internationalization files
- Language files for Russian (`ru/`) and English (`en/`)
- Translation namespaces and JSON files

**`src/shared/`** - Cross-cutting concerns (currently empty but structured for shared utilities)

## Key Patterns

### 1. File-Based Routing with TanStack Router
- Routes are automatically generated from files in `src/routes/`
- Root route: `__root.tsx` - Must export `Route` using `createRootRoute`
- Index route: `index.tsx` - Handles `/` path
- Dynamic routes: `$param.tsx` - Use `$` prefix for dynamic segments
- Nested routes: Create subdirectories (e.g., `app/quiz/$uid.tsx`)
- Use `Link` component from `@tanstack/react-router` for navigation
- Use `useNavigate()` hook for programmatic navigation
- Use `useParams()` to access route parameters

### 2. Entity-Component Separation
- Domain entities separate from UI components
- Each entity in its own directory under `src/entities/`
- Entity structure:
  - `EntityName/EntityName.type.ts` - Zod schemas and TypeScript types
  - `EntityName/useEntity.tsx` - Custom hooks for entity operations
  - `EntityName/EntityName.context.tsx` - React Context (if needed)
  - `EntityName/EntityName.context.provider.tsx` - Context provider (if needed)

### 3. Component Patterns
- Use functional components with TypeScript
- Prefer named exports over default exports
- Use `React.ComponentProps<'div'>` for extending HTML element props
- Accept `className` prop and merge with `cn()` utility
- shadcn/ui components from `@/components/ui/` (New York style)
- Use `Field`, `FieldLabel`, `FieldDescription`, `FieldGroup` from `@/components/ui/field`

### 4. Type-Safe Development with Zod
- Always define Zod schemas and infer TypeScript types from them:
```typescript
import { z } from 'zod';

export const entityZod = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  created_at: z.date(),
});

export type Entity = z.infer<typeof entityZod>;
```
- Use Zod schemas for runtime validation
- Use `.safeParse()` for validation with error handling
- Export validation schemas for reuse in forms and API calls

### 5. Context Provider Pattern
- Global state through React Context (Auth, QueryClient)
- When entity needs global state:
  - Create context in `EntityName.context.tsx`
  - Create provider in `EntityName.context.provider.tsx`
  - Use ContextHole pattern to register provider in `src/app/context/context.hole.tsx`

### 6. API and HTTP Patterns
- HTTP client is in `src/lib/http/index.ts`
- Use `http<T>()` function for API calls with generic type parameter
- Always validate data with Zod schemas before making API calls
- Wrap API calls in try-catch blocks
- Use `toast.error()` from `sonner` for error notifications

### 7. Internationalization (i18n)
- Uses i18next with react-i18next for Russian/English support
- Translations in `src/locales/{lang}/common.json`
- Always use `useTranslation()` hook and `t()` function for user-facing text
- Use dot notation for nested keys: `t('login.title')`, `t('login.email')`
- Never hardcode user-facing strings in components

### 8. Code Formatting and Styling
- Uses Biome for formatting (tabs, single quotes)
- Use Tailwind utility classes for styling
- Use `cn()` utility from `@/lib/utils` for conditional classes
- Follow shadcn/ui New York style patterns
- Run `bun run lint` to format code before committing

## Import Aliases

- `@/` → `./src/`
- `@/components` → UI components
- `@/lib/utils` → Utility functions
- `@/components/ui` → shadcn/ui components

## Development Notes

- React Compiler is enabled and may impact build performance
- Biome formatter is configured with tab indentation and single quotes
- The project uses shadcn/ui component system with New York style
- TanStack Router DevTools are included in development build
- Automatic language detection with fallback to English
- Language preference stored in localStorage