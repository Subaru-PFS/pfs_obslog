# PFS Obslog 2

A refactoring project for the PFS observation log system.

## Tech Stack

**Backend:** FastAPI, SQLAlchemy  
**Frontend:** React, TypeScript, Vite, RTK Query, React Router

## Development Environment Setup

### Prerequisites

- Python 3.13 + [uv](https://github.com/astral-sh/uv)
- Node.js + npm
- PostgreSQL

### 1. Development Database Setup

The development database (test DB) is a local PostgreSQL instance that copies the schema and sample data from the production database. It allows development and testing without affecting the production environment.

```bash
cd backend/devel/make_test_db
./run.sh
```

This script performs the following:
1. Stops and removes the existing test PostgreSQL
2. Initializes a new PostgreSQL cluster
3. Copies the schema from the production DB
4. Imports 5% of the newest records from each table in the production DB (max 1000 records)

See [backend/devel/make_test_db/README.md](backend/devel/make_test_db/README.md) for details.

#### Connecting to the Development Database

```bash
# Connect
psql -p 15432 opdb

# Data directory
~/pgdata_for_pfs_obslog_test

# Start (if stopped)
pg_ctl -D ~/pgdata_for_pfs_obslog_test -l ~/pgdata_for_pfs_obslog_test/logfile start

# Stop
pg_ctl -D ~/pgdata_for_pfs_obslog_test stop
```

**Connection Info:**
- Host: localhost
- Port: 15432
- Database: opdb
- User: pfs (local uses trust authentication, no password required)

### 2. Backend Setup

```bash
cd backend
uv sync --all-extras
```

See [backend/README.md](backend/README.md) for details.

### 3. Frontend Setup

```bash
cd frontend
npm install
```

See [frontend/README.md](frontend/README.md) for details.

## Starting Development Servers

Development servers run on the local machine and automatically reload when code changes are detected.

### Backend Development Server

```bash
cd backend
make dev
```

Access: http://localhost:8000

- API Documentation: http://localhost:8000/docs
- OpenAPI Schema: http://localhost:8000/openapi.json

### Frontend Development Server

```bash
cd frontend
npm run dev
```

Access: http://localhost:5173

## Running Tests

### Backend

```bash
cd backend
make test
```

### Frontend

```bash
cd frontend
npm run test
```

## Documentation

- [Documentation Index](docs/README.md) - Table of contents for all documentation
- [Backend Details](backend/README.md)
- [Frontend Details](frontend/README.md)
- [Test Database Creation](backend/devel/make_test_db/README.md)
- [SQLAlchemy Model Auto-generation](backend/devel/generate_models.md)
