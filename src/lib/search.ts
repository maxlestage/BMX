// Recherche « intelligente » sans IA externe : on interprète une phrase libre
// (« rails et ledges à Bordeaux ») en filtres locaux (ville, type de spot,
// mots-clés) appliqués aux spots/riders/vidéos déjà chargés.

import type { Spot, Rider, Video } from '../api'

const SPOT_TYPES = ['street', 'park', 'plaza', 'bowl', 'diy']
// Synonymes courants → type de spot.
const TYPE_SYNONYMS: Record<string, string> = {
  rail: 'street',
  rails: 'street',
  ledge: 'street',
  ledges: 'street',
  curb: 'street',
  gap: 'street',
  stair: 'street',
  stairs: 'street',
  escalier: 'street',
  trottoir: 'street',
  rue: 'street',
  street: 'street',
  park: 'park',
  parc: 'park',
  bmxpark: 'park',
  bowl: 'bowl',
  piscine: 'bowl',
  plaza: 'plaza',
  place: 'plaza',
  diy: 'diy',
}

const STOP = new Set([
  'a', 'à', 'au', 'aux', 'de', 'des', 'du', 'et', 'le', 'la', 'les', 'un', 'une',
  'in', 'at', 'the', 'and', 'or', 'to', 'spots', 'spot', 'bmx',
])

export interface ParsedQuery {
  raw: string
  tokens: string[]
  city?: string
  types: string[]
}

/** Décompose une requête en ville (mot après "à/in/@"), types, mots-clés. */
export function parseQuery(raw: string, knownCities: string[]): ParsedQuery {
  const lower = raw.toLowerCase().trim()
  const words = lower.split(/[\s,]+/).filter(Boolean)

  const types = new Set<string>()
  let city: string | undefined

  // Ville : un mot connu, ou le mot juste après "à/in".
  const cityset = new Set(knownCities.map((c) => c.toLowerCase()))
  words.forEach((w, i) => {
    if ((w === 'à' || w === 'a' || w === 'in' || w === '@') && words[i + 1]) {
      const cand = words[i + 1]
      if (cityset.has(cand) || cand.length > 2) city = cand
    }
    if (cityset.has(w)) city = w
    const ty = TYPE_SYNONYMS[w]
    if (ty) types.add(ty)
    if (SPOT_TYPES.includes(w)) types.add(w)
  })

  const tokens = words.filter((w) => !STOP.has(w) && w !== city)
  return { raw, tokens, city, types: [...types] }
}

function matchText(haystack: string, tokens: string[]): boolean {
  if (tokens.length === 0) return true
  const h = haystack.toLowerCase()
  return tokens.some((t) => h.includes(t))
}

export function filterSpots(spots: Spot[], q: ParsedQuery): Spot[] {
  if (!q.raw.trim()) return spots
  return spots.filter((s) => {
    if (q.city && !(s.city ?? '').toLowerCase().includes(q.city)) return false
    if (q.types.length && !q.types.includes(s.spot_type)) return false
    const text = `${s.name} ${s.city ?? ''} ${s.spot_type} ${s.description ?? ''}`
    return matchText(text, q.tokens.filter((t) => t !== q.city))
  })
}

export function filterRiders(riders: Rider[], q: ParsedQuery): Rider[] {
  if (!q.raw.trim()) return riders
  return riders.filter((s) =>
    matchText(`${s.name} ${s.country ?? ''}`, q.tokens),
  )
}

export function filterVideos(videos: Video[], q: ParsedQuery): Video[] {
  if (!q.raw.trim()) return videos
  return videos.filter((v) => matchText(`${v.title} ${v.author ?? ''}`, q.tokens))
}
