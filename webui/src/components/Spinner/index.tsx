// https://loading.io/css/
import { createApp, defineComponent, reactive, Teleport, Transition } from "vue"
import style from './style.module.scss'

const SpinnerComponent = defineComponent({
  props: {
    show: { type: Boolean, required: true },
  },
  setup($$) {
    return () => (
      <Teleport to="body">
        <Transition
          enterActiveClass={style.active}
          leaveActiveClass={style.active}
          enterFromClass={style.enterFrom}
          leaveToClass={style.leaveTo}
        >{
            () => (
              $$.show &&
              <div class={style.fill}>
                <div class={style.loader}></div>
              </div>
            )
          }</Transition>
      </Teleport >
    )
  }
})

export default SpinnerComponent

export class Spinner {
  private $ = reactive({
    count: 0,
    showSpinner: false,
  })

  constructor(readonly delay = 250) {
    const root = document.createElement('div')
    document.body.appendChild(root)
    createApp(defineComponent({
      render: () => (
        <>
          <SpinnerComponent show={this.$.showSpinner} />
          {this.$.count > 0 &&
            <Teleport to="body">
              <div class={`${style.block} block`}></div>
            </Teleport>
          }
        </>
      )
    })).mount(root)
  }

  start() {
    this.updateCount(this.$.count + 1)
  }

  stop() {
    this.updateCount(this.$.count - 1)
  }

  private timer: null | ReturnType<typeof setTimeout> = null

  private updateCount(count: number) {
    this.$.count = count
    this.timer !== null && clearTimeout(this.timer)
    this.timer = null
    if (this.$.count > 0) {
      this.timer = setTimeout(() => {
        this.timer = null
        this.$.showSpinner = true
      }, this.delay)
    } else {
      this.$.showSpinner = false
    }
  }
}
