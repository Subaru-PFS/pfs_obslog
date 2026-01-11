import { useNavigate } from 'react-router-dom'
import { IconButton } from '../../components/Icon'
import styles from './SqlSyntaxHelp.module.scss'

/**
 * Column definitions for the virtual table
 * These columns are available in SQL WHERE clauses
 */
const columns = [
  { name: 'visit_id', opdb_column: 'pfs_visit.pfs_visit_id', doc: 'Visit ID' },
  { name: 'id', opdb_column: 'pfs_visit.pfs_visit_id', doc: 'Visit ID (alias)' },
  { name: 'issued_at', opdb_column: 'pfs_visit.issued_at', doc: 'Time when the visit was issued' },
  { name: 'sequence_type', opdb_column: 'iic_sequence.sequence_type', doc: 'Sequence Type' },
  { name: 'comments', opdb_column: 'iic_sequence.comments', doc: 'Comments of Visit Set' },
  { name: 'cmd_str', opdb_column: 'iic_sequence.cmd_str', doc: 'ICS command string that generates exposures' },
  { name: 'sequence_name', opdb_column: 'iic_sequence.name', doc: 'Unique name assigned to the sequence' },
  { name: 'is_sps_visit', opdb_column: 'N/A', doc: 'Whether the visit has any SpS exposure' },
  { name: 'is_mcs_visit', opdb_column: 'N/A', doc: 'Whether the visit has any MCS exposure' },
  { name: 'is_agc_visit', opdb_column: 'N/A', doc: 'Whether the visit has any AGC exposure' },
  { name: 'visit_note', opdb_column: 'obslog_visit_note.body', doc: 'Note of the visit' },
  { name: 'visit_note_user', opdb_column: 'obslog_user.account_name', doc: 'Username of the note of the visit' },
  { name: 'status', opdb_column: 'iic_sequence_status.cmd_output', doc: 'Status of the visit set' },
  { name: 'visit_set_note', opdb_column: 'obslog_visit_set_note.body', doc: 'Note of the visit set' },
  { name: 'visit_set_note_user', opdb_column: 'obslog_user.account_name', doc: 'Username of the note of the visit set' },
  { name: 'sequence_group_id', opdb_column: 'sequence_group.group_id', doc: 'Sequence Group ID' },
  { name: 'sequence_group_name', opdb_column: 'sequence_group.group_name', doc: 'Sequence Group Name' },
  { name: 'proposal_id', opdb_column: 'pfs_design_fiber.proposal_id', doc: 'Proposal ID from the fiber design' },
]

/**
 * Aggregate column definitions for the virtual table
 * These columns perform COUNT/AVG aggregations and can be used in WHERE clauses
 */
const aggregateColumns = [
  { name: 'sps_count', doc: 'Number of SPS exposures' },
  { name: 'sps_avg_exptime', doc: 'Average exposure time of SPS exposures' },
  { name: 'mcs_count', doc: 'Number of MCS exposures' },
  { name: 'mcs_avg_exptime', doc: 'Average exposure time of MCS exposures' },
  { name: 'agc_count', doc: 'Number of AGC exposures' },
  { name: 'agc_avg_exptime', doc: 'Average exposure time of AGC exposures' },
]

/**
 * Example SQL queries
 */
const examples = [
  {
    title: 'SpS visits',
    sql: 'where is_sps_visit',
    doc: 'Find all visits that have SpS exposures.',
  },
  {
    title: 'Visits with specific sequence type',
    sql: "where sequence_type = 'scienceTrace'",
    doc: 'Find visits with a specific sequence type.',
  },
  {
    title: "Visits with note containing 'calibration'",
    sql: "where visit_note like '%calibration%'",
    doc: 'Search for visits with specific text in their notes.',
  },
  {
    title: "Visits whose visit set has a note by a specific user",
    sql: "where visit_set_note_user = 'moritani@stn'",
    doc: 'Filter by the user who created a visit set note.',
  },
  {
    title: 'Visits with completed status',
    sql: "where status = 'complete'",
    doc: 'Filter by sequence status.',
  },
  {
    title: 'Visits with multiple SPS exposures',
    sql: 'where sps_count >= 5',
    doc: 'Filter by number of SPS exposures using aggregate columns.',
  },
  {
    title: 'Visits with long average exposure time',
    sql: 'where sps_avg_exptime >= 30',
    doc: 'Filter by average SPS exposure time.',
  },
  {
    title: 'Visits with specific command string',
    sql: "where cmd_str like '%halogen%'",
    doc: 'Search for visits by ICS command string.',
  },
  {
    title: 'Visits with specific sequence name',
    sql: "where sequence_name like '%theta260_phi_scan_angle150%'",
    doc: 'Search for visits by the unique sequence name.',
  },
]

/**
 * Build search string for navigation
 */
function buildSearchString(sql: string): string {
  const params = new URLSearchParams()
  params.set('sql', sql)
  return `?${params.toString()}`
}

/**
 * SQL Syntax Help page
 * Displays available columns and example queries for the SQL filtering feature
 */
export function SqlSyntaxHelp() {
  const navigate = useNavigate()

  const handleExampleClick = (sql: string) => {
    // Navigate to visits page with the SQL query
    navigate(`/visits${buildSearchString(sql)}`)
  }

  return (
    <div className={styles.root}>
      <h1>Search Query Syntax</h1>

      <h2>Virtual Table</h2>
      <p>
        Search Query works like the WHERE clause of a SELECT to the following virtual table.
        Its syntax is almost the same as the standard SQL.
      </p>

      <table className={styles.virtualTable}>
        <thead>
          <tr>
            <th>Name</th>
            <th>OPDB Column</th>
            <th>Doc</th>
          </tr>
        </thead>
        <tbody>
          {columns.map((column) => (
            <tr key={column.name}>
              <td>{column.name}</td>
              <td>{column.opdb_column}</td>
              <td>{column.doc}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p>
        If you want to add more columns to the virtual table, please let me know on{' '}
        <a
          href="https://sumire-pfs.slack.com/archives/C01UB210SDC"
          target="_blank"
          rel="noopener noreferrer"
        >
          #obslog channel
        </a>
        .
      </p>

      <h2>Aggregate Columns</h2>
      <p>
        These columns perform aggregations (COUNT, AVG) on related exposures.
        They can be used in WHERE clauses but cannot be combined with OR or NOT operators.
      </p>

      <table className={styles.virtualTable}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {aggregateColumns.map((column) => (
            <tr key={column.name}>
              <td>{column.name}</td>
              <td>{column.doc}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Examples</h2>
      <dl className={styles.examples}>
        {examples.map((example) => (
          <div key={example.sql}>
            <dt>{example.title}</dt>
            <dd>
              {example.doc && <p>{example.doc}</p>}
              <pre onClick={() => handleExampleClick(example.sql)}>
                <code>{example.sql}</code>
              </pre>
            </dd>
          </div>
        ))}
      </dl>

      <IconButton
        icon="arrow_back"
        tooltip="Back"
        onClick={() => history.back()}
      />
    </div>
  )
}
