import { css, StyleSheet } from 'aphrodite'
import { useRef } from 'react'
import { Route, Routes, useLocation } from "react-router-dom"
import { CSSTransition, TransitionGroup } from 'react-transition-group'
import Home from './Home'
import Login from './Login'

const entries = [
  { path: '/', Component: Home },
  { path: '/login', Component: Login },
]

export function RouteEntries() {
  const location = useLocation()
  const nodeRef = useRef(null)
  return (
    <TransitionGroup>
      <CSSTransition
        key={location.key}
        timeout={200}
        unmountOnExit={true}
        // nodeRef={nodeRef}
        classNames={{
          enter: css(styles.enter),
          enterActive: css(styles.enterActive),
          exit: css(styles.exit),
          exitActive: css(styles.exitActive),
        }}
      >
        <Routes>
          {entries.map(({ path, Component }) => (
            <Route ref={nodeRef} key={path} path={path} element={<Component />} />
          ))}
        </Routes>
      </CSSTransition>
    </TransitionGroup >
  )
}

const styles = StyleSheet.create({
  enter: {
    opacity: 0,
  },
  enterActive: {
    transition: 'opacity 200ms',
    opacity: 1,
  },
  exit: {
    opacity: 0,
  },
  exitActive: {
    transition: 'opacity 200ms',
    // opacity: 1,
  },
})
