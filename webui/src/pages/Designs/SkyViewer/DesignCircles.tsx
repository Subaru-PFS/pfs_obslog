import { angle, easing, Globe, GlobePointerEvent, Layer, math, MousePicker, path, SkyCoord, V4, View } from '@stellar-globe/stellar-globe'
import { mat4, vec3 } from 'gl-matrix'
import { createEffect, onCleanup, onMount } from "solid-js"
import { KdTree } from '~/utils/kd_tree'
import { range } from '~/utils/range'
import { designCrossMatchCosine, useDesignContext } from '../context'
import { PfsDesignEntry } from '../types'
import { useStellarGlobe } from "./StellarGlobe"


const markerColor: V4 = [0.75, 0.75, 0.5, 1]
const focusColor: V4 = [1, 0, 1, 0.75]
const selectedColor: V4 = [0, 1, 1, 1]
const FOV = angle.deg2rad(1.4)


type DesignContext = ReturnType<typeof useDesignContext>


export function DesignCircles() {
  const { globe } = useStellarGlobe()
  const context = useDesignContext()
  const { designs, focusedDesign } = context

  onMount(() => {
    const markers = globe().addNewLayer(MarkersLayer, context)
    const selected = globe().addNewLayer(SingleMarker, selectedColor)
    const focus = globe().addNewLayer(SingleMarker, focusColor, 1.05 * FOV / 2)

    onCleanup(() => {
      focus.release()
      selected.release()
      markers.release()
    })

    createEffect(() => {
      markers.setDesigns(designs.store.list)
    })

    createEffect(() => {
      const design = focusedDesign()
      focus.enabled = !!design
      if (design) {
        const { ra, dec } = design
        focus.setCenter(ra, dec)
      }
      globe().requestRefresh()
    })

    createEffect(() => {
      const design = context.selectedDesign()
      selected.enabled = !!design
      if (design) {
        const { ra, dec } = design
        selected.setCenter(ra, dec)
      }
      globe().requestRefresh()
    })
  })

  return <div />
}


class MarkersLayer extends Layer {
  private renderer: path.Renderer
  private alpha = 0

  constructor(globe: Globe, private context: DesignContext, readonly radius = FOV / 2) {
    super(globe)
    this.renderer = new path.Renderer(globe.gl)
    this.renderer.blendMode = path.BlendMode.NORMAL
    this.renderer.darkenNarrowLine = false
    this.renderer.minWidth = 5 * globe.camera.canvasPixels
    this.onRelease(() => this.renderer.release())
  }

  setDesigns(designs: PfsDesignEntry[]) {
    const paths: path.Path[] = []
    for (const { ra, dec } of designs) {
      const center = SkyCoord.fromDeg(ra, dec)
      paths.push(designPath(center, markerColor, this.radius))
    }
    this.renderer.setPaths(paths)
    this.mousePickers = [new MarkerMousePicker(this.globe, designs, this.context)]
    this.addAnimation(({ r }) => {
      this.alpha = easing.slowStartStop4(r)
    }, { duration: 2000 })
  }

  render(view: View): void {
    const alpha = math.clip(4 * (this.globe.camera.fovy - angle.deg2rad(2)), 0.25, 1)
    this.renderer.render(view, alpha * this.alpha)
  }
}


class MarkerMousePicker extends MousePicker {
  private index: KdTree<3, PfsDesignEntry>

  constructor(
    readonly globe: Globe,
    readonly designs: PfsDesignEntry[],
    private context: DesignContext,
  ) {
    super()
    this.index = new KdTree(designs, design2xyz)
  }

  private nearestDesign(e: GlobePointerEvent): PfsDesignEntry | undefined {
    const fovy = this.globe.camera.fovy
    const grow = fovy * 20 / this.globe.canvasELement.clientHeight
    const hit = this.index.nearest(e.coord.xyz, 1, grow + angle.deg2rad(0.7))
    return hit[0]
  }

  hit(e: GlobePointerEvent): { hit: boolean; passThrough: boolean } {
    return {
      hit: !!this.nearestDesign(e),
      passThrough: true,
    }
  }

  onMove(e: GlobePointerEvent): void {
    const d0 = this.context.focusedDesign()
    const d1 = this.nearestDesign(e)
    if (
      d0 === undefined ||
      d1 === undefined ||
      SkyCoord.fromDeg(d0.ra, d0.dec).cosine(SkyCoord.fromDeg(d1.ra, d1.dec)) < designCrossMatchCosine
    ) {
      this.context.setFocusedDesign(d1)
    }
  }

  onPointerDown(e: GlobePointerEvent): void {
    const d = this.nearestDesign(e)
    if (d) {
      const camera = this.globe.camera
      const { ra, dec } = d
      const coord = SkyCoord.fromDeg(ra, dec)
      if (camera.fovy >= angle.deg2rad(1)) {
        this.context.setSelectedDesign(d)
      }
      if (camera.fovy >= angle.deg2rad(4)) {
        this.context.jumpTo({ fovy: angle.deg2rad(0.8) }, { coord })
      }
    }
  }
}


class SingleMarker extends Layer {
  private renderer: path.Renderer
  enabled = false
  modelMatrix = mat4.create()

  constructor(globe: Globe, color: V4, radius = FOV / 2) {
    super(globe)
    this.renderer = new path.Renderer(globe.gl)
    this.renderer.darkenNarrowLine = false
    this.renderer.minWidth = 7 * globe.camera.canvasPixels
    this.renderer.setPaths([designPath(SkyCoord.fromRad(0, 0), color, radius)])
    this.renderer.blendMode = path.BlendMode.NORMAL
    this.onRelease(() => this.renderer.release())
  }

  render(view: View): void {
    if (this.enabled) {
      this.renderer.modelMatrix = this.modelMatrix
      this.renderer.render(view)
    }
  }

  setCenter(ra: number, dec: number) {
    const m = mat4.create()
    mat4.rotateZ(m, m, angle.deg2rad(ra))
    mat4.rotateY(m, m, -angle.deg2rad(dec))
    this.modelMatrix = m
  }
}


function designPath(center: SkyCoord, color: V4, radius: number): path.Path {
  const e1 = vec3.normalize(vec3.create(), vec3.cross(vec3.create(), center.xyz, [0, 0, 1]))
  const e2 = vec3.cross(vec3.create(), center.xyz, e1)
  const n = 72
  return {
    points: range(n).map(i => {
      const t = 2 * Math.PI * i / n
      const p = center.xyz
      vec3.scaleAndAdd(p, p, e1, radius * Math.cos(t))
      vec3.scaleAndAdd(p, p, e2, radius * Math.sin(t))
      return ({
        color,
        position: p,
        size: 0,
      })
    }),
    close: true,
    joint: path.JOINT.MITER,
  }
}


function design2xyz(design: PfsDesignEntry) {
  const { ra, dec } = design
  return SkyCoord.fromDeg(ra, dec).xyz
}