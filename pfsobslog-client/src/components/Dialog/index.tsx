import { createApp, defineComponent, markRaw, reactive, Teleport, Transition, TransitionGroup } from "vue"
import Center from "../Center"
import style from './style.module.scss'


type Dialog = {
  component: any
  props: any
  closable: boolean
  resolve: (...args: any[]) => void
  reject: (...args: any[]) => void
  throwOnClose: boolean
}

const Dialog = defineComponent({
  setup(_, { slots }) {
    return () => (
      <Center class={style.fill}>
        {() => (
          <div class={style.dialog} onClick={e => e.stopPropagation()}>{slots.default?.()}</div>
        )}
      </Center>
    )
  }
})

export class UserCanceled extends Error { }

class DialogManager {
  private $ = reactive({
    stack: [] as Dialog[],
  })

  private resolveTop(e: any) {
    const top = this.$.stack.pop()!
    top.resolve(e)
  }

  private rejectTop(e: any) {
    const top = this.$.stack.pop()!
    top.reject(e)
  }

  constructor() {
    const root = document.createElement('div')
    document.body.appendChild(root)
    createApp(defineComponent({
      render: () => (
        <Teleport to="body">
          <>
            <Transition
              enterActiveClass={style.fadeActive}
              leaveActiveClass={style.fadeActive}
              enterFromClass={style.fadeFrom}
              leaveToClass={style.fadeFrom}
            >
              {() => (
                this.$.stack.length > 0 && <div class={[style.block, style.fill]}></div>)
              }
            </Transition>
            <TransitionGroup
              enterActiveClass={style.openActive}
              leaveActiveClass={style.openActive}
              enterFromClass={style.openFrom}
              leaveToClass={style.openFrom}
            >{() => (
              this.$.stack.map((d, i) => {
                const Component = d.component
                const props = d.props
                if (i < this.$.stack.length - 1) {
                  return
                }
                return (
                  <Dialog
                    key={i}
                    // @ts-ignore
                    onClick={() => {
                      if (d.closable) {
                        if (d.throwOnClose) {
                          this.rejectTop(new UserCanceled())
                        } else {
                          this.resolveTop(undefined)
                        }
                      }
                    }}
                  >
                    {() => (
                      <Component
                        {...props}
                        onResolve={(e: any) => { this.resolveTop(e) }}
                        onReject={(e: any) => { this.rejectTop(e) }}
                      />
                    )}
                  </Dialog>
                )
              })
            )}
            </TransitionGroup>
          </>
        </Teleport>
      )
    })).mount(root)
  }

  push(dialog: Dialog) {
    this.$.stack.push(dialog)
  }
}

let manager: DialogManager | undefined

export function openDialog<T>(
  component: any,
  options: {
    props?: {},
    closable?: boolean,
    throwOnClose?: boolean,
  } = {}
) {
  manager ??= new DialogManager()
  return new Promise<T>((resolve, reject) => {
    const { props, closable, throwOnClose } = options
    manager!.push({
      component: markRaw(component),
      resolve,
      reject,
      props: props ?? {},
      closable: closable ?? true,
      throwOnClose: throwOnClose ?? true,
    })
  })
}
