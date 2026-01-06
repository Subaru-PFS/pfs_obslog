# Visit Detail Pane Investigation Report

## Overview

This document summarizes the implementation of the Visit detail pane displayed on the right side of the Home page, based on investigation of the existing project (`old-project/codebase`).

## Current State

### Frontend

- [Home.tsx](../frontend/src/pages/Home/Home.tsx): Displays placeholder in right pane
- When `selectedVisitId` exists, shows "Visit #xxx details (not implemented)"
- When no selection, shows "Select a Visit from the list on the left"

### Backend

- `/api/visits`: Visit list API is implemented
- `/api/visits/{id}`: Visit detail API is **not implemented**

---

## Existing Project Structure

### File Structure

```
old-project/codebase/webui/src/pages/Home/VisitDetail/
├── index.tsx              # Main component
├── context.tsx            # FitsId state management
├── types.ts               # Type definitions
├── VisitInspector/        # Visit info display
│   ├── index.tsx          # Tab switching + summary
│   ├── styles.module.scss
│   ├── SpsInspector/      # SpS exposure details
│   ├── McsInspector/      # MCS exposure details
│   ├── AgcInspector/      # AGC exposure details
│   ├── IicSequence/       # Sequence info
│   └── SequenceGroup/     # Sequence group info
└── FitsHeaderInfo/        # FITS header display
    ├── index.tsx
    └── styles.module.scss
```

### Layout

The detail pane is **split vertically**:

1. **Top (VisitInspector)**: Visit summary + tabbed exposure info
2. **Bottom (FitsHeaderInfo)**: Selected FITS file header info

The `split-grid` library enables draggable split bar.

---

## Component Details

### 1. VisitDetail (Main Component)

```tsx
// API call
const api = fetcher.path('/api/visits/{id}').method('get').create()
const [detail, { refetch }] = createResource(() => props.id, async id => (await api({ id })).data)
```

- Vertical split with `split-grid`
- Top: `VisitInspector`
- Bottom: `FitsHeaderInfo`
- Initial ratio: `1fr 8px 250px` (bottom fixed at 250px)

### 2. VisitDetailContext

Holds selected FITS file info:

```typescript
type FitsId = {
  visit_id: number
  type: 'sps' | 'mcs' | 'agc'
  fits_id: number  // camera_id, frame_id, or exposure_id
}
```

### 3. VisitInspector

#### Summary Display

| Item | Content |
|------|---------|
| ID | Visit ID and navigation button to left list |
| Description | pfs_visit_description |
| Issued at | Issue timestamp |
| Number of Exposures | SpS/MCS/AGC exposure counts |
| Notes | Notes associated with Visit (add/edit/delete) |

#### Tabs

1. **SpS**: SpS exposure list (with images)
2. **MCS**: MCS exposure list (with images)
3. **AGC**: AGC exposure list (with images)
4. **IIC Sequence**: Sequence info
5. **Sequence Group**: Sequence group info

Tab switching calls `setFitsId` to update FitsHeaderInfo display.

### 4. SpsInspector

- Display exposure type, count, average exposure time
- Image Type selection (Raw / postISRCCD)
- Image Size selection (Small / Medium / Large)
- Download All (bulk FITS download)
- **4x4 grid table** for exposure images
  - Rows: arm (n, r, m, b)
  - Columns: module (1-4)
  - Each cell: camera ID, image preview, download button

### 5. McsInspector

- Display exposure count, average exposure time
- Image Type selection (Plot / Raw)
- Image Size selection
- **List format** for each exposure
  - Frame ID
  - Plot image (`/api/mcs_data/{frame_id}.png`)
  - Raw image (`/api/fits/visits/{visit_id}/mcs/{frame_id}.png`)
  - FITS header display button
  - FITS download button
  - JSON preview button

### 6. AgcInspector

- Display exposure count, average exposure time
- Image Size selection
- **Pagination** (20 per page)
- Display 6 camera images for each exposure
  - Exposure ID
  - Image preview for 6 HDUs (cameras)

