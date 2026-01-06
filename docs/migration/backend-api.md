# Backend API Migration Status

This document tracks the backend API migration status from the existing project (`old-project/codebase`) to the new project.

## Migration Status Summary

| Category | Completed | Not Started | Progress |
|----------|-----------|-------------|----------|
| Authentication | 4 | 0 | 100% |
| Health Check | 2 | 0 | 100% |
| Visit | 4 | 0 | 100% |
| Visit Note | 3 | 0 | 100% |
| Visit Set Note | 3 | 0 | 100% |
| FITS | 8 | 0 | 100% |
| PFS Design | 3 | 0 | 100% |
| Plot | 1 | 0 | 100% |
| **Total** | **28** | **0** | **100%** |

---

## API Endpoint List

### Authentication (Session)

| Method | Old Endpoint | New Endpoint | Status | Notes |
|--------|--------------|--------------|--------|-------|
| POST | `/api/session` | `/api/auth/login` | ✅ Done | Login |
| GET | `/api/session` | `/api/auth/status` | ✅ Done | Get session status |
| DELETE | `/api/session` | `/api/auth/logout` | ✅ Done | Logout |
| - | - | `/api/auth/me` | ✅ Done | New: Get user info (auth required) |

### Health Check

| Method | Old Endpoint | New Endpoint | Status | Notes |
|--------|--------------|--------------|--------|-------|
| GET | `/api/healthz` | `/api/healthz` | ✅ Done | DB timestamp check → Changed to simple status return |
| - | - | `/api/readyz` | ✅ Done | New: Readiness check |

### Visit

| Method | Old Endpoint | New Endpoint | Status | Notes |
|--------|--------------|--------------|--------|-------|
| GET | `/api/visits` | `/api/visits` | ✅ Done | Get visit list with SQL filtering support |
| GET | `/api/visits/{id}` | `/api/visits/{visit_id}` | ✅ Done | Get visit details |
| GET | `/api/visits/{id}/rank` | `/api/visits/{visit_id}/rank` | ✅ Done | Get rank within SQL filtering results |
| GET | `/api/visits.csv` | `/api/visits.csv` | ✅ Done | Export as CSV |

### Visit Note

| Method | Old Endpoint | New Endpoint | Status | Notes |
|--------|--------------|--------------|--------|-------|
| POST | `/api/visits/{visit_id}/notes` | `/api/visits/{visit_id}/notes` | ✅ Done | Create note (auth required) |
| PUT | `/api/visits/{visit_id}/notes/{id}` | `/api/visits/{visit_id}/notes/{note_id}` | ✅ Done | Update note (own notes only) |
| DELETE | `/api/visits/{visit_id}/notes/{id}` | `/api/visits/{visit_id}/notes/{note_id}` | ✅ Done | Delete note (own notes only) |

### Visit Set Note (Sequence Note)

| Method | Old Endpoint | New Endpoint | Status | Notes |
|--------|--------------|--------------|--------|-------|
| POST | `/api/visit_sets/{visit_set_id}/notes` | `/api/visit_sets/{visit_set_id}/notes` | ✅ Done | Create sequence note (auth required) |
| PUT | `/api/visit_sets/{visit_set_id}/notes/{id}` | `/api/visit_sets/{visit_set_id}/notes/{note_id}` | ✅ Done | Update sequence note (own notes only) |
| DELETE | `/api/visit_sets/{visit_set_id}/notes/{id}` | `/api/visit_sets/{visit_set_id}/notes/{note_id}` | ✅ Done | Delete sequence note (own notes only) |

### FITS Files

| Method | Old Endpoint | New Endpoint | Status | Notes |
|--------|--------------|--------------|--------|-------|
| GET | `/api/fits/visits/{visit_id}/sps/{camera_id}.fits` | `/api/fits/visits/{visit_id}/sps/{camera_id}.fits` | ✅ Done | Download SPS FITS file |
| GET | `/api/fits/visits/{visit_id}/sps/{camera_id}.png` | `/api/fits/visits/{visit_id}/sps/{camera_id}.png` | ✅ Done | SPS FITS preview image |
| GET | `/api/fits/visits/{visit_id}/agc/{exposure_id}.fits` | `/api/fits/visits/{visit_id}/agc/{agc_exposure_id}.fits` | ✅ Done | Download AGC FITS file |
| GET | `/api/fits/visits/{visit_id}/agc/{exposure_id}-{hdu_index}.png` | `/api/fits/visits/{visit_id}/agc/{agc_exposure_id}.png` | ✅ Done | AGC FITS preview image (hdu_index omitted, uses HDU 1) |
| GET | `/api/fits/visits/{visit_id}/mcs/{frame_id}.fits` | `/api/fits/visits/{visit_id}/mcs/{frame_id}.fits` | ✅ Done | Download MCS FITS file |
| GET | `/api/fits/visits/{visit_id}/mcs/{frame_id}.png` | `/api/fits/visits/{visit_id}/mcs/{frame_id}.png` | ✅ Done | MCS FITS preview image |
| GET | `/api/fits/visits/{visit_id}/sps/{camera_id}/headers` | `/api/fits/visits/{visit_id}/sps/{camera_id}/headers` | ✅ Done | Get FITS headers |
| GET | `/api/fits/visits/{visit_id}/mcs/{frame_id}/headers` | `/api/fits/visits/{visit_id}/mcs/{frame_id}/headers` | ✅ Done | Get FITS headers |

### PFS Design

| Method | Old Endpoint | New Endpoint | Status | Notes |
|--------|--------------|--------------|--------|-------|
| GET | `/api/pfs_designs` | `/api/pfs_designs` | ✅ Done | PFS Design list |
| GET | `/api/pfs_designs/{id_hex}` | `/api/pfs_designs/{id_hex}` | ✅ Done | PFS Design details |
| GET | `/api/pfs_designs/{id_hex}.fits` | `/api/pfs_designs/{id_hex}.fits` | ✅ Done | Download PFS Design FITS |

### Plot (Charts)

| Method | Old Endpoint | New Endpoint | Status | Notes |
|--------|--------------|--------------|--------|-------|
| GET | `/api/mcs_data/{frame_id}.png` | `/api/mcs_data/{frame_id}.png` | ✅ Done | MCS data chart image |

---

## Legend

- ✅ **Done**: Implemented in new project
- ⏳ **Not Started**: Not yet migrated
- 🚧 **In Progress**: Currently being implemented
- ❌ **Won't Migrate**: Determined unnecessary for new project

---

## Change History

| Date | Description |
|------|-------------|
| 2024-12-30 | Initial version |
| 2025-01-XX | Visit Note, Visit Set Note, FITS, PFS Design API completed |
| 2025-01-04 | Attachment feature removed (not actually used) |
