// Marketplace : petites annonces de matos entre membres, avec négociation
// (offres de prix) et contact vendeur via la messagerie.

import { useEffect, useState } from 'react'
import { api, ApiError, mediaUrl, type Listing, type Offer } from '../../api'
import { useAuth } from '../../auth'
import { useI18n } from '../../i18n'
import { useUI } from '../../ui'
import { resizeImage } from '../../lib/image'
import { Avatar } from '../Avatar'

const CATEGORIES = ['deck', 'trucks', 'wheels', 'bearings', 'shoes', 'apparel', 'complete', 'other']
const CONDITIONS = ['new', 'good', 'worn']

function fmtPrice(cents: number): string {
  return (cents / 100).toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  })
}

export function Marketplace() {
  const { user } = useAuth()
  const { t } = useI18n()
  const [listings, setListings] = useState<Listing[]>([])
  const [category, setCategory] = useState('')
  const [selling, setSelling] = useState(false)
  const [selected, setSelected] = useState<Listing | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  function load(cat = category) {
    api
      .listings(cat ? { category: cat } : {})
      .then(setListings)
      .catch((e) => setError(e instanceof ApiError ? e.message : t('market.loadError')))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category])

  function onCreated(l: Listing) {
    setListings((prev) => [l, ...prev])
    setSelling(false)
    setNotice(t('market.published'))
  }

  function onUpdated(l: Listing) {
    setListings((prev) =>
      l.status === 'active' ? prev.map((x) => (x.id === l.id ? { ...x, ...l } : x)) : prev.filter((x) => x.id !== l.id),
    )
    setSelected(null)
  }

  return (
    <div className="market">
      <div className="spots__bar">
        <span className="spots__count">
          {t('market.count').replace('{n}', String(listings.length))}
        </span>
        {user ? (
          <button
            className={`btn ${selling ? 'btn--ghost' : 'btn--accent'}`}
            onClick={() => setSelling((s) => !s)}
          >
            {selling ? t('market.cancel') : t('market.sell')}
          </button>
        ) : (
          <span className="spots__hint">{t('market.guest')}</span>
        )}
      </div>

      <div className="market__cats">
        <button
          className={`market__cat ${category === '' ? 'is-on' : ''}`}
          onClick={() => setCategory('')}
        >
          {t('market.cat.all')}
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            className={`market__cat ${category === c ? 'is-on' : ''}`}
            onClick={() => setCategory(c)}
          >
            {t(`market.cat.${c}`)}
          </button>
        ))}
      </div>

      {notice && <p className="spots__notice">{notice}</p>}
      {error && <p className="account__error">{error}</p>}

      {selling && <ListingForm onCreated={onCreated} onCancel={() => setSelling(false)} />}

      {listings.length === 0 && !selling && (
        <p className="market__empty">{t('market.empty')}</p>
      )}

      <div className="market__grid">
        {listings.map((l) => (
          <button key={l.id} className="market__card" onClick={() => setSelected(l)}>
            {l.photos.length > 0 ? (
              <img className="market__photo" src={mediaUrl(l.photos[0])} alt={l.title} />
            ) : (
              <div className="market__photo market__photo--ph">🚲</div>
            )}
            <div className="market__meta">
              <strong className="market__title">{l.title}</strong>
              <span className="market__price">{fmtPrice(l.price_cents)}</span>
              <span className="market__sub">
                {t(`market.cond.${l.condition}`)}
                {l.city ? ` · ${l.city}` : ''}
              </span>
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <ListingDetail
          listing={selected}
          onClose={() => setSelected(null)}
          onUpdated={onUpdated}
        />
      )}
    </div>
  )
}

