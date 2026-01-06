# PFS Design API Performance Optimization Proposal

## Overview

This document summarizes the analysis and optimization proposals for performance issues occurring in PFS Design-related APIs.

## Problematic Endpoints

| Endpoint | Processing Time (est.) | Main Cause |
|----------|------------------------|------------|
| `GET /api/pfs_designs` | ~92s (3,886 files) | Bulk FITS file reading + massive Pydantic object generation |

---

## 1. Design List API (`GET /api/pfs_designs`)

### Current Issues

1. **Sequential reading of all FITS files**
   - 3,886 files × 23.7ms/file = ~92 seconds

2. **Massive Pydantic object generation** (main bottleneck)
   - `_fits_meta_from_hdul()` converts all header cards from all HDUs
   - Per file: 4 HDUs × ~50 cards = ~200 objects
   - All files: ~770,000 Pydantic objects generated

3. **Reading unnecessary data for list display**
   - Only basic metadata needed for list
   - Full header cards only needed for detail display

### Processing Time Breakdown

```
Processing                    Time/File    All Files (3,886)
─────────────────────────────────────────────────────────────
File I/O + astropy parsing     7.1ms       27.5s (30%)
_fits_meta_from_hdul          12.9ms       50.1s (54%)  ← Main bottleneck
Other Pydantic conversions     3.7ms       14.4s (16%)
─────────────────────────────────────────────────────────────
Total                         23.7ms       92s
```

### Optimization Proposals

#### Proposal 1: Lazy Header Conversion (Recommended, High Impact)

Don't generate `FitsMeta` when fetching list, read only minimum required headers directly.

**Current code:**
```python
def _read_design_entry(path: Path) -> PfsDesignEntry:
    with afits.open(path) as hdul:
        meta = _fits_meta_from_hdul(path.name, hdul)  # Converts all headers (slow)
        return PfsDesignEntry(
            name=meta.hdul[0].header.value("DSGN_NAM") or "",
            ra=float(meta.hdul[0].header.value("RA") or 0.0),
            ...
        )
```

**Improved version:**
```python
def _read_design_entry(path: Path) -> PfsDesignEntry:
    with afits.open(path) as hdul:
        header = hdul[0].header  # Direct header reference
        return PfsDesignEntry(
            id=_pick_id(path.name),
            frameid=path.name,
            name=header.get("DSGN_NAM", ""),
            ra=float(header.get("RA", 0.0)),
            dec=float(header.get("DEC", 0.0)),
            arms=header.get("ARMS", "-"),
            ...
        )
```

**Expected effect:**
- Removing `_fits_meta_from_hdul` call saves **~50 seconds**
- Estimated processing time: 92s → ~42s (**54% reduction**)

#### Proposal 2: File-based Cache Introduction (Recommended, High Impact)

Port the `PickleCache` implemented in the old project to cache Design list.

**Implementation approach:**
1. SQLite-based cache metadata management
2. Invalidation by file modification time (`st_mtime`)
3. Total size limit and LRU eviction

**Cache key design:**
```python
cache_key = f"design_entry:{path.name}"
valid_after = path.stat().st_mtime
```

**Expected effect:**
- 2nd request onwards: 92s → **hundreds of milliseconds** (cache hit)
- First request: ~42s combined with Proposal 1

#### Proposal 3: Parallel Processing Introduction (Medium Impact)

The old project parallelized with `asyncio.gather` + thread pool.

```python
# Old project implementation
design_list = list(await asyncio.gather(*(
    background_thread(DesignEntryTask(p)) for p in paths
)))
```

**Implementation proposal:**
```python
from concurrent.futures import ThreadPoolExecutor

def list_pfs_designs():
    paths = list(design_dir.glob("pfsDesign-0x*.fits"))
    
    with ThreadPoolExecutor(max_workers=8) as executor:
        design_list = list(executor.map(_read_design_entry, paths))
    
    return sorted(design_list, key=lambda d: d.date_modified, reverse=True)
```

**Expected effect:**
- **2-4x speedup** for I/O-bound processing parallelization
- Combined with Proposal 1: 42s → ~10-20s

#### Proposal 4: Pagination Introduction (Medium Impact)

Don't read all files at once, read only what's needed.

**Challenge:**
- Need all files' `st_mtime` for date sorting
- `stat()` only is fast (~0.5s for 3,886 files)

**Implementation proposal:**
1. Get `(path, st_mtime)` list for all files (fast)
2. Sort and read FITS only for the page needed

```python
@router.get("")
def list_pfs_designs(
    offset: int = 0,
    limit: int = 100,
):
    # 1. Get stat info for all files (fast)
    files = [(p, p.stat().st_mtime) for p in design_dir.glob("pfsDesign-0x*.fits")]
    files.sort(key=lambda x: x[1], reverse=True)
    
    # 2. Read FITS only for needed page
    page_files = files[offset:offset + limit]
    return [_read_design_entry(p) for p, _ in page_files]
```

**Expected effect:**
- When showing 100 items: 92s → ~2.4s (limit=100)

#### Proposal 5: Index File Generation (High Impact, High Complexity)

Pre-cache Design list metadata in a JSON file.

**Implementation proposal:**
1. Periodically update index via background job
2. Differential update on file change detection (inotify/watchdog)
3. API just reads the index file

```json
// /var/cache/pfs-obslog/pfs_designs_index.json
{
  "updated_at": "2025-12-31T12:00:00Z",
  "designs": [
    {
      "id": "1234567890abcdef",
      "frameid": "pfsDesign-0x1234567890abcdef.fits",
      "name": "...",
      "date_modified": "2025-12-30T10:00:00Z",
      ...
    }
  ]
}
```

**Expected effect:**
- API response time: **tens of milliseconds**
- Requirement: Background process operation

---

## Implementation Priority

| Priority | Proposal | Target API | Impact | Effort |
|----------|----------|------------|--------|--------|
| 1 | Lazy header conversion | List | High (54% reduction) | Low |
| 2 | File-based cache | List | High (99% reduction after 2nd) | Medium |
| 3 | Parallel processing | List | Medium (2-4x) | Low |
| 4 | Pagination | List | Medium | Medium |
| 5 | Index file | List | High | High |

### Recommended Implementation Order

1. **Phase 1** (Quick wins)
   - Proposal 1: Lazy header conversion
   - Proposal 3: Parallel processing introduction
   - **Expected result**: 92s → 10-20s

2. **Phase 2** (Cache foundation)
   - Proposal 2: File-based cache introduction
   - **Expected result**: 2nd onwards → hundreds of milliseconds

3. **Phase 3** (Future work)
   - Proposal 4: Pagination (requires frontend changes)
   - Proposal 5: Index file (depending on operational requirements)

---

## Appendix: Comparison with Old Project

| Item | Old Project | New Project (current) |
|------|-------------|----------------------|
| Cache | PickleCache (SQLite + file) | None |
| Parallel processing | asyncio + ThreadPoolExecutor | None (sequential) |
| Header conversion | Full header conversion (same issue) | Full header conversion |

The old project also didn't implement lazy header conversion, but achieved practical speed through caching. The new project needs cache infrastructure.

---

## References

- [docs/testing.md](../development/testing.md) - Slow test investigation report
- Old project implementation: `old-project/codebase/backend/src/pfs_obslog/app/routers/pfsdesign.py`
- Old project cache: `old-project/codebase/backend/src/pfs_obslog/filecache/__init__.py`
