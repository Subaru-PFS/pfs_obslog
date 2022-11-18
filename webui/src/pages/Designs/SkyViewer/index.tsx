import { Globe } from "@stellar-globe/stellar-globe"
import { createEffect, createMemo, on } from "solid-js"
import { DatePicker } from "~/components/DatePicker"
import { strftime } from "../../../utils/strftime"
import { useDesignContext } from "../context"
import { Clock } from "./Clock"
import { DesignDetail } from "./DesignDetail"
import { DesignCircles } from "./DesignCircles"
import { StellarGlobe } from "./StellarGlobe"
import styles from './styles.module.scss'


const HstTzOffset = 600 // in minutes


export function SkyViewer() {
  const { jumpToSignal, telescopeLocation, now, setNow, zenithSkyCoord, showFibers, setShowFibers } = useDesignContext()
  let globe: (() => Globe) | undefined

  createEffect(on(jumpToSignal, jumpToOptions => {
    globe?.().viewFactory.jumpTo(...jumpToOptions)
  }, { defer: true }))

  const hst = createMemo(() => inTimeZone(now(), HstTzOffset))

  const centerZenith = () => {
    const vf = globe?.().viewFactory!
    vf.jumpTo({ fovy: 2 }, { coord: zenithSkyCoord() })
  }

  return (
    <div style={{ "flex-grow": 1, position: 'relative' }}>
      <StellarGlobe
        location={telescopeLocation()}
        style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
        date={now()}
        viewOptions={{ fovy: 2, retina: true }}
        ref={globe}
      >
        <DesignCircles />
        <DesignDetail />
      </StellarGlobe>
      <div class={styles.timeSection}>
        <DatePicker
          inputClass={styles.datepicker}
          size={10}
          value={strftime('%Y-%m-%d', hst())}
          onChange={s => {
            setNow(_ => {
              const date = new Date(hst())
              const [y, m, d] = s!.split('-').map(s => Number(s))
              date.setFullYear(y, m - 1, d)
              return inTimeZone(date, HstTzOffset, -1)
            })
          }}
          datePickerOptions={{ clearBtn: false }}
          allowNull={false}
        />
        <Clock
          hour={hst().getHours()} minute={hst().getMinutes()} second={hst().getSeconds()}
          onScrew={dt => setNow(_ => new Date(_.getTime() + 12 * 3600_000 * dt / (2 * Math.PI)))}
        />
        <button onClick={() => {
          setNow(new Date())
          requestAnimationFrame(() => centerZenith())
        }}>Set time to now</button>
        <button onClick={centerZenith}>Center Zenith</button>
        <label>
          <input type="checkbox" checked={showFibers()} onChange={e => setShowFibers(e.currentTarget.checked)} />
          Fiber Markers
        </label>
      </div>
    </div>
  )
}


function inTimeZone(d: Date, tzOffset: number, sign = 1) {
  d = new Date(d)
  const offset = sign * (d.getTimezoneOffset() - tzOffset)
  d.setMinutes(d.getMinutes() + offset)
  return d
}
