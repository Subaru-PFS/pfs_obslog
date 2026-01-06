# PFS Design Viewer Refactoring Investigation

This document summarizes the investigation results for understanding the current state of PFS Design Viewer and considering future refactoring.

## Overview

Design Viewer is a feature for visualizing and managing PFS (Prime Focus Spectrograph) observation designs.

### Current Implementation Status

**Backend API**: ✅ Implementation complete
**Frontend**: ✅ Implementation complete (ported from SolidJS to React)

---

## 1. API Endpoint List

### Backend Implementation File

- [backend/src/pfs_obslog/routers/pfs_designs.py](../../backend/src/pfs_obslog/routers/pfs_designs.py)

### Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/pfs_designs` | Get Design list | No |
| GET | `/api/pfs_designs/{id_hex}` | Get Design detail | No |
| GET | `/api/pfs_designs/{id_hex}.fits` | Download FITS file | No |

### Response Schema

#### PfsDesignEntry (for list)

```python
class PfsDesignEntry(BaseModel):
    id: str              # Design ID (hexadecimal string)
    frameid: str         # Filename
    name: str            # Design name
    date_modified: datetime  # Modified date
    ra: float            # Center RA
    dec: float           # Center Dec
    arms: str            # Used arms
    num_design_rows: int # Design row count
    num_photometry_rows: int
    num_guidestar_rows: int
    design_rows: DesignRows  # Row count by target type
```

#### PfsDesignDetail (for detail)

```python
class PfsDesignDetail(BaseModel):
    fits_meta: FitsMeta  # FITS metadata
    date_modified: datetime
    design_data: DesignData      # Fiber placement data
    photometry_data: PhotometryData  # Photometry data
    guidestar_data: GuidestarData    # Guide star data
```

---

## 2. Frontend Component Structure

### Directory Structure

```
frontend/src/pages/Designs/
├── Designs.tsx           # Main page
├── DesignsContext.tsx    # State management (React Context)
├── types.ts              # Type definitions
├── legend.ts             # Color legend definitions
├── DesignList/
│   ├── DesignList.tsx    # Design list side panel
│   └── DesignList.module.scss
├── SkyViewer/
│   ├── SkyViewer.tsx     # Sky display (WebGL)
│   ├── Clock.tsx         # Analog clock UI
│   └── SkyViewer.module.scss
└── DesignDetail/
    ├── DesignDetail.tsx  # Focal plane view
    └── DesignDetail.module.scss
```

### Screen Layout

```
+------------------+------------------------------------------+
|                  |                                          |
|   DesignList     |           SkyViewer                      |
|   (Left side)    |           (Sky display)                  |
|                  |                                          |
|                  +------------------------------------------+
|                  |                                          |
|                  |           DesignDetail                   |
|                  |           (Focal plane view)             |
+------------------+------------------------------------------+
```

---

## 3. Main Component Features

### 3.1 DesignList (Design List)

**Features:**
- Display Design list (search, sort, grouping)
- Toggle ID display format (Hex/Decimal)
- Toggle sort order (altitude/modified date)
- FITS download, ID copy

**State management:**
- `idFormat`: localStorage saved
- `sortOrder`: localStorage saved
- `searchText`: local state

### 3.2 SkyViewer (Sky Display)

**Tech stack:**
- `@stellar-globe/react-stellar-globe`: WebGL sky visualization
- Pan-STARRS DR1 HiPS images as background

**Display layers:**
1. HipparcosCatalogLayer (stars)
2. ConstellationLayer (constellation lines)
3. HipsSimpleLayer (Pan-STARRS images)
4. GridLayer (AltAz / Equatorial)
5. ClickableMarkerLayer (Design markers)
6. PathLayer (selected/focused highlight)

**Controls:**
- Mouse drag: Pan view
- Scroll: Zoom
- Marker click: Select Design
- Time control: Date picker, analog clock

### 3.3 DesignDetail (Focal Plane View)

**Features:**
- Visualize fiber placement with FocalPlane component
- Toggle coloring mode (Target Type / Fiber Status)
- Show detailed info on fiber hover
- Design summary display

**Color coding:**

| Target Type | Color |
|-------------|-------|
| SCIENCE | lightsteelblue |
| SKY | yellow |
| FLUXSTD | magenta |
| UNASSIGNED | gray |
| ENGINEERING | red |
| SUNSS_IMAGING | olive |
| SUNSS_DIFFUSE | blue |

---

## 4. State Management (DesignsContext)

Manages page-wide state with React Context:

