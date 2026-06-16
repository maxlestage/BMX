// Carte mondiale des BMX shops — annuaire pur (on n'y vend rien, la vente
// entre membres se passe dans l'onglet Market). Deuxième carte Leaflet,
// indépendante de celle des spots. Pré-remplie par le seed OpenStreetMap
// (732 shops dans le monde), enrichie par la communauté (soumission par clic,
// modération comme les spots).

import { useEffect, useMemo, useRef, useState } from 'react'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { api, ApiError, mediaUrl, type Shop } from '../../api'
import { useAuth } from '../../auth'
import { useI18n } from '../../i18n'

const SHOP_COLOR = '#ededec'
const WORLD: L.LatLngTuple = [25, 5]
const LIST_MAX = 80

export function Shops() {
  const { user } = useAuth()
  const { t } = useI18n()
  const mapEl = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.LayerGroup | null>(null)
  const draftRef = useRef<L.CircleMarker | null>(null)

  const [shops, setShops] = useState<Shop[]>([])
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState<{ lat: number; lng: number } | null>(null)
  const [selected, setSelected] = useState<number>(-1) // index du shop affiché
  const [query, setQuery] = useState('')

  // Init carte (une fois).
  useEffect(() => {
    if (!mapEl.current || mapRef.current) return
    const map = L.map(mapEl.current, { scrollWheelZoom: false }).setView(WORLD, 2)
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

  // Charge les shops.
  useEffect(() => {
    api
      .shops()
      .then(setShops)
      .catch((e) => setError(e instanceof ApiError ? e.message : t('shops.loadError')))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Dessine les marqueurs ; cliquer un marqueur sélectionne le shop.
  useEffect(() => {
    const group = markersRef.current
    const map = mapRef.current
    if (!group || !map) return
    group.clearLayers()
    const located = shops.filter((s) => s.latitude != null && s.longitude != null)
    located.forEach((s) => {
      const i = shops.indexOf(s)
      L.circleMarker([s.latitude!, s.longitude!], {
        radius: 7,
        color: SHOP_COLOR,
        weight: 2,
        fillColor: SHOP_COLOR,
        fillOpacity: i === selected ? 1 : 0.55,
      })
        .on('click', () => setSelected(i))
        .addTo(group)
    })
    if (located.length > 0 && selected < 0) {
      map.fitBounds(
        L.latLngBounds(located.map((s) => [s.latitude!, s.longitude!])).pad(0.1),
        { maxZoom: 6 },
      )
    }
  }, [shops, selected])

  // Quand on sélectionne un shop : recentrer la carte dessus.
  useEffect(() => {
    const map = mapRef.current
    const s = selected >= 0 ? shops[selected] : null
    if (!map || !s || s.latitude == null || s.longitude == null) return
    map.flyTo([s.latitude, s.longitude], Math.max(map.getZoom(), 12), { duration: 0.6 })
  }, [selected, shops])

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
        fillColor: SHOP_COLOR,
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

  async function submitShop(payload: {
    name: string
    city?: string
    address?: string
    url?: string
    description?: string
  }) {
    if (!draft) return
    setError(null)
    try {
      const created = await api.createShop({
        ...payload,
        latitude: draft.lat,
        longitude: draft.lng,
      })
      if (created.approved) {
        setShops((prev) => [...prev, created])
        setNotice(t('shops.added'))
      } else {
        setNotice(t('shops.pending'))
      }
      resetDraft()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('shops.error'))
    }
  }

  const current = selected >= 0 ? shops[selected] : null

  // Recherche (nom / ville / adresse), liste plafonnée pour rester fluide.
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return shops
    return shops.filter((s) =>
      [s.name, s.city, s.address].some((v) => v && v.toLowerCase().includes(q)),
    )
  }, [shops, query])

  return (
    <div className="shops">
      <div className="spots__bar">
        <span className="spots__count">{t('shops.count').replace('{n}', String(shops.length))}</span>
        {user ? (
          adding ? (
            <button className="btn btn--ghost" onClick={resetDraft}>
              {t('shops.cancel')}
            </button>
          ) : (
            <button className="btn btn--accent" onClick={() => setAdding(true)}>
              {t('shops.add')}
            </button>
          )
        ) : (
          <span className="spots__hint">{t('shops.guest')}</span>
        )}
      </div>
      <p className="shops__tagline">{t('shops.tagline')}</p>

      {adding && !draft && <p className="spots__hint spots__hint--pulse">{t('shops.clickMap')}</p>}
      {notice && <p className="spots__notice">{notice}</p>}
      {error && <p className="account__error">{error}</p>}

      <div className="spots__map" ref={mapEl} />

      {current && (
        <ShopCard
          shop={current}
          index={selected}
          total={shops.length}
          onPrev={() => setSelected((i) => (i - 1 + shops.length) % shops.length)}
          onNext={() => setSelected((i) => (i + 1) % shops.length)}
          onClose={() => setSelected(-1)}
        />
      )}

      {draft && <ShopForm onSubmit={submitShop} onCancel={resetDraft} />}

      <input
        className="field shops__search"
        type="search"
        placeholder={t('shops.search')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <ul className="shops__list">
        {matches.slice(0, LIST_MAX).map((s) => {
          const i = shops.indexOf(s)
          return (
            <li key={s.id}>
              <button
                className={`shops__row ${i === selected ? 'is-active' : ''}`}
                onClick={() => setSelected(i)}
              >
                <strong className="shops__name">{s.name}</strong>
                <span className="shops__meta">{s.city ?? ''}</span>
              </button>
            </li>
          )
        })}
      </ul>
      {matches.length > LIST_MAX && (
        <p className="shops__more">
          {t('shops.more').replace('{n}', String(matches.length - LIST_MAX))}
        </p>
      )}
    </div>
  )
}

/** Fiche d'un shop : infos + lien site + navigation vers un autre shop. */
function ShopCard({
  shop,
  index,
  total,
  onPrev,
  onNext,
  onClose,
}: {
  shop: Shop
  index: number
  total: number
  onPrev: () => void
  onNext: () => void
  onClose: () => void
}) {
  const { t } = useI18n()
  return (
    <div className="spotcard">
      <button className="spotcard__close" aria-label="×" onClick={onClose}>
        ×
      </button>

      {shop.photo_url && (
        <div className="spotcard__gallery">
          <img className="spotcard__photo" src={mediaUrl(shop.photo_url)} alt={shop.name} />
        </div>
      )}

      <div className="spotcard__body">
        <h3 className="spotcard__name">🏪 {shop.name}</h3>
        <p className="spotcard__meta">{[shop.city, shop.address].filter(Boolean).join(' · ')}</p>
        {shop.description && <p className="spotcard__desc">{shop.description}</p>}
        {shop.url && (
          <a className="shops__link" href={shop.url} target="_blank" rel="noreferrer">
            🔗 {t('shops.visit')}
          </a>
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

function ShopForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (p: {
    name: string
    city?: string
    address?: string
    url?: string
    description?: string
  }) => void
  onCancel: () => void
}) {
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [address, setAddress] = useState('')
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')

  return (
    <form
      className="spots__form"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({
          name: name.trim(),
          city: city.trim() || undefined,
          address: address.trim() || undefined,
          url: url.trim() || undefined,
          description: description.trim() || undefined,
        })
      }}
    >
      <input
        className="field"
        placeholder={t('shops.form.name')}
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <div className="market__offer-row">
        <input
          className="field"
          placeholder={t('shops.form.city')}
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
        <input
          className="field"
          placeholder={t('shops.form.address')}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>
      <input
        className="field"
        type="url"
        placeholder={t('shops.form.url')}
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <textarea
        className="field"
        placeholder={t('shops.form.description')}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
      />
      <div className="spots__form-actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          {t('shops.cancel')}
        </button>
        <button className="btn btn--accent" disabled={!name.trim()}>
          {t('shops.form.send')}
        </button>
      </div>
    </form>
  )
}
