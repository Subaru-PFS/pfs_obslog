# SQL-like Filtering Feature

## Overview

The Visit list endpoint (`GET /api/visits`) allows filtering Visits by specifying SQL-like WHERE clauses via the `sql` parameter.

This feature does **not** execute the user-provided SQL directly. Instead it:

- parses the WHERE clause into an AST with `pglast`,
- converts the AST into a SQLAlchemy expression using a **virtual-column whitelist**, and
- automatically adds **only the JOINs required** by the referenced virtual columns.

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

## From Request to Actual DB Query (Implementation-aligned Flow)

The actual endpoint implementation lives in `backend/src/pfs_obslog/routers/visits.py`.

1. **Parse `sql` string into an AST**
    - `parse_where_clause(sql)` (`visitquery/parser.py`)
    - If the input is just `where ...`, it is internally rewritten to `SELECT * where ...` and then passed to `pglast.parse_sql()`.
    - Returns `SelectStmt.whereClause` (or `None` when there is no WHERE clause).
2. **Convert AST into a SQLAlchemy WHERE expression**
    - Create `JoinBuilder(M)` first, then `QueryEvaluator(M, join_builder)`.
    - `evaluator.evaluate(where_ast)` returns a SQLAlchemy `ColumnElement` (WHERE condition).
    - At the same time it collects:
      - `evaluator.required_joins` (a set of JOIN names)
      - `evaluator.aggregate_conditions` (aggregate predicates)
3. **Apply only the required JOINs**
    - `join_builder.apply_joins(query, required_joins)` (`visitquery/joins.py`)
    - Resolves JOIN dependencies and applies `outerjoin()` in a fixed order.
4. **Apply WHERE + remove duplicates**
    - Because JOINs can create duplicate Visit IDs, the endpoint uses `DISTINCT` when filtering is enabled.
5. **Apply aggregate-column conditions in a separate phase**
    - Conditions like `sps_count >= 5` are applied via aggregate subqueries (details below).

## Implementation Structure

```
backend/src/pfs_obslog/visitquery/
├── __init__.py       # Public API
├── parser.py         # Parsing with pglast, syntax validation
├── columns.py        # Virtual column definitions
├── evaluator.py      # AST to SQLAlchemy expression conversion
└── joins.py          # JOIN optimization logic
```

Additionally, the endpoint layer performs the integration:

- `backend/src/pfs_obslog/routers/visits.py`: parse `sql`, evaluate it, apply JOINs, apply aggregate conditions

## How the “Virtual Table” Connects to Real Tables

### 1) Virtual Column Whitelist (Entry Point)

The canonical entry point for allowed columns is `VIRTUAL_COLUMNS` in `visitquery/columns.py`.

- Every `ColumnRef` (e.g. `id`, `sequence_type`) must exist in `VIRTUAL_COLUMNS`.
- Unknown columns fail fast with `Unknown column: ...`.
- Each virtual column declares `required_joins`, describing which real tables are needed.

Examples:

- `sequence_type` → `required_joins = {"visit_set", "iic_sequence"}`
- `visit_note_user` → `required_joins = {"obslog_visit_note", "visit_note_user"}`

### 2) AST → SQLAlchemy Expression (Evaluator)

`QueryEvaluator` in `visitquery/evaluator.py` converts the pglast AST into SQLAlchemy expressions.

Key behavior (as implemented):

- **Column references (`ColumnRef`)**
    - validated against `VIRTUAL_COLUMNS`
    - `required_joins` are accumulated into `self.required_joins`
    - mapped to real SQLAlchemy columns (or aliases) via `_column_map`
- **Computed columns (e.g. `is_sps_visit`)**
    - columns marked `is_computed=True` are expanded into SQLAlchemy expressions
    - e.g. `is_sps_visit` becomes a `... IS NOT NULL` predicate on the joined table
- **Boolean logic (AND / OR / NOT)**
    - AND → `and_(...)`, OR → `or_(...)`, NOT → a `not_(inner)`-style expression
    - NOT is implemented as `not_(inner) OR (inner IS NULL)` to treat NULL as effectively false in practice
- **Timestamp comparisons**
    - for comparisons like `issued_at >= '2024-06-01'`, the string is cast to `DateTime` to avoid type errors
- **Type casts (`::date`, `::float`, `::int`, ...)**
    - handled via `TypeCast` nodes and translated into SQLAlchemy `cast()`

### 3) JOIN Construction (Minimum JOINs + Dependency Resolution)

`JoinBuilder` in `visitquery/joins.py` applies JOINs.

- takes `required_joins` and expands it using `JOIN_DEPENDENCIES`
    - e.g. joining `iic_sequence_status` requires `visit_set` and `iic_sequence`
