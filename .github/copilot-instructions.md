# pfs-obslog2 Development Guide

## Project Overview

This project is a refactoring of the existing pfs-obslog project (`./old-project/codebase` is a link to the existing project).

### Tech Stack

- **Backend:** FastAPI, SQLAlchemy
- **Frontend:** React, TypeScript, Vite, RTK Query

## Detailed Documentation

For detailed development information on backend and frontend, refer to:

- [Documentation Index](../docs/README.md) - Table of contents for all documentation
- [Backend Development Guide](../docs/development/backend.md) - DB connection info, development commands, model generation, etc.
- [Frontend Development Guide](../docs/development/frontend.md) - Development commands, SCSS type generation, RTK Query API generation, etc.
- [Project README](../README.md) - Setup instructions, how to start development servers

## Language Policy

- **Frontend (User-facing UI):** Use English only
- **Backend (Error messages):** Use English for error messages that are shown to users
- **Code comments and documentation:** Either Japanese or English is acceptable

## Auto-generated Files

The following files are auto-generated, so do not edit them directly:

- **`backend/src/pfs_obslog/models.py`**: Auto-generated from DB schema by `backend/devel/generate_models.py`
- **`frontend/src/store/api/generatedApi.ts`**: Auto-generated from OpenAPI schema

## Work Guidelines

Please follow these rules:

- Commit to git when a unit of work is completed.
- Do not use `git add -A`
  - Multiple agents may be running in parallel. Using `-A` may commit unrelated files.
  - Instead, stage files individually with `git add <filepath>`.
- Avoid using `>` in commands (not auto-approved)
- Use `./copilot/ask_for_instructions` to confirm with the instructor
  - Use when work cannot proceed or for review requests upon completion of each item
- **Run `make typecheck` for type checking when backend work is completed**
  - Fix any type errors before committing

## Migration Status Management

Backend API migration status is managed in [docs/migration/backend-api.md](../docs/migration/backend-api.md).
Frontend component migration status is managed in [docs/migration/frontend-components.md](../docs/migration/frontend-components.md).

### Backend Migration Status Update Rules

Update `docs/migration/backend-api.md` in the following cases:

1. **When a new API endpoint is implemented**
   - Change the "Status" of the endpoint from `⏳ Not Started` to `✅ Done`
   - Enter the path in the "New Endpoint" column
   - Update "Notes" as needed

2. **When API implementation is started**
   - Change the "Status" of the endpoint to `🚧 In Progress`

3. **When it is decided not to migrate**
   - Change the "Status" of the endpoint to `❌ Won't Migrate`
   - Enter the reason in "Notes"

4. **Update summary table**
   - When changing endpoint status, also update the summary table at the top of the page

### Frontend Migration Status Update Rules

Update `docs/migration/frontend-components.md` in the following cases:

1. **When a new component/page is implemented**
   - Change the "Status" of the component from `⏳ Not Started` to `✅ Done`
   - Enter the path in the "New Component" column
   - Update "Notes" as needed

2. **When implementation is partially completed**
   - Change the "Status" of the component to `🔶 Partial`
   - Enter unimplemented features in "Notes"

3. **When component implementation is started**
   - Change the "Status" of the component to `🚧 In Progress`

4. **When it is decided not to migrate**
   - Change the "Status" of the component to `❌ Won't Migrate`
   - Enter the reason in "Notes"

5. **Update summary table**
   - When changing component status, also update the summary table at the top of the page

### Filter Language Specification Update Rules

Filter language specification is managed in [docs/filter-language.md](../docs/filter-language.md).

When editing the following files, be sure to update `docs/filter-language.md` as well:

1. **`backend/src/pfs_obslog/visitquery/columns.py`**
   - When adding new virtual columns → Add column definition to the relevant section
   - When changing column definitions → Update corresponding description
   - When adding aggregate columns → Update "Aggregate Columns" section

2. **`backend/src/pfs_obslog/visitquery/evaluator.py`**
   - When supporting new syntax → Update "Supported Syntax" section
   - When changing `_get_any_column_columns()` → Update search target columns for `any_column`
   - When adding type casts → Update "Type Casting" section

3. **`backend/src/pfs_obslog/visitquery/parser.py`**
   - When changing allowed functions → Update "Allowed Functions" section
   - When changing security restrictions → Update "Security Restrictions" section

4. **`backend/src/pfs_obslog/visitquery/joins.py`**
   - When changing JOIN dependencies → Update "JOIN Dependencies" section
