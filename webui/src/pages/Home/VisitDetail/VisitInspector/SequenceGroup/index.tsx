import { GridCellGroup } from "~/components/layout"
import { SequenceGroupType } from "../../types"
import styles from './styles.module.scss'
import gridStyles from '~/styles/grid.module.scss'


type SequenceGroupProps = {
  group: SequenceGroupType
}


export function SequenceGroup(props: SequenceGroupProps) {
  // {"group_id":4,"group_name":"RSC_M39_01","created_at":"2022-11-15T20:35:58.994101"}

  return (
    <div class={styles.summary} style={{ "grid-template-columns": 'repeat(3, 1fr)' }}>
      <GridCellGroup class={gridStyles.header}>
        <div>Group ID</div>
        <div>Name</div>
        <div>Created at</div>
      </GridCellGroup>
      <GridCellGroup class={gridStyles.data}>
        <div>{props.group.group_id}</div>
        <div>{props.group.group_name}</div>
        <div>{props.group.created_at}</div>
      </GridCellGroup>
    </div>
  )
}

