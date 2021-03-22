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
    const markerImage: BillboardImage = { imageData: markers.circle(32), origin: [0, 0] }
    const layer = globe().addNewLayer(MarkerLayer, { markers: [], markerImage })
    onCleanup(() => layer.release())

    createEffect(() => {
      if (designDetail()) {
        const markers = designMarkers(designDetail()!)
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


function designMarkers(designDetail: PfsDesignDetail) {
  const { design_data: { ra, dec, targetType } } = designDetail
  const markers = ra.map((a, i) => {
    const d = dec[i]
    const color3 = targetTypeColors[targetType[i]]?.color.unitArray() ?? [0, 0, 0]
    return {
      coord: SkyCoord.fromDeg(a, d).xyz,
      color: [...color3, 1] as V4,
    }
  })
  return markers
}
