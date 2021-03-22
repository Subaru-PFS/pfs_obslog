import { Accessor, createContext, createEffect, createSignal, JSX, on, onCleanup, splitProps, useContext } from "solid-js"
import styles from './styles.module.scss'


type DivProps = JSX.HTMLAttributes<HTMLDivElement>


function makeClassedComponent(className: string) {
  return (props: DivProps & { children?: any }) => {
    const [local, others] = splitProps(props, ["children", "classList"])
    return (
      <div classList={{ [className]: true, ...local.classList }} {...others}>
        {local.children}
      </div>
    )
  }
}

export const JustifyEnd = makeClassedComponent(styles.justifyEnd)
export const Center = makeClassedComponent(styles.center)
export const Flex = makeClassedComponent(styles.flex)
export const FlexColumn = makeClassedComponent(styles.flexColumn)
export const Relative = makeClassedComponent(styles.relative)
export const AbsoluteCenter = makeClassedComponent(styles.absoluteCenter)
export const absoluteFill = makeClassedComponent(styles.absoluteFill)
export const FlexPadding = makeClassedComponent(styles.flexPadding)
export const GridCellGroup = makeClassedComponent(styles.gridCellGroup)


type TriggerReflowProps = {
  watch: Accessor<unknown>
} & JSX.HTMLAttributes<HTMLDivElement>

export function TriggerReflow(props: TriggerReflowProps) {
  const [local, others] = splitProps(props, ["watch", "classList"])
  const [hide, setHide] = createSignal(false)

  createEffect(on(props.watch, () => {
    setHide(true)
    let raf: ReturnType<typeof requestAnimationFrame> | undefined = requestAnimationFrame(() => {
      raf = undefined
      setHide(false)
    })
    onCleanup(() => {
      raf && cancelAnimationFrame(raf)
    })
  }, { defer: true }))

  return (
    <div {...others} classList={{ [styles.hide]: hide(), ...local.classList }} />
  )
}
