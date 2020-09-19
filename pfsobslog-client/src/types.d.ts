declare module '*.vue' {
  import { defineComponent, CSSProperties } from 'vue'
  const Component: ReturnType<typeof defineComponent>
  export default Component
}

declare module '*.module.scss' {
  const style: { [className: string]: string }
  export default style
}
