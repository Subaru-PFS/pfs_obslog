/**
 * HSC PDR3 wide color params popover
 * Uses floating-ui to display a settings panel for adjusting colorParams
 */
import { useState, type ReactNode } from 'react'
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useClick,
  useDismiss,
  useInteractions,
  FloatingPortal,
} from '@floating-ui/react'
import { LogScaleRange } from '@stellar-globe/react-stellar-globe'
import styles from './HscColorParamsPopover.module.scss'

export interface SdssTrueColorParams {
  type: 'sdssTrueColor'
  filters: string[]
  sdssTrueColor: {
    beta: number
    a: number
    bias: number
    b0: number
  }
}

interface HscColorParamsPopoverProps {
  colorParams: SdssTrueColorParams
  onColorParamsChange: (params: SdssTrueColorParams) => void
  children: ReactNode
}

export function HscColorParamsPopover({
  colorParams,
  onColorParamsChange,
  children,
}: HscColorParamsPopoverProps) {
  const [isOpen, setIsOpen] = useState(false)

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: 'bottom-start',
    middleware: [
      offset(8),
      flip({ fallbackAxisSideDirection: 'start' }),
      shift({ padding: 8 }),
    ],
    whileElementsMounted: autoUpdate,
  })

  const click = useClick(context)
  const dismiss = useDismiss(context)

  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss])

  const handleBetaChange = (beta: number) => {
    onColorParamsChange({
      ...colorParams,
      sdssTrueColor: { ...colorParams.sdssTrueColor, beta },
    })
  }

  const handleB0Change = (b0: number) => {
    onColorParamsChange({
      ...colorParams,
      sdssTrueColor: { ...colorParams.sdssTrueColor, b0 },
    })
  }

  const handleAChange = (a: number) => {
    onColorParamsChange({
      ...colorParams,
      sdssTrueColor: { ...colorParams.sdssTrueColor, a },
    })
  }

  const handleBiasChange = (bias: number) => {
    onColorParamsChange({
      ...colorParams,
      sdssTrueColor: { ...colorParams.sdssTrueColor, bias },
    })
  }

  return (
    <>
      <span ref={refs.setReference} {...getReferenceProps()}>
        {children}
      </span>
      {isOpen && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className={styles.popover}
          >
            <div className={styles.header}>
              <span>HSC PDR3 Color Settings</span>
              <button
                className={styles.closeButton}
                onClick={() => setIsOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className={styles.content}>
              <div className={styles.paramRow}>
                <label>β (brightness)</label>
                <LogScaleRange
                  value={colorParams.sdssTrueColor.beta}
                  min={0}
                  max={2e8}
                  onInput={handleBetaChange}
                  className={styles.slider}
                />
                <span className={styles.value}>
                  {colorParams.sdssTrueColor.beta.toExponential(2)}
                </span>
              </div>
              <div className={styles.paramRow}>
                <label>
                  b<sub>0</sub> (softening)
                </label>
                <LogScaleRange
                  value={colorParams.sdssTrueColor.b0}
                  min={0}
                  max={5e-5}
                  onInput={handleB0Change}
                  className={styles.slider}
                />
                <span className={styles.value}>
                  {colorParams.sdssTrueColor.b0.toExponential(2)}
                </span>
              </div>
              <div className={styles.paramRow}>
                <label>A (contrast)</label>
                <LogScaleRange
                  value={colorParams.sdssTrueColor.a}
                  min={0}
                  max={1e4}
                  onInput={handleAChange}
                  className={styles.slider}
                />
                <span className={styles.value}>
                  {colorParams.sdssTrueColor.a.toExponential(2)}
                </span>
              </div>
              <div className={styles.paramRow}>
                <label>bias</label>
                <LogScaleRange
                  value={colorParams.sdssTrueColor.bias}
                  min={-0.5}
                  max={0.5}
                  a={1e-8}
                  onInput={handleBiasChange}
                  className={styles.slider}
                />
                <span className={styles.value}>
                  {colorParams.sdssTrueColor.bias.toFixed(3)}
                </span>
              </div>
            </div>
          </div>
        </FloatingPortal>
      )}
    </>
  )
}
