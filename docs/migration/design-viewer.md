# Design Viewer Specification

This document describes the detailed specification of the Design Viewer feature from the existing project (`old-project/codebase/webui/src/pages/Designs`). Use this as a reference when porting to the new project.

## Overview

Design Viewer is a feature for visualizing and managing PFS (Prime Focus Spectrograph) observation designs (PFS Design). It consists of three main components:

1. **DesignList** - Design list side panel
2. **SkyViewer** - WebGL-based celestial sphere main view
3. **DesignDetail** - Focal plane view and fiber detail panel

### Page Layout

```
+------------------+------------------------------------------+
|                  |                                          |
|   DesignList     |           SkyViewer                      |
|   (Left Side)    |           (Celestial Sphere)             |
|                  |                                          |
|                  +------------------------------------------+
|                  |                                          |
|                  |           DesignDetail                   |
|                  |           (Focal Plane View)             |
+------------------+------------------------------------------+
```

### Authentication

Design Viewer is a page that requires authentication (wrapped with `requireLogin`).

---

## 1. DesignList (Design List)

### 1.1 Feature Overview

Displays the Design list in the left side panel. Provides search, sort, and filtering features.

### 1.2 Display Items

Each Design entry displays the following information:

| Item | Description | Example |
|------|-------------|---------|
| name | Design name | `COSMOS_deep_1` |
| id | Design ID (Hex/Decimal switchable) | `1a2b3c4d5e6f7890` |
| date_modified | Modified date/time | `2025-12-30 12:34:56` |
| Fiber count | science/sky/fluxstd/photometry/guidestar | `100 / 20 / 10 / 50 / 6` |
| Coordinates | RA, Dec, Altitude | `α=150.00°, δ=2.00°, Alt.=45.00°` |

### 1.3 User Settings (localStorage)

| Setting Key | Options | Default | Description |
|-------------|---------|---------|-------------|
| `/DesignList/idFormat` | `hex` / `decimal` | `hex` | ID display format |
| `/DesignList/sortOrder` | `altitude` / `date_modified` | `altitude` | Sort order |

### 1.4 Search/Filtering

- **Search textbox**: Regex search by Design name or ID
- Case-insensitive (`'i'` flag)
- Invalid regex falls back to string match

### 1.5 Sorting

1. **altitude (Altitude order)**: Sort by angular distance from current zenith (easiest to observe first)
2. **date_modified (Modified date order)**: Newest first

### 1.6 Grouping

Designs near the same coordinates (within 0.001 degrees) are displayed as the same group.

```typescript
const designCrossMatchCosine = Math.cos(angle.deg2rad(0.001))
```

### 1.7 Entry Action Buttons

| Button | Icon | Function |
|--------|------|----------|
| Download | `download` | Download FITS file |
| Copy ID | `content_copy` | Copy ID to clipboard |

### 1.8 Interactions

- **Click**: Select Design and jump to its position in the celestial sphere view
- **Mouse hover**: Focus display (also highlighted on celestial sphere)
- **Selected**: Highlighted in cyan
- **Focused**: Highlighted in magenta

### 1.9 Styles

```scss
// Selection state colors
.entry-selected { background: linear-gradient(to bottom, #0ff lighter, #0ff darker) }
.entry-hover { background: linear-gradient(to bottom, #cac lighter, #cac darker) }
.entry-selected-hover { background: linear-gradient(to bottom, #aff lighter, #aff darker) }
```

---

## 2. SkyViewer (Celestial Sphere Display)

### 2.1 Tech Stack

- **@stellar-globe/stellar-globe**: WebGL-based celestial sphere visualization library
- Pan-STARRS DR1 image tiles (HiPS format) displayed as background
- React version: `react-stellar-globe` package exists in `external/stellar-globe/react-stellar-globe`

### 2.2 Display Layers

The following layers are rendered in order:

1. **HipparcosCatalogLayer**: Stars from Hipparcos star catalog
2. **ConstellationLayer**: Constellation lines
3. **SimpleImageLayer**: Pan-STARRS DR1 celestial images (HiPS)
   - URL: `//alasky.cds.unistra.fr/Pan-STARRS/DR1/color-i-r-g`
   - LOD Bias: -0.25
4. **GridLayer (AltAz)**: Altitude-azimuth coordinate grid
   - Horizon (red): 12 divisions
   - Zenith direction: Orange
   - Reference color: Blue
5. **GridLayer (EquatorialGrid)**: Equatorial coordinate grid (white, light)
6. **MarkersLayer**: Design position markers (circles)
7. **SingleMarker**: Focused/selected Design marker

### 2.3 Camera Settings

```typescript
const tilt = Math.PI / 2  // Tilt from zenith toward horizon

// Initial field of view
fovy: 2  // radians

// When jumping to a Design
fovy: angle.deg2rad(0.8)  // About 0.8 degrees
```

### 2.4 Design Markers

```typescript
const FOV = angle.deg2rad(1.4)  // Marker diameter (corresponds to PFS field of view)
const markerColor: V4 = [0.75, 0.75, 0.5, 1]  // Normal
const focusColor: V4 = [1, 0, 1, 0.75]        // Focus (magenta)
const selectedColor: V4 = [0, 1, 1, 1]        // Selected (cyan)
```

### 2.5 Time Controls

| UI Element | Function |
|------------|----------|
| DatePicker | Date selection (HST basis) |
| Clock | Analog clock UI (drag to change time) |
| "Set time to now" | Set to current time |
| "Center Zenith" | Center view on zenith |
| "Fiber Markers" | Toggle fiber marker display ON/OFF |

### 2.6 Hawaii Standard Time (HST)

```typescript
const HstTzOffset = 600  // Minutes (UTC-10:00)
```

### 2.7 Subaru Telescope Location

```typescript
const SubaruTelescopeLocation = {
  lat: angle.dms2deg('19:49:32'),   // North 19°49'32"
  lon: angle.dms2deg('-155:28:36')  // West 155°28'36"
}
```

### 2.8 Mouse Operations

- **Drag**: Pan (move view)
- **Scroll**: Zoom
- **Marker click**: Select Design
- **Marker hover**: Focus Design

---

## 3. DesignDetail (Focal Plane View)

### 3.1 Components

1. **FocalPlane**: PFS focal plane fiber layout visualization (Canvas 2D)
2. **Color scheme selection**: Target Type / Fiber Status
3. **Legend**: Display color meanings
4. **FiberDetail / DesignSummary**: Detail information panel

### 3.2 FocalPlane Component

#### 3.2.1 Geometric Structure

```
- 3 sectors (Fields)
- 14 modules per sector
- 57 cobras per module
- Total: 3 × 14 × 57 = 2,394 cobras
```

#### 3.2.2 Cobra Position Calculation

```typescript
const DELX = Math.sqrt(3)  // Horizontal spacing
const DELY = 1             // Vertical spacing

// Calculate local coordinates from Cobra ID (1-based)
const x0 = -DELX * ((cm0 % 2 == 0 ? 1 : 2) + 2 * mf0)
const y0 = -DELY * ((cm0 - 1) - 2 * mf0)

// Rotate according to sector (120 degrees each)
const [x, y] = rotation(x0, y0, f0 * 4 * Math.PI / 3)
```

#### 3.2.3 Display Size

- Default size: 250px (width is √3/2 times)
- Hexagon radius: 58 (unit coordinate system)

### 3.3 Color Scheme Modes

#### 3.3.1 Target Type