/** Fiche annonce : galerie, vendeur, offre (acheteur) ou gestion (vendeur). */
function ListingDetail({
  listing,
  onClose,
  onUpdated,
}: {
  listing: Listing
  onClose: () => void
  onUpdated: (l: Listing) => void
}) {
  const { user } = useAuth()
  const { t } = useI18n()
  const { shareToMessages, openProfile } = useUI()
  const mine = user?.id === listing.user_id
  const [photo, setPhoto] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function act(fn: () => Promise<Listing>) {
    setError(null)
    try {
      onUpdated(await fn())
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('market.error'))
    }
  }

  return (
    <div className="spotcard market__detail">
      <button className="spotcard__close" aria-label="×" onClick={onClose}>
        ×
      </button>

      {listing.photos.length > 0 && (
        <div className="spotcard__gallery">
          <img className="spotcard__photo" src={mediaUrl(listing.photos[photo])} alt={listing.title} />
          {listing.photos.length > 1 && (
            <div className="spotcard__dots">
              {listing.photos.map((_, i) => (
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
        <h3 className="spotcard__name">{listing.title}</h3>
        <p className="market__price market__price--big">{fmtPrice(listing.price_cents)}</p>
        <p className="spotcard__meta">
          {t(`market.cat.${listing.category}`)} · {t(`market.cond.${listing.condition}`)}
          {listing.city ? ` · ${listing.city}` : ''}
        </p>
        {listing.description && <p className="spotcard__desc">{listing.description}</p>}

        {listing.seller.id != null && (
          <button className="market__seller" onClick={() => openProfile(listing.seller.id!)}>
            <Avatar
              url={listing.seller.avatar_url}
              name={listing.seller.display_name ?? '?'}
              size={28}
              bare
            />
            <span>{listing.seller.display_name ?? listing.seller.username}</span>
          </button>
        )}

        {notice && <p className="spots__notice">{notice}</p>}
        {error && <p className="account__error">{error}</p>}

        {mine ? (
          <OwnerPanel
            listing={listing}
            onSold={() => act(() => api.markListingSold(listing.id))}
            onRemove={() => act(() => api.removeListing(listing.id))}
          />
        ) : user ? (
          <>
            <OfferForm listingId={listing.id} onSent={() => setNotice(t('market.offer.sent'))} />
            <button
              className="btn btn--ghost spotcard__share"
              onClick={() =>
                shareToMessages(
                  `🛒 ${listing.title} — ${fmtPrice(listing.price_cents)}\n${t('market.contactIntro')}`,
                  listing.user_id,
                )
              }
            >
              💬 {t('market.contact')}
            </button>
          </>
        ) : (
          <p className="spots__hint">{t('market.guest')}</p>
        )}
      </div>
    </div>
  )
}

/** Formulaire d'offre (négociation) pour un acheteur. */
function OfferForm({ listingId, onSent }: { listingId: number; onSent: () => void }) {
  const { t } = useI18n()
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const cents = Math.round(parseFloat(amount.replace(',', '.')) * 100)
    if (!Number.isFinite(cents) || cents < 0) return
    setBusy(true)
    setError(null)
    try {
      await api.makeOffer(listingId, {
        amount_cents: cents,
        message: message.trim() || undefined,
      })
      setAmount('')
      setMessage('')
      onSent()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('market.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="market__offer" onSubmit={submit}>
      <div className="market__offer-row">
        <input
          className="field"
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          placeholder={t('market.offer.amount')}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
        <button className="btn btn--accent" disabled={busy || !amount}>
          {t('market.offer.send')}
        </button>
      </div>
      <input
        className="field"
        placeholder={t('market.offer.message')}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={500}
      />
      {error && <p className="account__error">{error}</p>}
    </form>
  )
}

/** Panneau vendeur : offres reçues (accepter/refuser) + statut de l'annonce. */
function OwnerPanel({
  listing,
  onSold,
  onRemove,
}: {
  listing: Listing
  onSold: () => void
  onRemove: () => void
}) {
  const { t } = useI18n()
  const [offers, setOffers] = useState<Offer[] | null>(null)

  useEffect(() => {
    api
      .listingOffers(listing.id)
      .then(setOffers)
      .catch(() => setOffers([]))
  }, [listing.id])

  async function answer(o: Offer, accept: boolean) {
    try {
      const updated = accept ? await api.acceptOffer(o.id) : await api.declineOffer(o.id)
      setOffers((prev) => prev?.map((x) => (x.id === o.id ? { ...x, ...updated } : x)) ?? null)
      if (accept) onSold()
    } catch {
      /* déjà traitée / annonce close */
    }
  }

  return (
    <div className="market__owner">
      <h4 className="market__owner-title">{t('market.offers')}</h4>
      {!offers || offers.length === 0 ? (
        <p className="spots__hint">{t('market.offers.none')}</p>
      ) : (
        <ul className="market__offers">
          {offers.map((o) => (
            <li key={o.id} className="market__offer-item">
              <span className="market__offer-who">
                {o.buyer?.display_name ?? o.buyer?.username ?? '—'}
              </span>
              <span className="market__price">{fmtPrice(o.amount_cents)}</span>
              {o.message && <span className="market__offer-msg">« {o.message} »</span>}
              {o.status === 'pending' ? (
                <span className="market__offer-actions">
                  <button className="btn btn--accent" onClick={() => answer(o, true)}>
                    {t('market.accept')}
                  </button>
                  <button className="btn btn--ghost" onClick={() => answer(o, false)}>
                    {t('market.decline')}
                  </button>
                </span>
              ) : (
                <em className="market__offer-status">{t(`market.offer.${o.status}`)}</em>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="spots__form-actions">
        {listing.status === 'active' && (
          <button className="btn btn--accent" onClick={onSold}>
            {t('market.markSold')}
          </button>
        )}
        <button className="btn btn--ghost" onClick={onRemove}>
          {t('market.remove')}
        </button>
      </div>
    </div>
  )
}

/** Formulaire de publication d'annonce. */
function ListingForm({
  onCreated,
  onCancel,
}: {
  onCreated: (l: Listing) => void
  onCancel: () => void
}) {
  const { t } = useI18n()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState('deck')
  const [condition, setCondition] = useState('good')
  const [city, setCity] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setBusy(true)
    try {
      for (const file of Array.from(files).slice(0, 8 - photos.length)) {
        const resized = await resizeImage(file)
        const media = await api.uploadMedia(resized)
        setPhotos((prev) => (prev.length < 8 ? [...prev, media.url] : prev))
      }
    } catch {
      /* upload échoué — on ignore cette photo */
    } finally {
      setBusy(false)
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const cents = Math.round(parseFloat(price.replace(',', '.')) * 100)
    if (!Number.isFinite(cents) || cents < 0) return
    setBusy(true)
    setError(null)
    try {
      const created = await api.createListing({
        title: title.trim(),
        description: description.trim() || undefined,
        price_cents: cents,
        category,
        condition,
        city: city.trim() || undefined,
        photos,
      })
      onCreated(created)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('market.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="spots__form" onSubmit={submit}>
      <input
        className="field"
        placeholder={t('market.form.title')}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />
      <div className="market__offer-row">
        <input
          className="field"
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          placeholder={t('market.form.price')}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
        />
        <input
          className="field"
          placeholder={t('market.form.city')}
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
      </div>
      <div className="market__offer-row">
        <select className="field" value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {t(`market.cat.${c}`)}
            </option>
          ))}
        </select>
        <select className="field" value={condition} onChange={(e) => setCondition(e.target.value)}>
          {CONDITIONS.map((c) => (
            <option key={c} value={c}>
              {t(`market.cond.${c}`)}
            </option>
          ))}
        </select>
      </div>
      <textarea
        className="field"
        placeholder={t('market.form.description')}
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
          disabled={busy || photos.length >= 8}
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

      {error && <p className="account__error">{error}</p>}
      <div className="spots__form-actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          {t('market.cancel')}
        </button>
        <button className="btn btn--accent" disabled={!title.trim() || !price || busy}>
          {t('market.form.send')}
        </button>
      </div>
    </form>
  )
}
