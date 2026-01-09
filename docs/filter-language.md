# Filter Language Specification

This document defines the virtual tables and virtual columns available for filtering in the Visit list.

> **Important**: This document must be kept in sync with the code under `backend/src/pfs_obslog/visitquery/`.

## Overview

The Visit list endpoint (`GET /api/visits`) allows filtering by specifying SQL-like WHERE clauses via the `sql` parameter.
This filtering feature is designed as if querying a virtual table `visits`.

```sql
-- Example: Visit IDs between 100-200 with SpS exposures
WHERE id BETWEEN 100 AND 200 AND is_sps_visit
```

## Virtual Column List

### Basic Information

| Column Name | Type | Description | Maps To | Required JOINs |
|-------------|------|-------------|---------|----------------|
| `visit_id` | INTEGER | Visit ID | `pfs_visit.pfs_visit_id` | None |
| `id` | INTEGER | Visit ID (alias) | `pfs_visit.pfs_visit_id` | None |
| `issued_at` | TIMESTAMP | Issue timestamp | `pfs_visit.issued_at` | None |

### Sequence Information

| Column Name | Type | Description | Maps To | Required JOINs |
|-------------|------|-------------|---------|----------------|
| `sequence_type` | TEXT | Sequence type | `iic_sequence.sequence_type` | visit_set, iic_sequence |
| `comments` | TEXT | Sequence comments | `iic_sequence.comments` | visit_set, iic_sequence |
| `visit_set_id` | INTEGER | Sequence ID | `iic_sequence.iic_sequence_id` | visit_set, iic_sequence |
| `status` | TEXT | Sequence status | `iic_sequence_status.cmd_output` | visit_set, iic_sequence, iic_sequence_status |

### Group Information

| Column Name | Type | Description | Maps To | Required JOINs |
|-------------|------|-------------|---------|----------------|
| `sequence_group_id` | INTEGER | Sequence group ID | `sequence_group.group_id` | visit_set, iic_sequence, sequence_group |
| `sequence_group_name` | TEXT | Sequence group name | `sequence_group.group_name` | visit_set, iic_sequence, sequence_group |

### Note Related

| Column Name | Type | Description | Maps To | Required JOINs |
|-------------|------|-------------|---------|----------------|
| `visit_note` | TEXT | Visit note body | `obslog_visit_note.body` | obslog_visit_note |
| `visit_note_user` | TEXT | Visit note author | `obslog_user.account_name` | obslog_visit_note, visit_note_user |
| `visit_set_note` | TEXT | Sequence note body | `obslog_visit_set_note.body` | visit_set, obslog_visit_set_note |
| `visit_set_note_user` | TEXT | Sequence note author | `obslog_user.account_name` | visit_set, obslog_visit_set_note, visit_set_note_user |

### Exposure Detection Columns (Computed Columns)

These columns are not actual table columns but are implemented as expressions that check for the existence of related tables.

| Column Name | Type | Description | Expression | Required JOINs |
|-------------|------|-------------|------------|----------------|
| `is_sps_visit` | BOOLEAN | Has SpS exposure | `sps_visit.pfs_visit_id IS NOT NULL` | sps_visit |
| `is_mcs_visit` | BOOLEAN | Has MCS exposure | `mcs_exposure.pfs_visit_id IS NOT NULL` | mcs_exposure |
| `is_agc_visit` | BOOLEAN | Has AGC exposure | `agc_exposure.pfs_visit_id IS NOT NULL` | agc_exposure |

### Proposal

| Column Name | Type | Description | Maps To | Required JOINs |
|-------------|------|-------------|---------|----------------|
| `proposal_id` | TEXT | Proposal ID | `pfs_design_fiber.proposal_id` | pfs_design_fiber |

### PFS Design

| Column Name | Type | Description | Maps To | Required JOINs |
|-------------|------|-------------|---------|----------------|
| `pfs_design_id` | BIGINT | PFS Design ID | `pfs_visit.pfs_design_id` | None |