| State | Type | Description |
|-------|------|-------------|
| `designs` | `PfsDesignEntry[]` | Design list |
| `selectedDesign` | `PfsDesignEntry \| undefined` | Selected Design |
| `focusedDesign` | `PfsDesignEntry \| undefined` | Focused Design |
| `designDetail` | `PfsDesignDetail \| undefined` | Selected Design detail |
| `jumpToSignal` | `JumpToOptions \| null` | Camera jump command |
| `showFibers` | `boolean` | Show fiber markers |
| `now` | `Date` | Display time |
| `zenithSkyCoord` | `{ ra, dec }` | Zenith equatorial coordinates |

---

## 5. External Dependencies

| Library | Usage | Path |
|---------|-------|------|
| `@stellar-globe/react-stellar-globe` | Sky visualization | `external/stellar-globe/react-stellar-globe` |
| `react-use` | `useLocalStorage` hook | npm |

---

## 6. Differences from Old Project

### SolidJS → React Conversion

| SolidJS | React |
|---------|-------|
| `createSignal` | `useState` |
| `createEffect` | `useEffect` |
| `createMemo` | `useMemo` |
| `createResource` | RTK Query |
| `For` | `Array.map` |
| `Show` | Conditional rendering |

### Features in Old Project Not in New Project

1. **`/api/pfs_designs.png` endpoint**: Feature to plot Design positions with matplotlib
   - Old: Implemented with `PlotDesignTask`
   - New: Not implemented (can be replaced by SkyViewer)

2. **Cache mechanism**: FITS file reading cache
   - Old: Used `PickleCache`
   - New: Not implemented (add as needed)

---

## 7. Refactoring Considerations

### 7.1 SQLite Metadata (Priority: High)

**Issue:**
Current implementation when fetching Design list:
1. Glob all FITS files in directory
2. Open each FITS file individually and read headers
3. Extract metadata

This becomes very slow when Design files are numerous (hundreds to thousands).

**Solution:**
Cache metadata in SQLite database to speed up list retrieval.

#### Design Proposal

**Database Schema:**
```sql
CREATE TABLE pfs_design_metadata (
    id TEXT PRIMARY KEY,           -- Design ID (hexadecimal)
    frameid TEXT NOT NULL,         -- Filename
    name TEXT,                      -- Design name
    file_mtime REAL NOT NULL,      -- FITS file modification time (UNIX timestamp)
    ra REAL,                        -- Center RA
    dec REAL,                       -- Center Dec
    arms TEXT,                      -- Used arms
    num_design_rows INTEGER,       -- Design row count
    num_photometry_rows INTEGER,   -- Photometry row count
    num_guidestar_rows INTEGER,    -- Guide star row count
    -- Target type counts
    science_count INTEGER,
    sky_count INTEGER,
    fluxstd_count INTEGER,
    unassigned_count INTEGER,
    engineering_count INTEGER,
    sunss_imaging_count INTEGER,
    sunss_diffuse_count INTEGER,
    -- Management
    cached_at REAL NOT NULL        -- Cache creation time
);

CREATE INDEX idx_pfs_design_mtime ON pfs_design_metadata(file_mtime);
```

**Update Logic:**
```
1. Get FITS file list in directory (using os.scandir)
2. Check mtime for each file
3. Read FITS only for files not in DB or with updated mtime
4. Update DB
5. Return list from DB

Simultaneously:
- Delete records in DB where file no longer exists
```

**Implementation Module Structure:**
```
backend/src/pfs_obslog/
├── pfs_design_cache.py      # SQLite cache management
└── routers/
    └── pfs_designs.py       # Existing (modify to use cache)
```

**Class Design:**
```python
class PfsDesignCache:
    def __init__(self, db_path: Path, design_dir: Path):
        ...
    
    def get_all_entries(self) -> list[PfsDesignEntry]:
        """Update cache and return all entries"""
        ...
    
    def sync(self) -> None:
        """Sync filesystem with DB"""
        ...
    
    def _needs_update(self, path: Path) -> bool:
        """Determine if file needs update"""
        ...
```

**Configuration:**
```python
# config.py
pfs_design_cache_db: Path = Path("~/.cache/pfs-obslog/pfs_design.db")
```

### 7.2 Other Performance Improvements

- [ ] Add search debounce processing (frontend)
- [ ] Optimize fiber marker rendering

### 7.3 Feature Addition Ideas

- [ ] Design comparison feature
- [ ] Enhanced filtering (by arm, target type)
- [ ] Export feature (CSV, JSON, etc.)

### 7.4 UI/UX Improvements

- [ ] Responsive design support
- [ ] Keyboard shortcuts
- [ ] Enriched tooltip information

---

## 8. Related Documents

- [Design Viewer Specification](../migration/design-viewer.md) - Detailed specification
- [Backend API Migration Status](../migration/backend-api.md)
- [Frontend Component Migration Status](../migration/frontend-components.md)
