# Production Environment Setup

This document explains the procedure for running PFS Obslog 2 in a production environment.

## Overview

The production environment operates with the following configuration:

- **Web Server:** Gunicorn + Uvicorn Worker (8 processes)
- **Process Management:** systemd (user mode)
- **Port:** 5000 (default)

## Prerequisites

- Python 3.13 or higher
- uv (package manager)
- Linux environment with systemd available
- Connection permission to PostgreSQL (production DB)

## Directory Structure

```
~/pfs-obslog2/
├── backend/
│   ├── Makefile                # Build and startup commands
│   ├── scripts/
│   │   └── pfs-obslog2.service # systemd service file
│   └── secrets/
│       └── session_secret_key  # Auto-generated
├── frontend/
│   └── dist/                   # Built frontend
├── logs/
│   ├── access.log              # Access log
│   └── error.log               # Error log
└── external/
    ├── pfs-datamodel/
    └── pfs_utils/
```

## Setup Procedure

### 1. Clone the Repository

```bash
cd ~
git clone <repository-url> pfs-obslog2
cd pfs-obslog2
```

### 2. External Dependencies Setup

```bash
# pfs-datamodel
cd external/pfs-datamodel
git submodule update --init

# pfs_utils
cd ../pfs_utils
git submodule update --init
```

### 3. Backend Setup

```bash
cd ~/pfs-obslog2/backend

# Install dependencies
uv sync

# Initial setup (secret key generation, etc.)
make setup
```

This automatically performs the following:
- Session secret key generation (`secrets/session_secret_key`)
- Log directory creation

### 4. Frontend Build

```bash
cd ~/pfs-obslog2/frontend

# Install dependencies
npm install

# Build stellar-globe (first time only)
npm run build:stellar-globe

# Production build
npm run build
```

Build output is generated in the `dist/` directory.

### 5. Manual Startup Verification

#### Development Mode

In development mode, start backend and frontend separately:

```bash
# Backend (Terminal 1)
cd ~/pfs-obslog2/backend
make dev

# Frontend (Terminal 2)
cd ~/pfs-obslog2/frontend
npm run dev
```