| Value | Name | Color | Description |
|-------|------|-------|-------------|
| 1 | SCIENCE | lightsteelblue | Science target |
| 2 | SKY | yellow | Sky (for sky subtraction) |
| 3 | FLUXSTD | magenta | Flux standard star |
| 4 | UNASSIGNED | gray | Unassigned |
| 5 | ENGINEERING | red | Engineering |
| 6 | SUNSS_IMAGING | olive | SuNSS Imaging |
| 7 | SUNSS_DIFFUSE | blue | SuNSS Diffuse |

#### 3.3.2 Fiber Status

| Value | Name | Color | Description |
|-------|------|-------|-------------|
| 1 | GOOD | lightsteelblue | Normal |
| 2 | BROKENFIBER | red | Broken |
| 3 | BLOCKED | orange | Temporarily blocked |
| 4 | BLACKSPOT | purple | Behind black spot |
| 5 | UNILLUMINATED | blue | Unilluminated |

### 3.4 FiberDetail (Fiber Detail)

Displays detailed information for the hovered cobra:

#### 3.4.1 Fiber Information

| Item | Description |
|------|-------------|
| Cobra Id | Cobra ID (1-2394) |
| Fiber Id | Fiber ID |
| Module ID | Module ID (1-42) |
| Sector ID | Sector ID (1-3) |

#### 3.4.2 Design Information

| Item | Description |
|------|-------------|
| catId | Catalog ID |
| Tract/Patch | Tract/Patch |
| objId | Object ID |
| α | Right Ascension |
| δ | Declination |
| Target Type | Target type name |
| Fiber Status | Fiber status name |
| pfiNominal | Nominal position |

#### 3.4.3 Photometry Information

| Item | Unit | Description |
|------|------|-------------|
| filterName | - | Filter name |
| fiberFlux | nJy | Fiber flux |
| fiberFluxErr | nJy | Fiber flux error |
| psfFlux | nJy | PSF flux |
| psfFluxErr | nJy | PSF flux error |
| totalFlux | nJy | Total flux |
| totalFluxErr | nJy | Total flux error |

### 3.5 DesignSummary (Design Summary)

Displayed when not hovering over a cobra:

| Item | Source |
|------|--------|
| Name | FITS header `DSGN_NAM` |
| Modified | File modified date/time |
| α | FITS header `RA` |
| δ | FITS header `DEC` |
| Position Angle | FITS header `POSANG` |
| Arms | FITS header `ARMS` |

---

## 4. DesignDetail in SkyViewer (Fiber Markers)

### 4.1 Overview

Displays fiber positions of the selected Design as markers on the celestial sphere.

### 4.2 Marker Types

| Type | Shape | Target |
|------|-------|--------|
| Circle | Circle | Target fibers |
| Polygon (Triangle) | Triangle | Guide stars |

### 4.3 Colors

Target fibers are displayed in colors according to Target Type.
Guide stars are red.

### 4.4 Display Control

- "Fiber Markers" checkbox to toggle ON/OFF
- Alpha value changes according to zoom level (faint when zoomed out, solid when close)

```typescript
const minFovy = Math.log(angle.deg2rad(0.025))
const maxFovy = Math.log(angle.deg2rad(2))
// Alpha changes from 0 to 1 as fovy goes from maxFovy to minFovy
```

---

## 5. Context (State Management)

### 5.1 Designs2Provider

Manages the following state:

| State | Type | Description |
|-------|------|-------------|
| designs | `{ store: { list: PfsDesignEntry[] }, loading, refetch }` | Design list |
| designDetail | `Resource<PfsDesignDetail>` | Selected Design details |
| showFibers | `boolean` | Fiber marker display |
| jumpToSignal | `JumpToOptions` | Camera jump instruction |
| focusedDesign | `PfsDesignEntry \| undefined` | Focused Design |
| selectedDesign | `PfsDesignEntry \| undefined` | Selected Design |
| now | `Date` | Display time |
| telescopeLocation | `{ lat, lon }` | Telescope location |
| zenithSkyCoord | `SkyCoord` | Current zenith coordinates |

### 5.2 URL Routing

