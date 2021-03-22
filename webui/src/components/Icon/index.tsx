import type materialIconVersion from 'material-icons/_data/versions.json'
import { JSX, mergeProps, splitProps } from "solid-js"
import { tippy, TippyProps } from "../Tippy"
import styles from './styles.module.scss'
tippy


type IconNames = keyof typeof materialIconVersion


type IconProps = {
  icon: IconNames
  size?: number
  type?: 'material-icons' | 'material-icons-outlined' | 'material-icons-round' | 'material-icons-two-tone'
}


export function Icon(props: IconProps) {
  props = mergeProps({
    type: 'material-icons-outlined' as IconProps['type'],
    size: 14,
  }, props)
  return <span class={props.type} style={{ "font-size": `${props.size}px` }} >{props.icon}</span>
}


type ButtonProps = JSX.ButtonHTMLAttributes<HTMLButtonElement>


export function IconButton(props: IconProps & ButtonProps & { tippy?: TippyProps }) {
  const [local, props2] = splitProps(props, ["tippy", "classList"])
  const [iconProps, buttonProps] = splitProps(props2, ["icon", "size", "type"])
  return (
    <button classList={{ [styles.button]: true, ...local.classList }} {...buttonProps} use:tippy={local.tippy}>
      <Icon {...iconProps} />
    </button>
  )
}
