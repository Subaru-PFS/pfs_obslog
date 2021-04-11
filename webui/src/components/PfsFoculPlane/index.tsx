import style from "./style.module.scss"
import { Cobra, NUM_OF_COBRAS } from '~/pfs/Cobra'
import { defineComponent, onMounted, ref, watch, watchEffect } from "@vue/runtime-core"

export default defineComponent({
  setup($$) {
    const canvas = ref<HTMLCanvasElement | null>(null)
    const ctx = ref<CanvasRenderingContext2D | null>(null)

    onMounted(() => {
      ctx.value = canvas.value!.getContext('2d')
      drawCobras(ctx.value!)
    })

    const render = () => (
      <canvas
        ref={canvas}
        style={{ border: 'solid 1px red' }}
        width={$$.width} height={$$.height} />
    )

    return render
  },
  props: {
    width: {
      type: Number,
      default: 640,
    },
    height: {
      type: Number,
      default: 480,
    }
  }
})


function drawCobras(ctx: CanvasRenderingContext2D) {
  console.log('DRAW')
  // Set line width
  ctx.lineWidth = 10

  // Wall
  ctx.strokeRect(75, 140, 150, 110)

  // Door
  ctx.fillRect(130, 190, 40, 60)

  // Roof
  ctx.moveTo(50, 140)
  ctx.lineTo(150, 60)
  ctx.lineTo(250, 140)
  ctx.closePath()
  ctx.stroke()
}


// export class FocalPlane extends Vue {
//   render(h: CreateElement) {
//     const w = 1
//     const H = 60
//     return (
//       <div class={style.root}>
//         <svg viewBox={`${-w} ${-H} ${2 * w} ${2 * H}`} width={this.size * Math.sqrt(3) / 2} height={this.size}>
//           {range(NUM_OF_COBRAS).map(id => {
//             const cobra = new Cobra(id)
//             return (
//               <g transform={cobra.transform}>
//                 {this.cobraElement(h, cobra)}
//               </g>
//             )
//           })}
//         </svg>
//       </div>
//     )
//   }

//   mouseenterOnCobra(cobra: Cobra) {
//     this.$emit('mouseoveroncobra', cobra)
//   }

//   clickOnCobra(cobra: Cobra) {
//     this.$emit('clickoncobra', cobra)
//   }

//   cobraElement(h: CreateElement, cobra: Cobra) {
//     const s = 2 / Math.sqrt(3)
//     return (
//       <g
//         transform={`scale(${s})`}
//         onMouseenter={() => this.mouseenterOnCobra(cobra)}
//         onClick={() => this.clickOnCobra(cobra)}
//         fill={this.color(cobra)} >
//         {hexagon(h)}
//       </g >
//     )
//   }
// }

// function defaultColor(cobra: Cobra) {
//   return 'blue'
// }

// function hexagon(h: CreateElement) {
//   const points = regularPolygonCoords(6).map(([x, y]) => `${x},${y}`).join(' ')
//   return <polygon class="fiber" points={points} />
// }

// function range(n: number) {
//   return Array.from(Array(n).keys())
// }

// function regularPolygonCoords(n: number) {
//   return range(n).map((i): [number, number] => {
//     return [
//       Math.cos(i / n * 2 * Math.PI),
//       Math.sin(i / n * 2 * Math.PI),
//     ]
//   })
// }
