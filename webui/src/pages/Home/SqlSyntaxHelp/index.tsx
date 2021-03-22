import { useNavigate } from 'solid-app-router'
import { For, Show } from 'solid-js'
import { IconButton } from '~/components/Icon'
import { searchString } from '../../../utils/searchString'
import styles from './styles.module.scss'


export function SqlSyntaxHelp() {
  const navitate = useNavigate()

  return (
    <div class={styles.root}>
      <h1>Search Query Syntax</h1>

      <h2>Virtual Table</h2>
      <p>
        Search Query works like the where clause of a SELECT to the following virtual table.
        Its syntax is almost the same as the standard SQL.
      </p>

      <table class={styles.virtualTable}>
        <thead>
          <tr>
            <th>Name</th>
            <th>OPDB Column</th>
            <th>Doc</th>
          </tr>
        </thead>
        <tbody>
          <For each={columns}>
            {column => (
              <tr>
                <td>{column.name}</td>
                <td>{column.opdb_column}</td>
                <td>{column.doc}</td>
              </tr>
            )}
          </For>
        </tbody>
      </table>

      <p>If you want to add more columns to the virtual table, please let me know on <a href="https://sumire-pfs.slack.com/archives/C01UB210SDC" target='_blank' rel="noopener noreferrer">#obslog channel</a> .</p>

      <h2>Examples</h2>
      <dl class={styles.examples}>
        <For each={examples}>
          {({ title, sql, doc }) => (
            <>
              <dt>{title}</dt>
              <dd>
                <Show when={doc}>
                  <p>{doc}</p>
                </Show>
                <pre
                  onClick={() => navitate(`/visits${searchString({ whereSql: sql })}`)}
                ><code>{sql}</code></pre>
              </dd>
            </>
          )}
        </For>
      </dl>
      <IconButton icon="arrow_back" tippy={{ content: 'Back' }} onClick={() => history.back()} />
    </div >
  )
}


type Column = {
  name: string
  opdb_column: string
  doc: string
}


const columns: Column[] = [
  {
    name: 'visit_id', opdb_column: 'pfs_visit.pfs_visit_id', doc: 'Visit ID',
  },
  {
    name: 'id', opdb_column: 'pfs_visit.pfs_visit_id', doc: 'Visit ID',
  },
  {
    name: 'issued_at', opdb_column: 'pfs_visit.issued_at', doc: 'Time when the visit issued',
  },
  {
    name: 'sequence_type', opdb_column: 'iic_sequence.sequence_type', doc: 'Sequence Type',
  },
  {
    name: 'comments', opdb_column: 'iic_sequence.comments', doc: 'Comments of Visit Set',
  },
  {
    name: 'is_sps_visit', opdb_column: 'N/A', doc: 'Whether the visit has any SpS exposure',
  },
  {
    name: 'is_mcs_visit', opdb_column: 'N/A', doc: 'Whether the visit has any MCS exposure',
  },
  {
    name: 'is_agc_visit', opdb_column: 'N/A', doc: 'Whether the visit has any AGC exposure',
  },
  {
    name: 'visit_note', opdb_column: 'obslog_visit_note.body', doc: 'Note of the visit',
  },
  {
    name: 'visit_note_user', opdb_column: 'obslog_user.account_name', doc: 'Username of the note of the visit',
  },
  {
    name: 'status', opdb_column: 'iic_sequence_status.cmd_output', doc: 'Status of the visit set',
  },
  {
    name: 'visit_set_note', opdb_column: 'obslog_visit_set_note.body', doc: 'Note of the visit set corresponding to the visit',
  },
  {
    name: 'visit_set_note_user', opdb_column: 'obslog_user.account_name', doc: 'Username of the note of the visit set corresponding to the visit',
  },
  {
    name: 'status', opdb_column: 'iic_sequence_status.cmd_output', doc: 'Status of the visit set',
  },
  {
    name: 'fits_header', opdb_column: 'N/A', doc: `Fits headers belonging to the visit. You can access a card by 'fits_header['CARD_NAME']'`,
  },
  {
    name: 'any_column', opdb_column: 'N/A', doc: `This column will be expanded to some columns such as 
  pfs_visit_id,
  pfs_visit_description,
  obslog_visit_note.body,
  visit_note_user.account_name,
  obslog_visit_set_note.body,
  visit_set_note_user.account_name,
  iic_sequence.name,
  iic_sequence.sequence_type,
  iic_sequence_status.cmd_output,
  sps_annotation.notes,
  obslog_mcs_exposure_note.body
  and
  mcs_exposure_note_user.account_name
when evaluated`,
  },
]

type Example = {
  title: string,
  sql: string
  doc?: string
}

const examples: Example[] = [
  {
    title: 'SpS visits',
    sql: 'where is_sps_visit',
  },
  {
    title: 'Visits whose id is between 78500 and 78600',
    sql: 'where visit_id between 78500 and 78600',
  },
  {
    title: "Visits whose any column or contains 'science'",
    sql: "where any_column like '%science%'",
  },
  {
    title: "Visits whose visit set has a note by 'moritani@stn'",
    sql: "where visit_set_note_user = 'moritani@stn'",
  },
  {
    title: "Visits whose fits card `OBSERVER` contains 'tamura' (This takes about 1min)",
    sql: "where fits_header['OBSERVER'] like '%tamura%'",
  },
  {
    title: "Visits whose visit set's status contains 'error'",
    sql: "where status like '%error%'",
  },
]
