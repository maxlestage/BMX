// Carte des spots (Leaflet) + soumission par clic + galerie multi-photos.
// On peut feuilleter les spots (précédent/suivant) et voir leurs photos.

import { useEffect, useRef, useState } from 'react'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { api, ApiError, mediaUrl, type Spot } from '../../api'
import { useAuth } from '../../auth'
import { useI18n } from '../../i18n'
import { useUI } from '../../ui'
import { resizeImage } from '../../lib/image'

const CREAM = '#e6d3a7'
const SPOT_TYPES = ['street', 'park', 'plaza', 'bowl', 'diy']
const FRANCE: L.LatLngTuple = [46.6, 2.4]

function spotPhotos(s: Spot): string[] {
  const list = Array.isArray(s.photos) ? s.photos : []
  const all = s.photo_url ? [s.photo_url, ...list] : list
  return [...new Set(all)].map(mediaUrl)
}

export function Spots() {
  const { user } = useAuth()
  const { t } = useI18n()
  const mapEl = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.LayerGroup | null>(null)
  const draftRef = useRef<L.CircleMarker | null>(null)

  const [spots, setSpots] = useState<Spot[]>([])
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState<{ lat: number; lng: number } | null>(null)
  const [selected, setSelected] = useState<number>(-1) // index du spot affiché

  // Init carte (une fois).
  useEffect(() => {
    if (!mapEl.current || mapRef.current) return
    const map = L.map(mapEl.current, { scrollWheelZoom: false }).setView(FRANCE, 5)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap, © CARTO',
      maxZoom: 19,
    }).addTo(map)
    markersRef.current = L.layerGroup().addTo(map)
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Charge les spots.
  useEffect(() => {
    api
      .spots()
      .then(setSpots)
      .catch((e) => setError(e instanceof ApiError ? e.message : t('spots.loadError')))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Dessine les marqueurs ; cliquer un marqueur sélectionne le spot.
  useEffect(() => {
    const group = markersRef.current
    const map = mapRef.current
    if (!group || !map) return
    group.clearLayers()
    spots.forEach((s, i) => {
      L.circleMarker([s.latitude, s.longitude], {
        radius: 8,
        color: CREAM,
        weight: 2,
        fillColor: CREAM,
        fillOpacity: i === selected ? 1 : 0.6,
      })
        .on('click', () => setSelected(i))
        .addTo(group)
    })
    if (spots.length > 0 && selected < 0) {
      map.fitBounds(L.latLngBounds(spots.map((s) => [s.latitude, s.longitude])).pad(0.2))
    }
  }, [spots, selected])

  // Quand on sélectionne un spot : recentrer la carte dessus.
  useEffect(() => {
    const map = mapRef.current
    if (!map || selected < 0 || !spots[selected]) return
    const s = spots[selected]
    map.flyTo([s.latitude, s.longitude], Math.max(map.getZoom(), 11), { duration: 0.6 })
  }, [selected, spots])

  // Mode ajout : capter le prochain clic sur la carte.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (!adding) {
      map.getContainer().style.cursor = ''
      return
    }
    map.getContainer().style.cursor = 'crosshair'
    const onClick = (e: L.LeafletMouseEvent) => {
      setDraft({ lat: e.latlng.lat, lng: e.latlng.lng })
      draftRef.current?.remove()
      draftRef.current = L.circleMarker(e.latlng, {
        radius: 9,
        color: '#fff',
        weight: 2,
        fillColor: CREAM,
        fillOpacity: 0.9,
      }).addTo(map)
    }
    map.on('click', onClick)
    return () => {
      map.off('click', onClick)
    }
  }, [adding])

  function resetDraft() {
    setDraft(null)
    setAdding(false)
    draftRef.current?.remove()
    draftRef.current = null
    if (mapRef.current) mapRef.current.getContainer().style.cursor = ''
  }

  async function submitSpot(payload: {
    name: string
    city?: string
    spot_type: string
    description?: string
    photos: string[]
  }) {
    if (!draft) return
    setError(null)
    try {
      const created = await api.createSpot({
        ...payload,
        latitude: draft.lat,
        longitude: draft.lng,
      })
      if (created.approved) {
        setSpots((prev) => [created, ...prev])
        setNotice(t('spots.added'))
      } else {
        setNotice(t('spots.pending'))
      }
      resetDraft()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('spots.error'))
    }
  }

  const current = selected >= 0 ? spots[selected] : null

  return (
    <div className="spots">
      <div className="spots__bar">
        <span className="spots__count">{t('spots.count').replace('{n}', String(spots.length))}</span>
        {user ? (
          adding ? (
            <button className="btn btn--ghost" onClick={resetDraft}>
              {t('spots.cancel')}
            </button>
          ) : (
            <button className="btn btn--accent" onClick={() => setAdding(true)}>
              {t('spots.add')}
            </button>
          )
        ) : (
          <span className="spots__hint">{t('spots.guest')}</span>
        )}
      </div>

      {adding && !draft && <p className="spots__hint spots__hint--pulse">{t('spots.clickMap')}</p>}
      {notice && <p className="spots__notice">{notice}</p>}
      {error && <p className="account__error">{error}</p>}

      <div className="spots__map" ref={mapEl} />

      {current && (
        <SpotCard
          spot={current}
          index={selected}
          total={spots.length}
          onPrev={() => setSelected((i) => (i - 1 + spots.length) % spots.length)}
          onNext={() => setSelected((i) => (i + 1) % spots.length)}
          onClose={() => setSelected(-1)}
        />
      )}

      {draft && <SpotForm onSubmit={submitSpot} onCancel={resetDraft} />}
    </div>
  )
}