### Aggregate Columns

These columns calculate counts or averages of records related to each Visit.
Aggregate columns are implemented as subqueries and are not JOINed to the main query.

| Column Name | Type | Description | Aggregates | Function |
|-------------|------|-------------|------------|----------|
| `sps_count` | INTEGER | Number of SPS exposures | `sps_exposure` | COUNT |
| `sps_avg_exptime` | FLOAT | Average exposure time of SPS exposures | `sps_exposure.exptime` | AVG |
| `mcs_count` | INTEGER | Number of MCS exposures | `mcs_exposure` | COUNT |
| `mcs_avg_exptime` | FLOAT | Average exposure time of MCS exposures | `mcs_exposure.mcs_exptime` | AVG |
| `agc_count` | INTEGER | Number of AGC exposures | `agc_exposure` | COUNT |
| `agc_avg_exptime` | FLOAT | Average exposure time of AGC exposures | `agc_exposure.agc_exptime` | AVG |

**Usage Examples:**
```sql
-- Visits with 5 or more SPS exposures
WHERE sps_count >= 5

-- Visits with average exposure time of 30 seconds or more
WHERE sps_avg_exptime >= 30

-- Combining multiple aggregate conditions
WHERE sps_count > 0 AND mcs_count > 0

-- Combining with regular conditions
WHERE id > 10000 AND sps_count >= 5
```

**Restrictions:**
- Aggregate columns cannot be used in `OR` expressions
- Aggregate columns cannot be used in `NOT` expressions
- Aggregate columns can be combined with other conditions using `AND`

---

## Supported Syntax

### Comparison Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `=` | Equal | `id = 100` |
| `<>`, `!=` | Not equal | `status <> 'SUCCESS'` |
| `<` | Less than | `id < 1000` |
| `>` | Greater than | `id > 500` |
| `<=` | Less than or equal | `sps_count <= 10` |
| `>=` | Greater than or equal | `sps_avg_exptime >= 30.0` |

### LIKE / ILIKE

| Syntax | Description | Example |
|--------|-------------|---------|
| `LIKE` | Pattern match (case-sensitive) | `sequence_type LIKE '%domeflat%'` |
| `NOT LIKE` | Negated pattern match | `visit_note NOT LIKE '%test%'` |
| `ILIKE` | Pattern match (case-insensitive) | `status ILIKE '%success%'` |

**Wildcards:**
- `%` - Any 0 or more characters
- `_` - Any single character

### BETWEEN

```sql
-- Range search
WHERE id BETWEEN 100 AND 200
WHERE issued_at BETWEEN '2024-01-01' AND '2024-12-31'
```

### Logical Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `AND` | Logical AND | `is_sps_visit AND id > 100` |
| `OR` | Logical OR | `is_mcs_visit OR is_agc_visit` |
| `NOT` | Logical NOT | `NOT is_mcs_visit` |

### NULL Check

```sql
-- Check if NULL
WHERE status IS NULL
WHERE visit_note IS NOT NULL
```

### Type Casting

| Cast | Description | Example |
|------|-------------|---------|
| `::date` | Cast to DATE | `issued_at::date = '2024-01-01'` |
| `::float`, `::float8` | Cast to FLOAT | `sps_avg_exptime::float > 30` |
| `::int`, `::integer` | Cast to INTEGER | `sps_count::int > 5` |

### Allowed Functions

For security, only the following functions are allowed:

| Function | Description | Example |
|----------|-------------|---------|
| `date()` | Date conversion | `date(issued_at) = '2024-01-01'` |
| `lower()` | Lowercase conversion | `lower(sequence_type) = 'sciencetrace'` |
| `upper()` | Uppercase conversion | `upper(status) = 'SUCCESS'` |
| `trim()` | Whitespace removal | `trim(comments) <> ''` |
| `coalesce()` | NULL replacement | `coalesce(status, 'UNKNOWN') = 'SUCCESS'` |

---

## JOIN Dependencies