```
/designs                  → No Design selected
/designs/{design_id}      → Specified Design selected
```

When a Design is selected, the URL parameter `design_id` is updated.
When accessing URL directly, the corresponding Design is auto-selected and focused.

---

## 6. API Endpoints

### 6.1 APIs Used

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/pfs_designs` | Get Design list |
| GET | `/api/pfs_designs/{id_hex}` | Get Design details |
| GET | `/api/pfs_designs/{id_hex}.fits` | Download FITS file |

### 6.2 PfsDesignEntry Schema

```typescript
interface PfsDesignEntry {
  id: string              // Hex ID
  frameid: string         // Filename
  name: string            // Design name
  date_modified: string   // ISO 8601 datetime
  ra: number              // Right Ascension (degrees)
  dec: number             // Declination (degrees)
  arms: string            // Arms in use
  num_design_rows: number // Number of design rows
  num_photometry_rows: number
  num_guidestar_rows: number
  design_rows: {
    science: number
    sky: number
    fluxstd: number
    unassigned: number
    engineering: number
    sunss_imaging: number
    sunss_diffuse: number
  }
}
```

### 6.3 PfsDesignDetail Schema

```typescript
interface PfsDesignDetail {
  fits_meta: FitsMeta
  date_modified: string
  design_data: {
    fiberId: number[]
    catId: number[]
    tract: number[]
    patch: string[]
    objId: number[]
    ra: number[]
    dec: number[]
    targetType: number[]
    fiberStatus: number[]
    pfiNominal: [number, number][]
  }
  photometry_data: {
    fiberId: number[]
    fiberFlux: number[]
    psfFlux: number[]
    totalFlux: number[]
    fiberFluxErr: number[]
    psfFluxErr: number[]
    totalFluxErr: number[]
    filterName: string[]
  }
  guidestar_data: {
    ra: number[]
    dec: number[]
  }
}
```

---

## 7. Dependencies

### 7.1 stellar-globe

WebGL celestial sphere visualization library.

**Used in existing project (SolidJS version):**
```typescript
import { Globe, SkyCoord, angle, ... } from '@stellar-globe/stellar-globe'
```

**New project (React version):**
```
external/stellar-globe/react-stellar-globe
```

Main exports:
- `Globe$` - Globe component
- `HipparcosCatalogLayer$` - Star layer
- `ConstellationLayer$` - Constellation layer
- `HipsSimpleLayer$` - HiPS image layer
- `GridLayer$` - Grid layer
- `MarkerLayer$` - Marker layer
- `PathLayer$` - Path layer
- `useGetGlobe` - Globe instance hook

### 7.2 Other Dependencies

| Library | Purpose |
|---------|---------|
| gl-matrix | Matrix/vector operations |
| Color | Color manipulation (legend.ts) |
| KdTree | Spatial index (marker selection) |

---

## 8. Implementation Notes

### 8.1 SolidJS → React Conversion

| SolidJS | React |
|---------|-------|
| `createSignal` | `useState` |
| `createEffect` | `useEffect` |
| `createMemo` | `useMemo` |
| `createResource` | RTK Query |
| `on([deps], fn)` | `useEffect` with deps |
| `For` | `Array.map` |
| `Show` | Conditional rendering |

### 8.2 Using React Version of stellar-globe

Replace existing SolidJS code with components/hooks from `react-stellar-globe`.

```tsx
// Example: React version usage
import { Globe$, HipsSimpleLayer$, MarkerLayer$ } from 'react-stellar-globe'

