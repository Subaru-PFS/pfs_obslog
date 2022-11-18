import { angle, BillboardImage, BillboardImageRef, BillboardRenderer, Globe, Layer, math, V3, V4, View } from "@stellar-globe/stellar-globe"


type Options = {
  markers: Marker[]
  markerImage: BillboardImage
}


type Marker = {
  coord: V3
  color: V4
}


export class MarkerLayer extends Layer {
  enabled = true
  private br!: BillboardRenderer

  constructor(
    globe: Globe,
    private options: Options,
  ) {
    super(globe)
    this.br = new BillboardRenderer(this.globe.gl)
    this.onRelease(() => this.br.release())
    this.rebuild()
  }

  private rebuild() {
    const { markers, markerImage } = this.options
    if (markers.length > 0) {
      const imageRefs: BillboardImageRef[] = []
      const marker: BillboardImage = markerImage
      for (const { color, coord } of markers) {
        imageRefs.push({
          imageID: 0,
          position: coord,
          color,
        })
      }
      this.br.buildArray([marker], imageRefs)
      this.globe.requestRefresh()
    }
  }

  setOptions(options: Partial<Options>) {
    Object.assign(this.options, options)
    this.rebuild()
  }

  render(view: View) {
    if (this.enabled && this.options.markers.length > 0) {
      const { fovy } = this.globe.viewFactory
      const lfov = Math.log(fovy)
      this.br.alpha = math.clip(0.5 * (maxFovy - lfov), 0, 1) * math.clip((lfov - minFovy), 0, 1)
      this.br.render(view)
    }
  }
}

const minFovy = Math.log(angle.deg2rad(0.025))
const maxFovy = Math.log(angle.deg2rad(2))