### 7. IicSequence

- Display Visit Set ID, Name, Type, Status
- Display command string (cmd_str)
- Display comments
- **Notes feature** (add/edit/delete)

### 8. SequenceGroup

- Display Group ID, Name, Created at

### 9. FitsHeaderInfo

- Display selected FITS file header info
- HDU selection (0, 1, 2, ...)
- Key/Value/Comment search filter
- Table format display

---

## Backend API

### `/api/visits/{id}` Response

```typescript
interface VisitDetail {
  id: number
  description: string | null
  issued_at: string | null
  notes: VisitNote[]
  sps: SpsVisit | null
  mcs: McsVisit | null
  agc: AgcVisit | null
  iic_sequence: IicSequenceDetail | null
}

interface SpsVisit {
  exp_type: string
  exposures: SpsExposure[]
}

interface SpsExposure {
  camera_id: number
  exptime: number
  exp_start: string
  exp_end: string
  annotation: SpsAnnotation[]
}

interface McsVisit {
  exposures: McsExposure[]
}

interface McsExposure {
  frame_id: number
  exptime: number | null
  altitude: number | null
  azimuth: number | null
  insrot: number | null
  // ... other environment info
  taken_at: string
  notes: McsExposureNote[]
}

interface AgcVisit {
  exposures: AgcExposure[]
}

interface AgcExposure {
  id: number
  exptime: number | null
  altitude: number | null
  azimuth: number | null
  insrot: number | null
  // ... other environment info
  taken_at: string | null
  guide_offset: AgcGuideOffset | null
}

interface IicSequenceDetail extends IicSequence {
  notes: VisitSetNote[]
  group: SequenceGroup | null
  status: IicSequenceStatus | null
}
```

### Image Retrieval APIs (Existing Project)

| Endpoint | Description |
|----------|-------------|
| `/api/fits/visits/{visit_id}/sps/{camera_id}.png` | SpS exposure image preview |
| `/api/fits/visits/{visit_id}/sps/{camera_id}.fits` | SpS exposure FITS download |
| `/api/fits/visits/{visit_id}/mcs/{frame_id}.png` | MCS exposure image preview |
| `/api/fits/visits/{visit_id}/mcs/{frame_id}.fits` | MCS exposure FITS download |
| `/api/fits/visits/{visit_id}/agc/{exposure_id}.png` | AGC exposure image preview |
| `/api/fits/visits/{visit_id}/agc/{exposure_id}.fits` | AGC exposure FITS download |
| `/api/mcs_data/{frame_id}.png` | MCS plot image |
| `/api/fits/visits/{visit_id}/{exposure_type}/{fits_id}/meta` | FITS header info |

---

## Implementation Priority (Proposal)

### Phase 1: Basic Structure

1. Implement `/api/visits/{id}` endpoint (backend)
2. Create `VisitDetail` component (no tabs, summary only)
3. Display basic info (ID, Description, Issued at, exposure counts)

### Phase 2: Exposure Info Tabs

1. Implement `SpsInspector` (no images, table only)
2. Implement `McsInspector` (no images, list only)
3. Implement `AgcInspector` (no images, list only)
4. Implement `IicSequence`
5. Implement `SequenceGroup`

### Phase 3: Image Features

1. Implement FITS image API (backend)
2. Image preview feature
3. FITS download feature

### Phase 4: FITS Header

1. Implement FITS header API (backend)
2. Implement `FitsHeaderInfo` component
3. Vertical split layout

### Phase 5: Notes Feature

1. Notes CRUD API (use existing `VisitNote`)
2. Notes UI implementation

---

## Libraries Used (Existing Project)

- **split-grid**: Vertical split resizing
- **tippy.js**: Tooltips
- **SolidJS**: UI framework (new project uses React)

---

## Notes

- Existing project is written in SolidJS, requires porting to React
- `createSignal` → `useState`
- `createResource` → RTK Query
- `createMemo` → `useMemo`
- `createEffect` → `useEffect`
- `For` → `map`
- `Show` → Conditional rendering
