# Session Management

## Overview

This system uses cookie-based session management via Starlette's `SessionMiddleware`.
Additionally, an `AuthMiddleware` is used to require authentication for all API endpoints by default.

## Authentication Flow

```
Request → SessionMiddleware → AuthMiddleware → Router → Response
```

1. **SessionMiddleware**: Reads session data from cookie and sets `request.session`
2. **AuthMiddleware**: Checks `request.session` and returns 401 if unauthenticated (except for public paths)
3. **Router**: Processes authenticated requests

## Mechanism

### Session Cookie

- **Middleware**: `starlette.middleware.sessions.SessionMiddleware`
- **Cookie Name**: `session`
- **Expiration**: `max_age=None` (session cookie)
  - Cookie is deleted when browser is closed
- **SameSite**: `lax` (CSRF protection)

### Authentication Middleware

The authentication middleware (`AuthMiddleware`) requires authentication for all API endpoints by default.
The following paths are exceptions and can be accessed without authentication:

| Path Pattern | Description |
|--------------|-------------|
| `/api/auth/login` | Login endpoint |
| `/api/auth/logout` | Logout endpoint |
| `/api/auth/status` | Authentication status check |
| `/api/auth/me` | User info retrieval (authenticated at router level) |
| `/api/healthz` | Health check |
| `/api/readyz` | Readiness check |
| `/api/docs*` | Swagger UI documentation |
| `/api/redoc*` | ReDoc documentation |
| `/api/openapi.json` | OpenAPI schema |
| `/api/attachments/{user}/{id}` | Attachment file download |
| Static files (not `/api/`) | Frontend static files |

**Note**: When adding new API endpoints, authentication is required by default.
To make an endpoint public, add it to `DEFAULT_PUBLIC_PATTERNS` in `backend/src/pfs_obslog/auth/middleware.py`.

### Session Data

Session data is stored as a signed cookie:

1. Session data is serialized as JSON
2. Signed with `itsdangerous` library (tampering detection)
3. Base64 encoded and stored in cookie

**Note**: Session data is not encrypted. Do not store sensitive information (passwords, etc.) in the session.

### Secret Key

The secret key used for session signing is:

- Retrieved from the `SESSION_SECRET_KEY` environment variable
- Randomly generated if not set (for development environment)

**Always set a fixed secret key in production environment.**

```bash
export SESSION_SECRET_KEY="your-secret-key-here"
```

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/auth/login` | POST | No | Login |
| `/auth/logout` | POST | No | Logout |
| `/auth/me` | GET | Yes | Get current user info |
| `/auth/status` | GET | No | Check authentication status |

## Usage Examples

### Creating an Authenticated Endpoint

```python
from pfs_obslog.auth.session import RequireUser

@router.get("/protected")
async def protected_endpoint(user_id: RequireUser):
    # user_id contains the logged-in user's ID
    return {"message": f"Hello, {user_id}"}
```

### Optional Authentication Endpoint

```python
from pfs_obslog.auth.session import CurrentUser

@router.get("/optional")
async def optional_endpoint(user_id: CurrentUser):
    # user_id is the user ID if logged in, None if not
    if user_id:
        return {"message": f"Hello, {user_id}"}
    return {"message": "Hello, guest"}
```
