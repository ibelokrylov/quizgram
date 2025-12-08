# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Package Management**: This project uses **bun** as the package manager
- **Install dependencies**: `bun install` - Install project dependencies
- **Add dependency**: `bun add <package>` - Add new dependency
- **Add dev dependency**: `bun add -d <package>` - Add development dependency
- **Development**: `bun run dev` - Start Vite development server
- **Build**: `bun run build` - TypeScript compilation followed by Vite build
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

**`src/locales/`** - Internationalization files
- Language files for Russian (`ru/`) and English (`en/`)
- Translation namespaces and JSON files

**`src/shared/`** - Cross-cutting concerns (currently empty but structured for shared utilities)

### Key Patterns

1. **File-Based Routing**: Routes are automatically generated from files in `src/routes/`
2. **Entity-Component Separation**: Domain entities are separate from UI components
3. **Context Provider Pattern**: Global state through React Context (Auth, QueryClient)
4. **Type-Safe Development**: Zod schemas for runtime validation, TypeScript throughout
5. **Auto Code Splitting**: TanStack Router automatically splits code by routes
6. **Internationalization**: Use i18next `t()` function for all user-facing text
7. **Language Detection**: Automatic language detection with fallback to English

### Import Aliases

- `@/` → `./src/`
- `@/components` → UI components
- `@/lib/utils` → Utility functions
- `@/components/ui` → shadcn/ui components

### Development Notes

- React Compiler is enabled and may impact build performance
- Biome formatter is configured with tab indentation and single quotes
- The project uses shadcn/ui component system with New York style
- TanStack Router DevTools are included in development build