/** Fiche d'un spot : photos + infos + navigation vers un autre spot. */
function SpotCard({
  spot,
  index,
  total,
  onPrev,
  onNext,
  onClose,
}: {
  spot: Spot
  index: number
  total: number
  onPrev: () => void
  onNext: () => void
  onClose: () => void
}) {
  const { t } = useI18n()
  const { user } = useAuth()
  const { shareToMessages } = useUI()
  const photos = spotPhotos(spot)
  const [photo, setPhoto] = useState(0)
  // Réinitialise la photo affichée quand on change de spot.
  useEffect(() => setPhoto(0), [index])

  return (
    <div className="spotcard">
      <button className="spotcard__close" aria-label="×" onClick={onClose}>
        ×
      </button>

      {photos.length > 0 && (
        <div className="spotcard__gallery">
          <img className="spotcard__photo" src={photos[photo]} alt={spot.name} />
          {photos.length > 1 && (
            <div className="spotcard__dots">
              {photos.map((_, i) => (
                <button
                  key={i}
                  className={`spotcard__dot ${i === photo ? 'is-on' : ''}`}
                  aria-label={`Photo ${i + 1}`}
                  onClick={() => setPhoto(i)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="spotcard__body">
        <h3 className="spotcard__name">{spot.name}</h3>
        <p className="spotcard__meta">
          {spot.city ? `${spot.city} · ` : ''}
          <em>{spot.spot_type}</em>
        </p>
        {spot.description && <p className="spotcard__desc">{spot.description}</p>}
        {user && (
          <button
            className="btn btn--ghost spotcard__share"
            onClick={() =>
              shareToMessages(
                `📍 ${spot.name}${spot.city ? ` (${spot.city})` : ''} — ${spot.spot_type}\nhttps://www.openstreetmap.org/?mlat=${spot.latitude}&mlon=${spot.longitude}#map=17/${spot.latitude}/${spot.longitude}`,
              )
            }
          >
            🔗 {t('spots.share')}
          </button>
        )}
      </div>

      <div className="spotcard__nav">
        <button className="btn btn--ghost" onClick={onPrev}>
          ‹
        </button>
        <span className="spotcard__pos">
          {index + 1} / {total}
        </span>
        <button className="btn btn--ghost" onClick={onNext}>
          ›
        </button>
      </div>
    </div>
  )
}

function SpotForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (p: {
    name: string
    city?: string
    spot_type: string
    description?: string
    photos: string[]
  }) => void
  onCancel: () => void
}) {
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [spotType, setSpotType] = useState('street')
  const [description, setDescription] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  async function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setBusy(true)
    try {
      for (const file of Array.from(files).slice(0, 12 - photos.length)) {
        const resized = await resizeImage(file)
        const media = await api.uploadMedia(resized)
        setPhotos((prev) => (prev.length < 12 ? [...prev, media.url] : prev))
      }
    } catch {
      /* upload échoué — on ignore silencieusement cette photo */
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      className="spots__form"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({
          name: name.trim(),
          city: city.trim() || undefined,
          spot_type: spotType,
          description: description.trim() || undefined,
          photos,
        })
      }}
    >
      <input
        className="field"
        placeholder={t('spots.form.name')}
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <input
        className="field"
        placeholder={t('spots.form.city')}
        value={city}
        onChange={(e) => setCity(e.target.value)}
      />
      <select className="field" value={spotType} onChange={(e) => setSpotType(e.target.value)}>
        {SPOT_TYPES.map((st) => (
          <option key={st} value={st}>
            {st}
          </option>
        ))}
      </select>
      <textarea
        className="field"
        placeholder={t('spots.form.description')}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
      />

      <label className="spots__photos-btn">
        {busy ? t('spots.photos.adding') : t('spots.photos.add')}
        <input
          type="file"
          accept="image/*"
          multiple
          hidden
          disabled={busy || photos.length >= 12}
          onChange={(e) => addFiles(e.target.files)}
        />
      </label>
      {photos.length > 0 && (
        <div className="spots__thumbs">
          {photos.map((p, i) => (
            <div className="spots__thumb" key={p}>
              <img src={mediaUrl(p)} alt="" />
              <button
                type="button"
                className="spots__thumb-x"
                aria-label="×"
                onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="spots__form-actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          {t('spots.cancel')}
        </button>
        <button className="btn btn--accent" disabled={!name.trim() || busy}>
          {t('spots.form.send')}
        </button>
      </div>
    </form>
  )
}
