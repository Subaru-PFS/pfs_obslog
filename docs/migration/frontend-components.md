# Frontend Component Migration Status

This document tracks the frontend component migration status from the existing project (`old-project/codebase/webui`) to the new project.

**Note**: The existing project is implemented in SolidJS, and the new project is ported to React.

## Migration Status Summary

| Category | Completed | Partial | Not Started | Progress |
|----------|-----------|---------|-------------|----------|
| Pages/Layout | 5 | 0 | 0 | 100% |
| Common Components | 8 | 0 | 0 | 100% |
| Home: Visit List | 8 | 0 | 0 | 100% |
| Home: Visit Detail | 12 | 0 | 0 | 100% |
| Home: Note Feature | 4 | 0 | 0 | 100% |
| Designs Feature | 5 | 0 | 0 | 100% |
| **Total** | **42** | **0** | **0** | **100%** |

---

## Pages/Layout

| Old Component | Old Path | New Component | New Path | Status | Notes |
|---------------|----------|---------------|----------|--------|-------|
| Login | `pages/Login` | Login | `pages/Login` | ✅ Done | Login form |
| Header | `pages/Header` | Header | `components/Header` | ✅ Done | Header (navigation, logout) |
| Home | `pages/Home` | Home | `pages/Home` | ✅ Done | Visit list/detail page |
| SqlSyntaxHelp | `pages/Home/SqlSyntaxHelp` | SqlSyntaxHelp | `pages/SqlSyntaxHelp` | ✅ Done | SQL syntax help page |
| Designs | `pages/Designs` | Designs | `pages/Designs` | ✅ Done | PFS Design list/detail page |

---

## Common Components (components/)

| Old Component | Old Path | New Component | New Path | Status | Notes |
|---------------|----------|---------------|----------|--------|-------|
| Icon, IconButton | `components/Icon` | Icon, IconButton | `components/Icon` | ✅ Done | Material Symbols icons |
| Loading, Block | `components/Loading` | LoadingSpinner, LoadingOverlay | `components/LoadingSpinner`, `components/LoadingOverlay` | ✅ Done | Loading display |
| Tabs | `components/Tabs` | Tabs, TabPanel | `components/Tabs` | ✅ Done | Tab UI |
| tippy (Tippy) | `components/Tippy.tsx` | Tooltip | `components/Tooltip` | ✅ Done | Tooltip |
| LazyImage | `components/LazyImage` | LazyImage | `components/LazyImage` | ✅ Done | Lazy loading image |
| NoteList | `pages/Home/NoteList` | NoteList | `components/NoteList` | ✅ Done | Note list (CRUD support) |
| DatePicker, DateRangePicker | `components/DatePicker` | DateRangePicker | `components/DateRangePicker` | ✅ Done | Date range selection |
| FocalPlane | `components/pfs/FocalPlane.tsx` | FocalPlane | `components/FocalPlane` | ✅ Done | PFS focal plane visualization |

---

## Home Page Features (pages/Home/)

### Visit List (VisitSetList → VisitList)

| Old Feature | Old Component | New Component | Status | Notes |
|-------------|---------------|---------------|--------|-------|
| Visit list display | `VisitSetList` | `VisitList` | ✅ Done | Grouped by IicSequence |
| Column toggle | `VisitSetList/Columns` | `VisitList` (ColumnSelector) | ✅ Done | Column selection UI |
| SQL filtering | `VisitSetList/SearchTextBox` | `VisitList` (SearchBar) | ✅ Done | WHERE clause search |
| Pagination | `VisitSetList/Paginator` | `VisitList` (Paginator) | ✅ Done | Offset/limit |
| Go to Visit | `VisitSetList/ToolBar` (goToVisit) | `VisitList` | ✅ Done | Jump directly by Visit ID |
| CSV download | `VisitSetList/ToolBar` (downloadCsv) | `VisitList` | ✅ Done | Export list to CSV |
| Date range filter | `VisitSetList/SearchConditions` | `VisitList` + `DateRangePicker` | ✅ Done | Filter by issued_at date |
| SQL syntax help | `SqlSyntaxHelp` | `SqlSyntaxHelp` | ✅ Done | SQL syntax help page |

### Visit Detail (VisitDetail)

