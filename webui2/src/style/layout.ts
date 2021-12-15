import { StyleSheet, css } from 'aphrodite'

const styles = StyleSheet.create({
  hEnd: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  hCenter: {
    display: 'flex',
    justifyContent: 'center',
  }
})

type names = keyof typeof styles

const layout = Object.fromEntries(
  Object.entries(styles).map(([k, v]) => [k, css(v)])
) as { [k in names]: string }

export { layout }
