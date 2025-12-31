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
  { name: 'fits_header', opdb_column: 'N/A', doc: "FITS headers belonging to the visit.\nYou can access a card by fits_header['CARD_NAME']" },
  { name: 'any_column', opdb_column: 'N/A', doc: 'Expands to multiple columns at evaluation time. Useful for broad searches.' },
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
    title: 'Visits whose id is between 78500 and 78600',
    sql: 'where visit_id between 78500 and 78600',
    doc: null,
  },
  {
    title: "Visits whose any column contains 'science'",
    sql: "where any_column like '%science%'",
    doc: 'Broad search across multiple columns.',
  },
  {
    title: "Visits whose visit set has a note by 'moritani@stn'",
    sql: "where visit_set_note_user = 'moritani@stn'",
    doc: null,
  },
  {
    title: "Visits whose FITS card OBSERVER contains 'tamura'",
    sql: "where fits_header['OBSERVER'] like '%tamura%'",
    doc: 'Access specific FITS header cards.',
  },
  {
    title: "Visits whose visit set's status contains 'error'",
    sql: "where status like '%error%'",
    doc: null,
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
    // Navigate to home with the SQL query
    navigate(`/${buildSearchString(sql)}`)
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
