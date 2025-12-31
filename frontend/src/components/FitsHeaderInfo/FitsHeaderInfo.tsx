import { useState, useMemo, useEffect } from 'react'
import type { FitsMeta, Card } from '../../store/api/generatedApi'
import { Tooltip } from '../Tooltip'
import styles from './FitsHeaderInfo.module.scss'

interface FitsHeaderInfoProps {
  meta: FitsMeta
}

/**
 * Safe regex compilation with fallback to escaped literal pattern
 */
function safeRegexpCompile(pattern: string, flags: string = ''): RegExp {
  if (!pattern) return /.*/
  try {
    return new RegExp(pattern, flags)
  } catch {
    // Escape special regex characters and use as literal
    const escaped = pattern.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
    return new RegExp(escaped, flags)
  }
}

export function FitsHeaderInfo({ meta }: FitsHeaderInfoProps) {
  const [hduIndex, setHduIndex] = useState(0)
  const [searchKey, setSearchKey] = useState('')
  const [searchValue, setSearchValue] = useState('')
  const [searchComment, setSearchComment] = useState('')

  // Reset HDU index if it exceeds available HDUs
  useEffect(() => {
    if (hduIndex >= meta.hdul.length) {
      setHduIndex(0)
    }
  }, [meta.hdul.length, hduIndex])

  const filteredCards = useMemo(() => {
    if (meta.hdul.length <= hduIndex) {
      return []
    }

    const keyReg = safeRegexpCompile(searchKey, 'i')
    const valueReg = safeRegexpCompile(searchValue, 'i')
    const commentReg = safeRegexpCompile(searchComment, 'i')

    return meta.hdul[hduIndex].header.cards.filter(
      (card) =>
        keyReg.test(card.key) &&
        valueReg.test(String(card.value)) &&
        commentReg.test(card.comment)
    )
  }, [meta, hduIndex, searchKey, searchValue, searchComment])

  return (
    <div className={styles.root}>
      <div className={styles.info}>
        <div className={styles.filename}>{meta.filename}</div>
        <div className={styles.hduSelector}>
          {meta.hdul.map((_, index) => (
            <button
              key={index}
              className={`${styles.hduButton} ${index === hduIndex ? styles.selected : ''}`}
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
                  placeholder="Filter..."
                  value={searchKey}
                  onChange={(e) => setSearchKey(e.target.value)}
                />
              </th>
              <th>
                <div>Value</div>
                <input
                  type="search"
                  placeholder="Filter..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                />
              </th>
              <th>
                <div>Comment</div>
                <input
                  type="search"
                  placeholder="Filter..."
                  value={searchComment}
                  onChange={(e) => setSearchComment(e.target.value)}
                />
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredCards.map((card, idx) => (
              <CardRow key={`${card.key}-${idx}`} card={card} />
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
  const valueStr = String(card.value)

  if (card.key === 'COMMENT' || card.key === 'HISTORY') {
    return (
      <tr>
        <th className={styles.commentKey}>{card.key}</th>
        <td className={styles.commentValue} colSpan={2}>
          {valueStr}
        </td>
      </tr>
    )
  }

  return (
    <tr>
      <th>
        <Tooltip content={card.key}>
          <span className={styles.cellContent}>{card.key}</span>
        </Tooltip>
      </th>
      <td>
        <Tooltip content={valueStr}>
          <span className={styles.cellContent}>{valueStr}</span>
        </Tooltip>
      </td>
      <td className={styles.comment}>
        <Tooltip content={card.comment}>
          <span className={styles.cellContent}>{card.comment}</span>
        </Tooltip>
      </td>
    </tr>
  )
}
