import { defineComponent, PropType } from "@vue/runtime-core"
import Color from "color"
import { VisitSetDetail } from "~/api-client"
import { bgColor, fgColor } from "~/utils/colors"


export default defineComponent({
  setup($$, { slots }) {
    const render = () => {
      const backgroundColor: Color = bgColor(sequenceTypeBaseColor[$$.visitSet?.sps_sequence?.sequence_type!] || Color('grey'))

      const rootAttrs = {
        ...($$.visitSet ? { key: `visit-set-${$$.visitSet.id}` } : {})
      }

      return (<>
        <div style={{
          textOverflow: 'ellipses',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          backgroundColor: backgroundColor.string(),
        }} {...rootAttrs}>
          <div style={{ paddingBottom: '0.25em', borderStyle: 'solid', borderWidth: '1px 0 0 0', borderColor: '#777' }}></div>
          {$$.visitSet && sspSequenceDetail($$.visitSet)}
          <div style={{
            padding: '0.25em 0.125em .25em 2em'
          }}>
            {slots.default?.()}
          </div>
          <div style={{ paddingBottom: '0.25em' }}></div>
        </div>
      </>)
    }
    return render
  },
  props: {
    visitSet: {
      type: Object as PropType<VisitSetDetail>,
    }
  },
})


const sspSequenceDetail = (vs: VisitSetDetail) => {
  const statusColor: Color = fgColor(statusBaseColor[vs.sps_sequence.status!]! || Color('#f00'))
  return (<>
    <div>
      <div class="id">#{vs.id}</div> - {vs.sps_sequence.name}
    </div>
    <div style={{ paddingLeft: '1em' }}>
      {vs.sps_sequence.sequence_type}<br />
      <span style={{ color: statusColor.string() }}>
        {vs.sps_sequence.status}
      </span>
    </div>
  </>)
}

const sequenceTypeBaseColor: { [name: string]: Color } = {
  scienceObject: Color('#07f'),
  scienceTrace: Color('#00f'),
  scienceArc: Color('#0f0'),
  undefined: Color('#777'),
}

const statusBaseColor: { [name: string]: Color } = {
  finishRequested: Color('blue'),
  complete: Color('green'),
}