function SkyViewer() {
  return (
    <Globe$ viewOptions={{ fovy: 2 }}>
      <HipsSimpleLayer$ baseUrl="..." />
      <MarkerLayer$ markers={...} />
    </Globe$>
  )
}
```

### 8.3 Cobra ID → Fiber ID Mapping

A `cobId2fiberId.json` mapping file is required.
Port from `old-project/codebase/webui/src/components/pfs/cobId2fiberId.json`.

### 8.4 Performance Considerations

- Design list search uses debounce (100ms)
- Zenith coordinate calculation also debounced
- Fiber markers are numerous (thousands), rendered efficiently with BillboardRenderer

### 8.5 localStorage Keys

| Key | Value |
|-----|-------|
| `/DesignList/idFormat` | `'hex'` \| `'decimal'` |
| `/DesignList/sortOrder` | `'altitude'` \| `'date_modified'` |

---

## 9. File Structure (Post-Migration)

```
frontend/src/
├── pages/
│   └── Designs/
│       ├── index.tsx           # Main page
│       ├── DesignsContext.tsx  # State management
│       ├── types.ts            # Type definitions
│       ├── legend.ts           # Color definitions
│       ├── DesignList/
│       │   ├── index.tsx
│       │   └── DesignList.module.scss
│       ├── SkyViewer/
│       │   ├── index.tsx
│       │   ├── StellarGlobe.tsx
│       │   ├── DesignCircles.tsx
│       │   ├── DesignMarkers.tsx
│       │   ├── Clock/
│       │   │   ├── index.tsx
│       │   │   ├── drawClock.ts
│       │   │   └── Clock.module.scss
│       │   └── SkyViewer.module.scss
│       └── DesignDetail/
│           ├── index.tsx
│           ├── FiberDetail.tsx
│           ├── DesignSummary.tsx
│           └── DesignDetail.module.scss
├── components/
│   └── FocalPlane/
│       ├── index.tsx
│       ├── Cobra.ts
│       ├── cobId2fiberId.json
│       └── FocalPlane.module.scss
```

---

## 10. Migration Checklist

### 10.1 Foundation

- [ ] stellar-globe (React version) integration setup
- [ ] Routing configuration (`/designs`, `/designs/:design_id`)
- [ ] Type definitions (PfsDesignEntry, PfsDesignDetail)
- [ ] API integration (RTK Query)

### 10.2 DesignList

- [ ] Design list display
- [ ] Search feature
- [ ] Sort feature (altitude/date_modified)
- [ ] ID display format toggle (hex/decimal)
- [ ] Grouping display
- [ ] Selection/focus state
- [ ] FITS download button
- [ ] ID copy button
- [ ] localStorage persistence

### 10.3 SkyViewer

- [ ] Globe basic display
- [ ] HiPS image layer
- [ ] Star/constellation layers
- [ ] Grid layers (AltAz, Equatorial)
- [ ] Design marker display
- [ ] Marker selection/focus
- [ ] Time controls (DatePicker, Clock)
- [ ] Zenith centering
- [ ] Fiber marker display

### 10.4 DesignDetail

- [ ] FocalPlane rendering
- [ ] Color scheme mode toggle
- [ ] Legend display
- [ ] Fiber detail display
- [ ] Design summary display

### 10.5 Other

- [ ] URL parameter synchronization
- [ ] Error handling
- [ ] Loading state display
- [ ] Responsive design

---

## 11. References

### 11.1 Existing Code

- `old-project/codebase/webui/src/pages/Designs/` - Main implementation
- `old-project/codebase/webui/src/components/pfs/FocalPlane.tsx` - Focal plane component
- `old-project/codebase/webui/src/components/pfs/cobId2fiberId.json` - ID mapping

### 11.2 External Resources

- [stellar-globe](https://github.com/niceno/stellar-globe) - Celestial sphere visualization library
- [PFS datamodel](https://github.com/Subaru-PFS/datamodel) - Data model specification
- [HiPS (Hierarchical Progressive Surveys)](https://aladin.unistra.fr/hips/) - Celestial image format

### 11.3 Backend API

- [backend/src/pfs_obslog/routers/pfs_designs.py](../../backend/src/pfs_obslog/routers/pfs_designs.py) - PFS Design API implementation
