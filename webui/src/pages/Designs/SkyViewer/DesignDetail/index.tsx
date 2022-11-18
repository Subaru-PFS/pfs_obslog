import { BillboardImage, SkyCoord, V4 } from '@stellar-globe/stellar-globe'
import { createEffect, onCleanup, onMount } from "solid-js"
import { useDesignContext } from "../../context"
import { targetTypeColors } from '../../legend'
import { PfsDesignDetail } from '../../types'
import { useStellarGlobe } from '../StellarGlobe'
import { MarkerLayer } from './MakerLayer'
import { markers } from './markers'


export function DesignDetail() {
  const { showFibers, designDetail } = useDesignContext()
  const { globe } = useStellarGlobe()

  // design marker
  onMount(() => {
    const markerImages: BillboardImage[] = [
      { imageData: markers.circle(32), origin: [0, 0] },
      { imageData: markers.polygon(32), origin: [0, 0] },
    ]
    const layer = globe().addNewLayer(MarkerLayer, { markers: [], markerImages })
    onCleanup(() => layer.release())

    createEffect(() => {
      if (designDetail()) {
        const markers = fiberMarkers(designDetail()!)
        layer.setOptions({ markers })
      }
    })

    createEffect(() => {
      layer.enabled = !!designDetail() && showFibers()
      globe().requestRefresh()
    })
  })

  return <div />
}


function fiberMarkers(designDetail: PfsDesignDetail) {
  const markers = [
    ...(() => {
      const { design_data: { ra, dec, targetType } } = designDetail
      return ra.map((a, i) => {
        const d = dec[i]
        const color3 = targetTypeColors[targetType[i]]?.color.unitArray() ?? [0, 0, 0]
        return {
          coord: SkyCoord.fromDeg(a, d).xyz,
          color: [...color3, 1] as V4,
          imageID: 0,
        }
      })
    })(),
    ...(() => {
      const { guidestar_data: { ra, dec } } = designDetail
      return ra.map((a, i) => {
        const d = dec[i]
        const color3 = [1, 0, 0]
        return {
          coord: SkyCoord.fromDeg(a, d).xyz,
          color: [...color3, 1] as V4,
          imageID: 1,
        }
      })
    })(),
  ]
  return markers
}
