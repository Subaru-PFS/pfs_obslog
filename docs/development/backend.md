# Backend Development Guide

## Overview

- **Framework:** FastAPI
- **ORM:** SQLAlchemy 2.0
- **Python Version:** 3.13
- **Package Manager:** uv

## Package Structure

```
backend/
├── src/
│   └── pfs_obslog/    # Main package
│       ├── main.py
│       ├── models.py
│       ├── auth/      # Authentication
│       └── routers/   # API routers
├── tests/             # Test directory
└── devel/             # Development tools
```

- Modules can be imported with `import pfs_obslog.module`
- Import works without `__init__.py` (implicit namespace packages)

## Database Connection Information

### Production DB

```bash
psql -h 133.40.164.48 -U pfs opdb
```

See `~/.pgpass` for authentication credentials.

### Run the Development Backend Against the Production DB

The development backend (`make dev`) uses the local test database by default. To run it against the production database, specify the database URL when starting it:

```bash
cd backend
PFS_OBSLOG_database_url=postgresql://pfs@133.40.164.48/opdb make dev
```

Make sure the production database credentials are configured in `~/.pgpass`. To also retrieve QA data from the production environment, specify `PFS_OBSLOG_qadb_url` as well.

```bash
PFS_OBSLOG_database_url=postgresql://pfs@133.40.164.48/opdb \
PFS_OBSLOG_qadb_url=postgresql://pfs@<production-QADB-host>:<port>/qadb \
make dev
```

Because this may allow writes to the production database, use the local test database for normal development and testing.

### Test DB (Development)

```bash
# Connect
psql -p 15432 opdb

# Start
pg_ctl -D ~/pgdata_for_pfs_obslog_test -l ~/pgdata_for_pfs_obslog_test/logfile start

# Stop
pg_ctl -D ~/pgdata_for_pfs_obslog_test stop
```

**Connection Info:**
- Host: localhost
- Port: 15432
- Database: opdb
- User: pfs (trust authentication)

### Recreating the Test DB

```bash
cd backend/devel/make_test_db
./run.sh
```

## Development Commands

```bash
cd backend

# Install dependencies (including dev packages)
# pfs-datamodel and pfs-utils are also auto-installed from external/
uv sync --all-extras

# Start development server
uv run uvicorn pfs_obslog.main:app --reload --port 8000

# Run tests
uv run pytest

# Run tests with coverage
uv run pytest --cov=pfs_obslog --cov-report=html
```

## SQLAlchemy Model Auto-generation

You can auto-generate SQLAlchemy 2.0 style models from the DB schema.

```bash
cd backend

# Generate models from test DB
uv run python devel/generate_models.py --env test

# Generate models from production DB
uv run python devel/generate_models.py --env production
```

See [backend/devel/generate_models.md](../backend/devel/generate_models.md) for details.