When using virtual columns, required tables are automatically JOINed in the background.
Below shows the JOIN dependency structure.

```
pfs_visit (base table)
├── obslog_visit_note
│   └── visit_note_user (alias for ObslogUser)
├── sps_visit
│   ├── sps_exposure
│   │   └── sps_annotation
├── visit_set
│   ├── iic_sequence
│   │   ├── iic_sequence_status
│   │   └── sequence_group
│   ├── obslog_visit_set_note
│   │   └── visit_set_note_user (alias for ObslogUser)
├── mcs_exposure
│   ├── obslog_mcs_exposure_note
│   │   └── mcs_exposure_note_user (alias for ObslogUser)
├── agc_exposure
└── pfs_design_fiber
```

---

## Query Examples

### Basic Filtering

```sql
-- Get specific Visit ID
WHERE id = 12345

-- Visit ID range
WHERE id BETWEEN 10000 AND 20000

-- Filter by date
WHERE issued_at::date = '2024-06-15'
WHERE issued_at >= '2024-06-01' AND issued_at < '2024-07-01'
```

### Sequence Related

```sql
-- Specific sequence type
WHERE sequence_type = 'scienceTrace'

-- Partial match search for sequence type
WHERE sequence_type LIKE '%domeflat%'

-- Specific status
WHERE status = 'SUCCESS'
WHERE status IS NULL  -- Status not set
```

### Filter by Exposure Presence

```sql
-- Visits with SpS exposure
WHERE is_sps_visit

-- Visits with only MCS exposure
WHERE is_mcs_visit AND NOT is_sps_visit

-- Visits with any exposure type
WHERE is_sps_visit OR is_mcs_visit OR is_agc_visit
```

### Filter by Exposure Count or Time

```sql
-- Visits with 10 or more SPS exposures
WHERE sps_count >= 10

-- MCS exposures with average time of 1 second or more
WHERE mcs_avg_exptime >= 1.0

-- Combined conditions
WHERE sps_count >= 5 AND sps_avg_exptime >= 30
```

### Note Search

```sql
-- Visit notes containing specific keyword
WHERE visit_note LIKE '%calibration%'

-- Visits with notes from specific user
WHERE visit_note_user = 'yamada'

-- Sequence note search
WHERE visit_set_note LIKE '%weather%'
```

### Filter by PFS Design

```sql
-- Visits using specific PFS design (use hex format with 0x prefix)
WHERE pfs_design_id = 0x0523d0db7b9645c3

-- Visits with any PFS design assigned
WHERE pfs_design_id IS NOT NULL
```

### Complex Conditions

```sql
-- Visits with SpS exposure, in specific date range, with 'good' in notes
WHERE is_sps_visit 
  AND issued_at::date BETWEEN '2024-06-01' AND '2024-06-30'
  AND visit_note LIKE '%good%'

-- scienceTrace sequence type with SUCCESS status
WHERE sequence_type = 'scienceTrace' AND status = 'SUCCESS'
```

---

## Security Restrictions

The following syntax is prohibited:

- **Subqueries**: `WHERE id IN (SELECT ...)`
- **DML statements**: INSERT, UPDATE, DELETE
- **DDL statements**: CREATE, DROP, TRUNCATE
- **Disallowed functions**: System functions, user-defined functions

---

## Implementation Files

This filter language is implemented in the following files:

| File | Role |
|------|------|
| [columns.py](../backend/src/pfs_obslog/visitquery/columns.py) | Virtual column definitions (`VIRTUAL_COLUMNS`) |
| [parser.py](../backend/src/pfs_obslog/visitquery/parser.py) | WHERE clause parsing with pglast |
| [evaluator.py](../backend/src/pfs_obslog/visitquery/evaluator.py) | AST to SQLAlchemy expression conversion |
| [joins.py](../backend/src/pfs_obslog/visitquery/joins.py) | JOIN optimization logic |

**Related Documentation:**
- [SQL Filtering Overview](./sql-filtering.md) - Architecture and implementation details