| Old Feature | Old Component | New Component | Status | Notes |
|-------------|---------------|---------------|--------|-------|
| Visit basic info | `VisitDetail` | `VisitDetail` (Summary) | ✅ Done | ID, description, issued time, exposure count |
| SPS Inspector | `VisitInspector/SpsInspector` | `SpsInspector` | ✅ Done | SPS exposure list, preview images |
| MCS Inspector | `VisitInspector/McsInspector` | `McsInspector` | ✅ Done | MCS exposure list, environment info |
| AGC Inspector | `VisitInspector/AgcInspector` | `AgcInspector` | ✅ Done | AGC exposure list, guide offset display |
| IIC Sequence Info | `VisitInspector/IicSequence` | `IicSequenceInfo` | ✅ Done | Sequence information display |
| Sequence Group Info | `VisitInspector/SequenceGroup` | `SequenceGroupInfo` | ✅ Done | Group information display |
| Visit Notes | `VisitDetail` (notes section) | `VisitDetail` + `NoteList` | ✅ Done | Note CRUD functionality |
| FITS Preview images | `SpsInspector` (LazyImage) | `SpsInspector` + `LazyImage` | ✅ Done | SPS FITS preview image display |
| Image Type/Size selection | `SpsInspector` (settings) | `SpsInspector` | ✅ Done | raw/postISRCCD, size selection |
| FITS Header Info | `FitsHeaderInfo` | `FitsHeaderDialog` | ✅ Done | FITS header display (SPS/MCS support, HDU selection, search), dialog format |
| FITS Download | `SpsInspector` (downloadRawExposures) | `SpsInspector`, `McsInspector`, `AgcInspector` | ✅ Done | FITS file download |
| MCS/AGC Preview images | `McsInspector`, `AgcInspector` | `McsInspector`, `AgcInspector` | ✅ Done | MCS/AGC FITS preview image display |

### Note Feature (NoteList)

| Old Feature | Old Component | New Component | Status | Notes |
|-------------|---------------|---------------|--------|-------|
| Note list display | `NoteList` | `NoteList` | ✅ Done | Display within Visit detail |
| Create note | `NoteList/NewNote` | `NoteList` | ✅ Done | Auth required |
| Edit note | `NoteList/Note` (edit) | `NoteList` | ✅ Done | Own notes only |
| Delete note | `NoteList/Note` (delete) | `NoteList` | ✅ Done | Own notes only |

---

## Designs Page Features (pages/Designs/)

| Old Feature | Old Component | New Component | Status | Notes |
|-------------|---------------|---------------|--------|-------|
| Design list | `DesignList` | `DesignList` | ✅ Done | PFS Design list (search, sort, grouping) |
| Design detail | `DesignDetail` | `DesignDetail` | ✅ Done | Focal plane visualization, fiber/design detail panel |
| Sky Viewer | `SkyViewer` | `SkyViewer` | ✅ Done | Celestial sphere visualization main view (HiPS, stars, constellations) |
| Stellar Globe | `SkyViewer/StellarGlobe.tsx` | `SkyViewer` | ✅ Done | 3D celestial sphere display via stellar-globe library |
| Design Circles | `SkyViewer/DesignCircles.tsx` | `SkyViewer` (DesignMarkers) | ✅ Done | Design marker rendering (click/hover support) |

---

## Legend

- ✅ **Done**: Implemented in new project
- 🔶 **Partial**: Basic features implemented, some features pending
- ⏳ **Not Started**: Not yet migrated
- 🚧 **In Progress**: Currently being implemented
- ❌ **Won't Migrate**: Determined unnecessary for new project

---

## Tech Stack Changes

| Item | Old | New |
|------|-----|-----|
| UI Framework | SolidJS | React 19 |
| Routing | solid-app-router | React Router v7 |
| State Management | SolidJS Signals | RTK Query |
| Styling | SCSS Modules | SCSS Modules |
| Build Tool | Vite | Vite |
| API Communication | openapi-typescript-fetch | RTK Query (openapi-codegen) |

---

## Change History

| Date | Description |
|------|-------------|
| 2024-12-30 | Initial version |
| 2024-12-30 | Updated with detailed per-component feature list |
| 2024-12-31 | Header, Layout, NoteList, LazyImage, SPS FITS Preview completed |
| 2024-12-31 | Go to Visit, SQL syntax help page completed |
| 2024-12-31 | Design Viewer completed (FocalPlane, DesignList, SkyViewer, DesignDetail) |
