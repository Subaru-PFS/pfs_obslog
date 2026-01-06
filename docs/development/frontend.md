# Frontend Development Guide

## Overview

- **UI Library:** React 19
- **Language:** TypeScript
- **Build Tool:** Vite
- **Data Fetching:** RTK Query
- **Routing:** React Router
- **Styling:** SCSS Modules + typed-scss-modules

## Directory Structure

```
frontend/src/
├── components/       # UI components
│   └── Example/
│       ├── Example.tsx
│       ├── Example.module.scss
│       ├── Example.module.scss.d.ts  # Auto-generated
│       └── index.ts
├── router/           # Routing configuration
├── store/            # Redux store
│   └── api/          # RTK Query API
├── test/             # Test configuration
└── main.tsx          # Entry point
```

## Development Commands

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build
npm run build

# Lint
npm run lint

# Run tests
npm run test:run

# npm run test is interactive mode

# Run tests with coverage
npm run test:coverage
```

## SCSS Module Type Generation

When adding or modifying SCSS files, regenerate the type files.

```bash
# Generate once
npm run scss:types

# Watch mode (use during development)
npm run scss:watch
```

Generated `.d.ts` files should be committed.

## RTK Query API Generation

Auto-generate RTK Query code from the backend's OpenAPI schema.

```bash
npm run generate-api
```

- Regenerate when backend APIs change
- Do not directly edit the generated `generatedApi.ts`
- Customize in `emptyApi.ts`

See [frontend/README.md](../frontend/README.md) for details.
