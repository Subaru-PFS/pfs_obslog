import { defineComponent } from "@vue/runtime-core"
import { Transition } from "@vue/runtime-dom"
import { RouterView } from "vue-router"
import style from './style.module.scss'

export default defineComponent({
  name: 'App',
  setup() {
    return () => (
      <div style={{
        height: '100%',
        overflow: 'auto',
      }}>
        <RouterView v-slots={{
          default: ({ Component }: any) =>
            <>
              <Transition
                mode="out-in"
                enterActiveClass={style.active}
                leaveActiveClass={style.active}
                enterFromClass={style.enterFrom}
                leaveToClass={style.leaveTo}
              >
                {Component}
              </Transition>
            </>
        }} />
      </div>
    )
  }
})