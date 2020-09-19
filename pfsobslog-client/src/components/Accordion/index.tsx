// https://note.com/noliaki/n/n6e3a60748c11
import { defineComponent, PropType, Transition, TransitionGroup } from "vue"
import style from './style.module.scss'

export default defineComponent({
  props: {
    opened: { type: Boolean, required: true },
    direction: { type: String as PropType<'vertical' | 'horizontal'>, default: 'vertical' },
  },
  setup(props, { slots }) {
    if (slots.default === undefined) {
      throw new Error(`Default slot is not provided for Accordion`)
    }
    return () => (
      <Transition
        enterFromClass={style.enterFrom}
        enterToClass={style.enterTo}
        leaveFromClass={style.leaveFrom}
        leaveToClass={style.leaveTo}
        enterActiveClass={style.enterActive}
        leaveActiveClass={style.leaveActive}
        onEnter={onEnter}
        onAfterEnter={onAfterEnter}
        onLeave={onLeave}
        onAfterLeave={onAfterLeave}
      >{
          () => (
            props.opened && slots.default?.()
          )
        }
      </Transition>
    )
  }
})

export const AccordionList = defineComponent({
  props: {
    tag: { type: String, default: 'span' },
    direction: { type: String as PropType<'vertical' | 'horizontal'>, default: 'vertical' },
  },
  setup($p, { slots }) {
    if (slots.default === undefined) {
      throw new Error(`Default slot is not provided for Accordion`)
    }
    return () => (
      <TransitionGroup
        tag={$p.tag}
        enterFromClass={style.enterFrom}
        enterToClass={style.enterTo}
        leaveFromClass={style.leaveFrom}
        leaveToClass={style.leaveTo}
        enterActiveClass={style.enterActive}
        leaveActiveClass={style.leaveActive}
        onEnter={onEnter}
        onAfterEnter={onAfterEnter}
        onLeave={onLeave}
        onAfterLeave={onAfterLeave}
      >{
          () => (
            slots.default?.()
          )
        }
      </TransitionGroup>
    )
  }
})


function nextFrame(fn: Parameters<typeof requestAnimationFrame>[0]) {
  requestAnimationFrame(fn)
}

const castArg = <T1, T2, T3>(f: (arg1: T2) => T3) => {
  return (arg2: T1) => {
    return f(arg2 as any as T2)
  }
}

const onEnter = castArg<Element, HTMLElement, void>(el => {
  el.style.height = '0'
  nextFrame(() => {
    el.style.height = `${el.scrollHeight}px`
  })
})

const onLeave = castArg<Element, HTMLElement, void>(el => {
  el.style.height = `${el.scrollHeight}px`
  nextFrame(() => {
    el.style.height = '0'
  })
})

const onAfterEnter = castArg<Element, HTMLElement, void>(el => {
  el.style.height = 'auto'
})

const onAfterLeave = castArg<Element, HTMLElement, void>(el => {
  el.style.height = 'auto'
})
