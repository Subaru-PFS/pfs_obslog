# Visit List Endpoint Specification

This document summarizes the investigation results from the existing project (`old-project/codebase/backend/src/pfs_obslog/app/routers/visit/visit.py`).

## Endpoint

### GET /api/visits

Endpoint for retrieving the Visit list.

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `sql` | `Optional[str]` | `None` | SQL WHERE clause for filtering (special DSL) |
| `offset` | `int` | `0` | Pagination offset |
| `limit` | `Optional[int]` | `50` | Maximum number of records (negative value for null = unlimited) |

#### Response: `VisitList`

```python
class VisitList(BaseModel):
    visits: list[VisitListEntry]   # Visit list
    iic_sequence: list[IicSequence]  # Related sequence information
    count: int                       # Total count (for pagination)
```

#### VisitListEntry Structure

```python
class VisitListEntry(BaseModel):
    # Basic information
    id: int                          # pfs_visit_id
    description: Optional[str]       # pfs_visit_description
    issued_at: Optional[datetime]    # Issue timestamp
    visit_set_id: Optional[int]      # iic_sequence_id (belonging sequence)
    
    # Exposure counts (aggregated)
    n_sps_exposures: int             # SpS exposure count
    n_mcs_exposures: int             # MCS exposure count
    n_agc_exposures: int             # AGC exposure count
    
    # Averages (calculated from each subsystem)
    avg_exptime: Optional[float]     # Average exposure time (SpS > MCS > AGC priority)
    avg_azimuth: Optional[float]     # Average azimuth (from tel_status)
    avg_altitude: Optional[float]    # Average altitude (from tel_status)
    avg_ra: Optional[float]          # Average RA (from tel_status)
    avg_dec: Optional[float]         # Average Dec (from tel_status)
    avg_insrot: Optional[float]      # Average rotation angle (from tel_status)
    
    # Notes
    notes: list[VisitNote]           # Notes associated with Visit
    
    # QA information (from separate DB: QADB)
    seeing_median: Optional[float]   # Median seeing
    transparency_median: Optional[float]  # Median transparency
    effective_exposure_time_b: Optional[float]  # Effective exposure time (blue)
    effective_exposure_time_r: Optional[float]  # Effective exposure time (red)
    effective_exposure_time_n: Optional[float]  # Effective exposure time (NIR)
    effective_exposure_time_m: Optional[float]  # Effective exposure time (medium)
    
    # Design ID
    pfs_design_id: Optional[str]     # Returned as hexadecimal string
```

## Data Retrieval Details

### Related Tables

Primary key: `pfs_visit.pfs_visit_id`

| Table | Join Method | Retrieved Data |
|-------|-------------|----------------|
| `pfs_visit` | Base table | Basic info (id, description, issued_at, pfs_design_id) |
| `mcs_exposure` | LEFT JOIN + GROUP BY | Exposure count, average exposure time |
| `sps_exposure` | LEFT JOIN + GROUP BY | Exposure count, average exposure time |
| `agc_exposure` | LEFT JOIN + GROUP BY | Exposure count, average exposure time |
| `tel_status` | LEFT JOIN + GROUP BY | Average azimuth, altitude, RA, Dec, rotation |
| `sps_visit` | LEFT JOIN | SpS related info |
| `visit_set` | LEFT JOIN | Sequence ID (iic_sequence_id) |
| `obslog_visit_note` | selectinload | Note list |

### Aggregation Subqueries

Data from each subsystem is aggregated as follows:

```python
# MCS exposure aggregation example
mcs_exposure = (
    select(
        M.mcs_exposure.pfs_visit_id,
        func.avg(M.mcs_exposure.mcs_exptime).label('mcs_exposure_avg_exptime'),
        func.count().label('mcs_exposure_count'),
    )
    .filter(M.mcs_exposure.pfs_visit_id.in_(ids))
    .group_by(M.mcs_exposure.pfs_visit_id)
    .subquery('mcs_exposure')
)

# tel_status aggregation example
tel_status = (
    select(
        M.tel_status.pfs_visit_id,
        func.avg(M.tel_status.altitude).label('tel_status_altitude'),
        func.avg(M.tel_status.azimuth).label('tel_status_azimuth'),
        func.avg(M.tel_status.insrot).label('tel_status_insrot'),
        func.avg(M.tel_status.tel_ra).label('tel_status_ra'),
        func.avg(M.tel_status.tel_dec).label('tel_status_dec'),
    )
    .filter(M.tel_status.pfs_visit_id.in_(ids))
    .group_by(M.tel_status.pfs_visit_id)
    .subquery('tel_status')
)
```

### IicSequence Retrieval

The response also includes IicSequence (sequence) information related to retrieved Visits:

```python
iic_sequence_q = (
    ctx.db.query(M.iic_sequence)
    .filter(M.iic_sequence.iic_sequence_id.in_(
        ctx.db.query(M.visit_set.iic_sequence_id)
        .filter(M.visit_set.pfs_visit_id.in_(v.id for v in visits))
    ))
    .options(selectinload('obslog_notes'))
    .options(selectinload('iic_sequence_status'))
    .options(selectinload('sequence_group'))
)
```

#### IicSequence Structure

```python
class IicSequence(BaseModel):
    visit_set_id: int                # iic_sequence_id
    sequence_type: Optional[str]     # Sequence type
    name: Optional[str]              # Sequence name
    comments: Optional[str]          # Comments
    cmd_str: Optional[str]           # ICS command string
    status: Optional[IicSequenceStatus]  # Status information
    notes: list[VisitSetNote]        # Notes associated with sequence
    group: SequenceGroup | None      # Group information
```

## QA Information Retrieval (QADB)

QADB is a separate database, retrieving data from the following tables:

| Table | Columns |
|-------|---------|
| `seeing` | `pfs_visit_id`, `seeing_median` |
| `transparency` | `pfs_visit_id`, `transparency_median` |
| `exposure_time` | `pfs_visit_id`, `effective_exposure_time_b/r/n/m` |

If connection to QADB fails, all QA information becomes null.

## SQL Filtering Feature

A special WHERE clause can be specified via the `sql` parameter. See `pfs_obslog/visitquery.py` for details.

### Available Column Examples

- `visit_id`, `id` - Visit ID
- `issued_at` - Issue timestamp
- `sequence_type` - Sequence type
- `comments` - Comments
- `visit_note` - Visit note
- `status` - Status
- `is_sps_visit`, `is_mcs_visit`, `is_agc_visit` - Subsystem detection
- `visit_set_id` - Sequence ID
- `sequence_group_id`, `sequence_group_name` - Group
- `proposal_id` - Proposal ID

## Processing Flow

1. Parse WHERE clause (sql parameter)
2. Extract target Visit IDs (with pagination)
3. Count total records
4. Build VisitListEntry (multiple table JOIN)
5. Retrieve QA information (QADB)
6. Retrieve related IicSequence
7. Build response

## Notes

- `pfs_design_id` is internally BigInteger but returned as hexadecimal string (`hex()`)
- Average exposure time uses the first available value in SpS > MCS > AGC priority order
- QADB connection is optional (QA info is null on failure)
