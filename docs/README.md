# Documentation

Documentation for PFS Obslog 2.

## 📚 Documentation Structure

### 🔧 Development Guide (`development/`)

Setup and development procedures for developers.

| Document | Description |
|----------|-------------|
| [backend.md](development/backend.md) | Backend development guide (DB connection, model generation, etc.) |
| [frontend.md](development/frontend.md) | Frontend development guide (SCSS type generation, RTK Query generation, etc.) |
| [session.md](development/session.md) | Session management mechanism |
| [testing.md](development/testing.md) | Testing policy and slow test investigation |

### 🚀 Deployment (`deployment/`)

Deployment procedures for production environment.

| Document | Description |
|----------|-------------|
| [production.md](deployment/production.md) | Production environment setup |

### 🏗️ Architecture (`architecture/`)

System design and specifications.

| Document | Description |
|----------|-------------|
| [filter-language.md](filter-language.md) | Filter language specification (virtual columns, SQL syntax) |
| [sql-filtering.md](sql-filtering.md) | SQL filtering implementation details |
| [visit-api.md](architecture/visit-api.md) | Visit list API specification |

### 📦 Migration Status (`migration/`)

Tracking migration progress from the existing project.

| Document | Description |
|----------|-------------|
| [backend-api.md](migration/backend-api.md) | Backend API migration status |
| [frontend-components.md](migration/frontend-components.md) | Frontend component migration status |
| [design-viewer.md](migration/design-viewer.md) | Design Viewer feature specification |

### 📝 Technical Notes (`notes/`)

Investigation logs and technical discussions.

| Document | Description |
|----------|-------------|
| [pfs-design-speedup.md](notes/pfs-design-speedup.md) | PFS Design API performance optimization investigation |
| [pfs-design-refactoring.md](notes/pfs-design-refactoring.md) | PFS Design Viewer refactoring investigation |
| [visit-detail-pane.md](notes/visit-detail-pane.md) | Visit detail pane implementation investigation |
| [sky-viewer-camera.md](notes/sky-viewer-camera.md) | Sky Viewer camera, zenith, and time relationships |

---

## Other Documents

- [Project README](../README.md) - Project overview and quick start
- [Backend README](../backend/README.md) - Backend-specific information
- [Frontend README](../frontend/README.md) - Frontend-specific information
- [Test DB Creation](../backend/devel/make_test_db/README.md) - Development database setup
- [SQLAlchemy Model Generation](../backend/devel/generate_models.md) - Auto-generating models from DB schema
