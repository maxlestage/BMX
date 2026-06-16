// Avatar réutilisable : photo du membre si disponible, sinon ses initiales.
// L'URL média (relative) est résolue via mediaUrl pour marcher en prod.
import { mediaUrl } from '../api'

function initials(name?: string | null): string {
  const n = (name ?? '').trim()
  if (!n) return '?'
  return n
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

export function Avatar({
  url,
  name,
  size = 44,
  bare = false,
  className = '',
}: {
  url?: string | null
  name?: string | null
  size?: number
  /** Sans bordure accent (ex. petit avatar d'onglet). */
  bare?: boolean
  className?: string
}) {
  const src = mediaUrl(url)
  const style = { width: size, height: size, fontSize: Math.round(size * 0.4) }
  const cls = `avatar ${bare ? 'avatar--bare' : ''} ${className}`.trim()
  if (src) {
    return <img className={cls} style={style} src={src} alt="" loading="lazy" />
  }
  return (
    <span className={`${cls} avatar--ph`} style={style} aria-hidden="true">
      {initials(name)}
    </span>
  )
}
