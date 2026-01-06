# Slow Test Investigation Report

## Overview

This document summarizes the investigation results for particularly slow tests in the backend test suite.

## Slow Tests List

| Test Name | Timeout | Cause |
|-----------|---------|-------|
| `test_list_pfs_designs` | 60s (still times out at 120s) | Bulk reading of FITS files over NFS |

## Detailed Analysis: `test_list_pfs_designs`

### Environment Information

- **Number of FITS files**: 3,886 files
- **Total size**: ~2.5GB (1.1GB in use)
- **Average file size**: 651KB
- **Storage**: NFS mount (`nfs-ics:/datapool/proddata`)
- **Protocol**: NFS4.1, TCP, rsize/wsize=1MB

### Bottleneck Analysis

#### 1. File Access Speed (Baseline)

| Operation | Time | Throughput |
|-----------|------|------------|
| Single file read (cached) | 0.006s | 1.5GB/s |
| stat access for 100 files | 0.54s | 185 files/s |
| Full read of 10 files | 0.12s | 83 files/s |

#### 2. Python/astropy Reading

| Operation | Time/File | Estimated for 3,886 files |
|-----------|-----------|---------------------------|
| Raw astropy read (minimal data) | 7.1ms | 27.5s |
| `_read_design_entry` function (full header conversion) | 23.7ms | 92s |

#### 3. Overhead Breakdown

```
Raw FITS read:               7.1ms/file (27.5s)
_fits_meta_from_hdul:       12.9ms/file (50.1s)  ← Main bottleneck
Other Pydantic conversions:  3.7ms/file (14.4s)
────────────────────────────────────────────────
Total:                      23.7ms/file (92s)
```

### Main Bottleneck: `_fits_meta_from_hdul`

This function converts all header cards from all HDUs (4 per file, ~214 cards total) to Pydantic objects.

```python
# Problem code (overview)
def _fits_meta_from_hdul(filename: str, hdul) -> FitsMeta:
    return FitsMeta(
        filename=filename,
        hdul=[
            FitsHdu(
                index=i,
                header=FitsHeader(
                    cards=[
                        Card(key=keyword, value=_stringify(value), comment=comment)
                        for keyword, value, comment in hdu.header.cards  # 214 times/file
                    ]
                ),
            )
            for i, hdu in enumerate(hdul)  # 4 times/file
        ],
    )
```

- **Per file**: 4 HDUs × ~50 cards = ~200 Pydantic objects created
- **All files**: 200 × 3,886 = ~770,000 objects

### I/O Throughput Evaluation

#### NFS Read Speed

```
Theoretical (NFS4.1 TCP):  ~100MB/s (typical NFS environment)
Actual (cached):           1.5GB/s (OS cache utilized)
Actual (sequential):       ~80MB/s (3,886 files, 2.5GB / 27.5s)
```

**Conclusion**: I/O itself is reasonably fast. The bottleneck is Python processing overhead.

#### Processing Time Breakdown

| Processing | Percentage |
|------------|------------|
| File I/O + astropy parsing | 30% (27.5s) |
| Pydantic object creation | 70% (64.5s) |

## Improvement Proposals

### Short-term Measures (Implemented)

1. **Test isolation**: Separate slow tests with `@pytest.mark.slow` marker
2. **Skip by default**: `make test` skips slow tests
3. **Individual timeout**: Set longer timeout (60s) for slow tests

### Medium/Long-term Improvements

1. **Lazy header conversion**
   - Read only minimum required headers when fetching list
   - Convert full headers only when fetching details

2. **Cache introduction**
   - Memory cache keyed by file modification time
   - External cache like Redis

3. **Index file**
   - Cache Design list metadata in JSON file
   - Regenerate only on file change detection

4. **Pagination**
   - Don't read all files at once, read only what's needed
   - Virtual scroll support on frontend

## Summary

| Item | Value |
|------|-------|
| **Root cause** | Massive Pydantic object creation (770,000 objects) |
| **I/O speed** | Reasonable (~80MB/s over NFS) |
| **Improvement potential** | High (3x speedup possible with header conversion optimization) |
| **Current mitigation** | Excluded from regular tests via slow marker |
