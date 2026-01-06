# SQL-like Filtering Feature

## Overview

The Visit list endpoint (`GET /api/visits`) allows filtering Visits by specifying SQL-like WHERE clauses via the `sql` parameter.

## Chosen Approach: pglast

We adopted **pglast** (PostgreSQL Languages AST).

### Selection Criteria

1. **Full PostgreSQL parser compatibility**: Based on libpg_query, guarantees parsing accuracy
2. **Active maintenance**: v7.11 (still being updated as of 2024)
3. **Easy installation**: Install with `uv add pglast` (wheels provided)
4. **Accurate error messages**: Outputs the same error messages as PostgreSQL

### Comparison with Other Options

| Library | Pros | Cons |
|---------|------|------|
| **pglast (adopted)** | Full PostgreSQL compatibility, accurate errors | PostgreSQL syntax only |
| psqlparse | Existing usage experience | Last updated 2016, outdated |
| sqlglot | Multiple SQL dialect support | Weak with PostgreSQL-specific features |

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌───────────────────┐
│ SQL Parameter   │ --> │ pglast           │ --> │ pglast AST        │
│ (WHERE clause)  │     │ (libpg_query)    │     │                   │
└─────────────────┘     └──────────────────┘     └─────────┬─────────┘
                                                          │
                                                          v
┌─────────────────┐     ┌──────────────────┐     ┌───────────────────┐
│ SQLAlchemy      │ <-- │ QueryEvaluator   │ <-- │ Column/JOIN       │
│ WHERE clause    │     │                  │     │ resolution        │
└─────────────────┘     └──────────────────┘     └───────────────────┘
```

## Implementation Structure

```
backend/src/pfs_obslog/visitquery/
├── __init__.py       # Public API
├── parser.py         # Parsing with pglast, syntax validation
├── columns.py        # Virtual column definitions
├── evaluator.py      # AST to SQLAlchemy expression conversion
└── joins.py          # JOIN optimization logic
```

## Usage

```python
from pfs_obslog.visitquery import parse_where_clause, QueryEvaluator
from pfs_obslog import models

# 1. Parse WHERE clause
where_ast = parse_where_clause("where id between 100 and 200")

# 2. Convert to SQLAlchemy expression
evaluator = QueryEvaluator(models)
condition = evaluator.evaluate(where_ast)

# 3. Get required JOINs
required_joins = evaluator.required_joins

# 4. Apply to query
from pfs_obslog.visitquery.joins import JoinBuilder
builder = JoinBuilder(models)
query = select(models.PfsVisit)
query = builder.apply_joins(query, required_joins)
query = query.where(condition)
```

### Supported Syntax

| Syntax | Example |
|--------|---------|
| Comparison operators | `id = 3`, `id >= 100`, `id <> 5` |
| LIKE | `sequence_type LIKE '%domeflat%'` |
| NOT LIKE | `visit_note NOT LIKE '%test%'` |
| BETWEEN | `id BETWEEN 0 AND 100` |
| Logical operators | `is_sps_visit AND id > 100`, `a OR b` |
| NOT | `NOT is_mcs_visit` |
| IS NULL | `status IS NULL` |
| Type cast | `issued_at::date = '2021-01-03'` |
| Array access | `fits_header['OBSERVER'] LIKE '%Tamura%'` |

### Virtual Column List

| Column Name | Maps To | Description |
|-------------|---------|-------------|
| `visit_id`, `id` | `pfs_visit.pfs_visit_id` | Visit ID |
| `issued_at` | `pfs_visit.issued_at` | Issue timestamp |
| `sequence_type` | `iic_sequence.sequence_type` | Sequence type |
| `comments` | `iic_sequence.comments` | Comments |
| `visit_note` | `obslog_visit_note.body` | Visit note |
| `visit_note_user` | `obslog_user.account_name` | Visit note author |
| `visit_set_note` | `obslog_visit_set_note.body` | Sequence note |
| `visit_set_note_user` | `obslog_user.account_name` | Sequence note author |
| `status` | `iic_sequence_status.cmd_output` | Status |
| `is_sps_visit` | Computed column | Has SpS exposure |
| `is_mcs_visit` | Computed column | Has MCS exposure |
| `is_agc_visit` | Computed column | Has AGC exposure |
| `visit_set_id` | `iic_sequence.iic_sequence_id` | Sequence ID |
| `sequence_group_id` | `sequence_group.group_id` | Group ID |
| `sequence_group_name` | `sequence_group.group_name` | Group name |
| `fits_header` | `obslog_fits_header.cards_dict` | FITS header (JSONB) |
| `proposal_id` | `pfs_design_fiber.proposal_id` | Proposal ID |
| `any_column` | OR of multiple columns | For text search |

### JOIN Optimization

The `JoinBuilder` class adds only the necessary JOINs based on columns used in the WHERE clause:

```python
# Example: "where visit_note like '%test%'"
# Only JOINs obslog_visit_note table

# Example: "where any_column like '%test%'"
# JOINs multiple tables (all tables targeted by full-text search)
```

## Security Considerations

### SQL Injection Prevention

1. **Whitelist approach**: Available columns are restricted by `VIRTUAL_COLUMNS`
2. **Parameterization**: Uses SQLAlchemy's parameter binding
3. **Prohibited syntax**: Subqueries, INSERT/UPDATE/DELETE, etc. are detected by `validate_expression()`

```python
from pfs_obslog.visitquery.parser import validate_expression

ast = parse_where_clause(user_input)
validate_expression(ast)  # Raises exception if dangerous syntax found
```

### Allowed Functions

For security, the following functions are restricted:

- `date` - Date conversion
- `lower`, `upper` - Case conversion
- `trim` - Whitespace removal
- `coalesce` - NULL replacement

## Testing

```bash
cd backend
uv run pytest tests/test_visitquery.py -v
```

## References

- [pglast GitHub](https://github.com/lelit/pglast)
- [pglast Documentation](https://pglast.readthedocs.io/)
- [libpg_query](https://github.com/pganalyze/libpg_query)
