import { useState, useMemo, useEffect, useRef } from 'react'
import {
  useGetSpsFitsHeadersApiFitsVisitsVisitIdSpsCameraIdHeadersGetQuery,
  useGetMcsFitsHeadersApiFitsVisitsVisitIdMcsFrameIdHeadersGetQuery,
  type FitsMeta,
  type Card,
} from '../../../store/api/generatedApi'
import { LoadingSpinner } from '../../../components/LoadingSpinner'
import { Tooltip } from '../../../components/Tooltip'
import { Icon } from '../../../components/Icon'
import styles from './FitsHeaderInfo.module.scss'

/**
 * FITS ID の型定義
 */
export type FitsId =
  | { type: 'sps'; visitId: number; cameraId: number }
  | { type: 'mcs'; visitId: number; frameId: number }
  | { type: 'agc'; visitId: number; exposureId: number }

interface FitsHeaderDialogProps {
  fitsId: FitsId
  onClose: () => void
}

/**
 * 正規表現を安全にコンパイル
 */
function safeRegexpCompile(pattern: string, flags: string): RegExp {
  try {
    return new RegExp(pattern, flags)
  } catch {
    // 無効なパターンの場合は何にもマッチしない正規表現を返す
    return new RegExp('(?!)', flags)
  }
}

/**
 * FITSヘッダー表示ダイアログ
 */
export function FitsHeaderDialog({ fitsId, onClose }: FitsHeaderDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  // ESCキーでダイアログを閉じる
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // 背景クリックで閉じる
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div className={styles.backdrop} onClick={handleBackdropClick}>
      <div className={styles.dialog} ref={dialogRef}>
        <div className={styles.dialogHeader}>
          <span className={styles.dialogTitle}>FITS Header</span>
          <button className={styles.closeButton} onClick={onClose}>
            <Icon name="close" size={20} />
          </button>
        </div>
        <div className={styles.dialogContent}>
          {fitsId.type === 'sps' && (
            <SpsFitsHeader visitId={fitsId.visitId} cameraId={fitsId.cameraId} />
          )}
          {fitsId.type === 'mcs' && (
            <McsFitsHeader visitId={fitsId.visitId} frameId={fitsId.frameId} />
          )}
          {fitsId.type === 'agc' && (
            <div className={styles.placeholder}>
              AGC FITS headers are not yet supported
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface SpsFitsHeaderProps {
  visitId: number
  cameraId: number
}

function SpsFitsHeader({ visitId, cameraId }: SpsFitsHeaderProps) {
  const { data, isLoading, error } = useGetSpsFitsHeadersApiFitsVisitsVisitIdSpsCameraIdHeadersGetQuery({
    visitId,
    cameraId,
  })

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <LoadingSpinner size={32} />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className={styles.error}>
        Failed to load FITS headers
      </div>
    )
  }

  return <FitsMetaViewer meta={data} />
}

interface McsFitsHeaderProps {
  visitId: number
  frameId: number
}

function McsFitsHeader({ visitId, frameId }: McsFitsHeaderProps) {
  const { data, isLoading, error } = useGetMcsFitsHeadersApiFitsVisitsVisitIdMcsFrameIdHeadersGetQuery({
    visitId,
    frameId,
  })

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <LoadingSpinner size={32} />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className={styles.error}>
        Failed to load FITS headers
      </div>
    )
  }

  return <FitsMetaViewer meta={data} />
}

interface FitsMetaViewerProps {
  meta: FitsMeta
}

function FitsMetaViewer({ meta }: FitsMetaViewerProps) {
  const [hduIndex, setHduIndex] = useState(0)
  const [searchKey, setSearchKey] = useState('')
  const [searchValue, setSearchValue] = useState('')
  const [searchComment, setSearchComment] = useState('')

  // HDU index が範囲外の場合は 0 にリセット
  const safeHduIndex = hduIndex >= meta.hdul.length ? 0 : hduIndex

  // フィルタリングされたカード
  const cards = useMemo(() => {
    const keyReg = safeRegexpCompile(searchKey, 'i')
    const valueReg = safeRegexpCompile(searchValue, 'i')
    const commentReg = safeRegexpCompile(searchComment, 'i')

    if (meta.hdul.length === 0) return []

    return meta.hdul[safeHduIndex].header.cards.filter((card) =>
      keyReg.test(card.key) &&
      valueReg.test(String(card.value)) &&
      commentReg.test(card.comment)
    )
  }, [meta, safeHduIndex, searchKey, searchValue, searchComment])

  return (
    <div className={styles.viewer}>
      <div className={styles.info}>
        <div className={styles.filename}>{meta.filename}</div>
        <div className={styles.hduButtons}>
          {meta.hdul.map((_, index) => (
            <button
              key={index}
              className={`${styles.hduButton} ${index === safeHduIndex ? styles.selected : ''}`}
              onClick={() => setHduIndex(index)}
            >
              {index}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.scrollable}>
        <table className={styles.cards}>
          <thead>
            <tr>
              <th>
                <div>Key</div>
                <input
                  type="search"
                  value={searchKey}
                  onChange={(e) => setSearchKey(e.target.value)}
                  placeholder="Filter..."
                />
              </th>
              <th>
                <div>Value</div>
                <input
                  type="search"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="Filter..."
                />
              </th>
              <th>
                <div>Comment</div>
                <input
                  type="search"
                  value={searchComment}
                  onChange={(e) => setSearchComment(e.target.value)}
                  placeholder="Filter..."
                />
              </th>
            </tr>
          </thead>
          <tbody>
            {cards.map((card, index) => (
              <CardRow key={`${card.key}-${index}`} card={card} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

interface CardRowProps {
  card: Card
}

function CardRow({ card }: CardRowProps) {
  if (card.key === 'COMMENT' || card.key === 'HISTORY') {
    return (
      <tr>
        <th className={styles.commentKey}>{card.key}</th>
        <td className={styles.commentValue} colSpan={2}>
          {String(card.value)}
        </td>
      </tr>
    )
  }

  return (
    <tr>
      <Tooltip content={card.key}>
        <th>{card.key}</th>
      </Tooltip>
      <Tooltip content={String(card.value)}>
        <td>{String(card.value)}</td>
      </Tooltip>
      <Tooltip content={card.comment || ''}>
        <td className={styles.comment}>{card.comment}</td>
      </Tooltip>
    </tr>
  )
}
