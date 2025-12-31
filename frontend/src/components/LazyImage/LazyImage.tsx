import { useState, useEffect, useRef, useCallback } from 'react'
import { Icon, IconButton } from '../Icon'
import { LoadingSpinner } from '../LoadingSpinner'
import styles from './LazyImage.module.scss'

type State = 'standby' | 'loading' | 'ready' | 'error'

interface LazyImageProps {
  /** Image source URL */
  src: string
  /** Alt text for the image */
  alt?: string
  /** Width of the placeholder/container */
  skeletonWidth: number
  /** Height of the placeholder/container */
  skeletonHeight: number
  /** Use transparent background when image is ready */
  transparentBackground?: boolean
  /** Polling interval for intersection observer (ms) */
  pollingInterval?: number
}

/**
 * Lazy loading image component
 *
 * Features:
 * - Only loads image when it enters the viewport
 * - Shows loading spinner while loading
 * - Shows error state with retry option
 * - Smooth fade-in animation when loaded
 *
 * @example
 * <LazyImage
 *   src="/api/fits/preview.png"
 *   alt="FITS preview"
 *   skeletonWidth={256}
 *   skeletonHeight={256}
 * />
 */
export function LazyImage({
  src,
  alt = '',
  skeletonWidth,
  skeletonHeight,
  transparentBackground = false,
}: LazyImageProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<State>('standby')
  const [isReady, setIsReady] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const currentSrcRef = useRef(src)

  // Track when image enters viewport
  useEffect(() => {
    const element = containerRef.current
    if (!element) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  // Load image when visible and in standby
  const loadImage = useCallback(() => {
    setState('loading')
    setIsReady(false)
    currentSrcRef.current = src

    const img = new Image()

    img.addEventListener('load', () => {
      if (currentSrcRef.current === src) {
        setState('ready')
        // Delay setting ready class for animation
        requestAnimationFrame(() => {
          setIsReady(true)
        })
      }
    })

    img.addEventListener('error', () => {
      if (currentSrcRef.current === src) {
        setState('error')
      }
    })

    img.src = src
  }, [src])

  // Start loading when element becomes visible
  useEffect(() => {
    if (isVisible && state === 'standby') {
      loadImage()
    }
  }, [isVisible, state, loadImage])

  // Reload when src changes
  useEffect(() => {
    if (isVisible) {
      loadImage()
    } else {
      setState('standby')
      setIsReady(false)
    }
  }, [src]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleReload = () => {
    loadImage()
  }

  const handleShowError = async () => {
    try {
      const response = await fetch(src)
      const text = await response.text()
      console.warn('LazyImage error details:', text)
      alert(text)
    } catch (e) {
      console.error('Failed to fetch error details:', e)
    }
  }

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(src)
  }

  const containerClass = `${styles.container} ${
    state === 'ready' && transparentBackground ? styles.transparent : ''
  }`

  return (
    <div
      ref={containerRef}
      className={containerClass}
      style={{
        width: skeletonWidth,
        height: skeletonHeight,
      }}
    >
      {(state === 'standby' || state === 'loading') && <LoadingSpinner />}

      {state === 'ready' && (
        <img
          className={`${styles.image} ${isReady ? styles.ready : ''}`}
          src={src}
          alt={alt}
          style={{
            maxWidth: skeletonWidth,
            maxHeight: skeletonHeight,
          }}
        />
      )}

      {state === 'error' && (
        <div className={styles.errorContainer}>
          <Icon name="error" size={64} />
          <div className={styles.errorActions}>
            <IconButton
              icon="refresh"
              size={32}
              onClick={handleReload}
              tooltip="Reload"
            />
            <IconButton
              icon="manage_search"
              size={24}
              onClick={handleShowError}
              tooltip="Error Detail"
            />
            <IconButton
              icon="content_copy"
              size={24}
              onClick={handleCopyUrl}
              tooltip="Copy URL to Clipboard"
            />
          </div>
        </div>
      )}
    </div>
  )
}