Access `http://localhost:5173/` in your browser to verify operation.
API requests are automatically proxied to the backend (http://localhost:8000/api).

#### Production Mode

In production mode, the backend also serves static files:

```bash
cd ~/pfs-obslog2/backend

# Start in production mode
make production
```

Access `http://<hostname>:5000/` in your browser to verify operation.
**Note**: When accessing via Nginx, use `http://<hostname>/obslog/` (Nginx strips `/obslog` and forwards to backend).

### 6. systemd Service Configuration

```bash
# Link service file to user systemd
mkdir -p ~/.config/systemd/user
ln -sf ~/pfs-obslog2/backend/scripts/pfs-obslog2.service ~/.config/systemd/user/

# Reload systemd
systemctl --user daemon-reload

# Start service
systemctl --user start pfs-obslog2

# Check status
systemctl --user status pfs-obslog2

# Check logs (see "About Log Checking" below)
journalctl _UID=$(id -u) -u pfs-obslog2 -f
```

### 7. Auto-start Configuration

```bash
# Enable auto-start on login
systemctl --user enable pfs-obslog2

# Enable lingering to start user services at system boot
# (service runs even after reboot)
loginctl enable-linger $USER
```

## Service Management Commands

```bash
# Start
systemctl --user start pfs-obslog2

# Stop
systemctl --user stop pfs-obslog2

# Restart
systemctl --user restart pfs-obslog2

# Check status
systemctl --user status pfs-obslog2

# Check logs (see "About Log Checking" below)
journalctl _UID=$(id -u) -u pfs-obslog2 -f

# Direct application log check
tail -f ~/pfs-obslog2/logs/access.log
tail -f ~/pfs-obslog2/logs/error.log
```

### About Log Checking

**Note:** In some environments, `journalctl --user` may not display logs. This is because user-specific journal files don't exist and all logs are integrated into the system journal.

In that case, use user ID filtering:

```bash
# Use _UID=$(id -u) instead of --user
journalctl _UID=$(id -u) -u pfs-obslog2 -f

# Show latest 100 lines
journalctl _UID=$(id -u) -u pfs-obslog2 -n 100 --no-pager
```

## Configuration Customization

### Environment Variables

The following environment variables can be set in the systemd service file (`pfs-obslog2.service`):

| Environment Variable | Default Value | Description |
|---------------------|---------------|-------------|
| `BIND_ADDRESS` | `0.0.0.0:5000` | Address and port to bind |
| `PFS_OBSLOG_app_env` | `production` | Environment (development/production) |
| `PFS_OBSLOG_database_url` | - | PostgreSQL connection URL |
| `PFS_OBSLOG_qadb_url` | - | QA database connection URL (for seeing, transparency, etc.) |
| `PFS_OBSLOG_session_secret_key` | Auto-generated | Session encryption key |
| `PFS_OBSLOG_root_path` | `""` (empty string) | Application URL prefix |

**About QA Database:**

`PFS_OBSLOG_qadb_url` is set in the systemd service file.
In development environment, it connects to local qadb by default (`postgresql://pfs@localhost:15432/qadb`).

**About URL Prefix:**

The application itself operates without a prefix (`/`).
Nginx strips `/obslog` from requests and forwards them to the backend.

```nginx
# Nginx configuration example
location /obslog/ {
    proxy_pass http://localhost:5000/;  # Trailing / strips /obslog
    ...
}
```

With this configuration:
- Users access via `http://<hostname>/obslog/`
- Nginx converts `/obslog/` to `/` and forwards to backend
- Backend operates with paths like `/api/*`, `/`

Development mode (`make dev`) doesn't require Nginx and can be accessed directly at `http://localhost:5173/`.

### Editing the Service File

```bash
# To edit directly
vi ~/pfs-obslog2/backend/scripts/pfs-obslog2.service

# After editing, reload and restart
systemctl --user daemon-reload
systemctl --user restart pfs-obslog2
```

### Adjusting Worker Count

Modify the `--workers` option in the `production` target in `backend/Makefile`:

```makefile
# backend/Makefile
production: setup
	uv run gunicorn pfs_obslog.main:app \
		--workers 8 \  # ← Adjust worker count
		...
```

Recommended value: `(CPU cores × 2) + 1`

## Directory Sharing Between Development and Production

When running both development server (`make dev`) and production server (`make production`) in the same directory simultaneously, note the following:

### Cache Directory

The cache directory is placed at `/tmp/$USER/obslog/cache` and is automatically separated per user.

**Note**: When running both development and production as the same user, the cache is shared.
Since the cache is written to by both servers, they may update the cache simultaneously.
However, cache update processing is idempotent and consistency is maintained by SQLite's locking mechanism, so this is usually not a problem.

For stricter isolation, run as different users or override `cache_dir` via environment variable (currently not supported).

### Log Directory

Development server (`make dev`) outputs logs to stdout.
Production server (`make production`) creates log files in `~/pfs-obslog2/logs/`.
Therefore, logs are automatically separated.

### Session Secret Key

Development server (`make dev`) uses a hardcoded temporary key (`'???'`).
Production server (`make production`) uses `backend/secrets/session_secret_key`.
Therefore, sessions are automatically separated.

### Port Conflicts

Development server (default: 8000) and production server (default: 5000) use different ports,
so they can run simultaneously with default settings.

### Dependency Management

Dependencies installed via `uv sync` are saved in `.venv/` and shared between development and production.
This is usually not a problem, but if different dependency versions are needed, clone to a separate directory.

## Web Server (Nginx) Integration

In production, using Nginx as a reverse proxy is recommended.

### Nginx Configuration Example

```nginx
upstream obslog_backend {
    server 127.0.0.1:5000;
}

server {
    listen 80;
    server_name obslog.example.com;

    # Frontend static files and backend API
    # Convert requests under /obslog/ to / and forward to backend
    location /obslog/ {
        proxy_pass http://obslog_backend/;  # Trailing / strips /obslog
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Troubleshooting

### Service Won't Start

```bash
# Check detailed logs
journalctl _UID=$(id -u) -u pfs-obslog2 -n 100 --no-pager

# Start manually to check errors
cd ~/pfs-obslog2/backend
make production
```

### Database Connection Error

```bash
# Connection test
psql -h 133.40.164.48 -U pfs opdb -c "SELECT 1"

# Check ~/.pgpass
cat ~/.pgpass
chmod 600 ~/.pgpass
```

### Port Already in Use

```bash
# Check ports in use
ss -tlnp | grep 5000

# Kill another process or change port
```

## Migration from Existing Project

When migrating from the existing pfs-obslog (old project):

1. Stop old service
   ```bash
   systemctl --user stop pfs-obslog
   ```

2. Start new service
   ```bash
   systemctl --user start pfs-obslog2
   ```

3. After verifying operation, disable old service auto-start
   ```bash
   systemctl --user disable pfs-obslog
   ```

## Related Documents

- [Backend Development Guide](../development/backend.md)
- [Frontend Development Guide](../development/frontend.md)
- [README](../README.md)