- applies JOINs in `JOIN_ORDER` to keep ordering stable and avoid missing prerequisites
- uses `aliased()` for some tables (e.g. `ObslogUser`, `IicSequenceStatus`, `SpsVisit`) to avoid SQLAlchemy duplicate-table warnings

## Aggregate Columns (COUNT/AVG) Are Applied in Two Phases

Predicates like `sps_count >= 5` cannot be expressed as a simple WHERE predicate on the base SELECT.
Instead, the implementation uses a two-phase design:

1. When the evaluator sees an aggregate column, it returns an `AggregateColumnMarker`.
2. A comparison like `sps_count >= 5` is recorded as an `AggregateCondition` in `evaluator.aggregate_conditions`,
     and the evaluator returns `None` for the WHERE predicate.
3. In AND-expressions, `None` predicates are filtered out so non-aggregate predicates still apply normally.
4. The endpoint (`routers/visits.py`) applies aggregate conditions by building aggregate subqueries like
     `SELECT pfs_visit_id, COUNT(*) ... GROUP BY pfs_visit_id` and joining them to the base query.

Restrictions (enforced by the evaluator):

- aggregate columns cannot be used inside `OR`
- aggregate columns cannot be used inside `NOT`

### COUNT vs AVG

- COUNT: 0 rows are meaningful, so it uses `LEFT JOIN` and compares `COALESCE(agg_value, 0)`.
- AVG: no rows means no average, so it uses `INNER JOIN` to exclude NULL.

## Usage

```python
from pfs_obslog.visitquery import parse_where_clause, QueryEvaluator
from pfs_obslog import models

# 1. Parse WHERE clause
where_ast = parse_where_clause("where id between 100 and 200")

# 2. Convert to SQLAlchemy expression (share JoinBuilder for consistent aliasing)
from pfs_obslog.visitquery.joins import JoinBuilder
join_builder = JoinBuilder(models)
evaluator = QueryEvaluator(models, join_builder)
condition = evaluator.evaluate(where_ast)

# 3. Get required JOINs
required_joins = evaluator.required_joins

query = select(models.PfsVisit)
query = join_builder.apply_joins(query, required_joins)
query = query.where(condition)
```

Note: the endpoint shares the same `JoinBuilder` instance between `QueryEvaluator` and query building to keep alias usage consistent.

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

Note: the following are parseable, but currently **disabled in the API** due to performance concerns:

- `any_column`: evaluation fails with an error (use specific columns like `visit_note` instead)
- JSONB/array access like `fits_header['KEY']`: evaluation fails with an error (may be re-enabled in the future)

Also, `validate_expression()` provides a function whitelist, but `/api/visits` does not currently call it.
Function calls (e.g. `lower(status)`) are not usable at the moment because the evaluator does not implement `FuncCall`.

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
| `fits_header` | `obslog_fits_header.cards_dict` | FITS header (JSONB, currently disabled in the API) |
| `proposal_id` | `pfs_design_fiber.proposal_id` | Proposal ID |
| `any_column` | OR of multiple columns | For text search (currently disabled in the API) |

### JOIN Optimization

The `JoinBuilder` class adds only the necessary JOINs based on columns used in the WHERE clause:

```python
# Example: "where visit_note like '%test%'"
# Only JOINs obslog_visit_note table

# Example: "where sequence_type like '%domeflat%'"
# JOINs visit_set and iic_sequence (dependencies resolved automatically)
```

## Security Considerations

### SQL Injection Prevention

1. **Whitelist approach**: Available columns are restricted by `VIRTUAL_COLUMNS`
2. **Parameterization**: Uses SQLAlchemy's parameter binding
3. **Prohibited syntax**: (optional) detect subqueries, etc. via `validate_expression()`

```python
from pfs_obslog.visitquery.parser import validate_expression

ast = parse_where_clause(user_input)
validate_expression(ast)  # Raises exception if dangerous syntax found
```

Note: `/api/visits` currently relies mainly on the `VIRTUAL_COLUMNS` whitelist and the evaluator’s supported-node set.

### Allowed Functions

For security, the following functions are restricted:

- `date` - Date conversion
- `lower`, `upper` - Case conversion
- `trim` - Whitespace removal
- `coalesce` - NULL replacement

(However, function calls are not currently usable in the API because the evaluator does not implement `FuncCall`.)

## Testing

```bash
cd backend
uv run pytest tests/test_visitquery.py -v
```

## References

- [pglast GitHub](https://github.com/lelit/pglast)
- [pglast Documentation](https://pglast.readthedocs.io/)
- [libpg_query](https://github.com/pganalyze/libpg_query)
