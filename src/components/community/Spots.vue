<script setup lang="ts">
// Carte des spots (Leaflet) + soumission par clic + galerie multi-photos.
// On peut feuilleter les spots (précédent/suivant) et voir leurs photos.

import { onMounted, onUnmounted, ref, watch } from 'vue'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { api, ApiError, mediaUrl, type Spot } from '../../api'
import { useAuth } from '../../auth'
import { useI18n } from '../../i18n'
import { useUI } from '../../ui'
import { resizeImage } from '../../lib/image'

const CREAM = '#5f86a8'
const SPOT_TYPES = ['street', 'park', 'plaza', 'bowl', 'diy']
const FRANCE: L.LatLngTuple = [46.6, 2.4]

function spotPhotos(s: Spot): string[] {
  const list = Array.isArray(s.photos) ? s.photos : []
  const all = s.photo_url ? [s.photo_url, ...list] : list
  return [...new Set(all)].map(mediaUrl)
}

const { user } = useAuth()
const { t } = useI18n()
const { shareToMessages } = useUI()

const mapEl = ref<HTMLDivElement | null>(null)
let map: L.Map | null = null
let markers: L.LayerGroup | null = null
let draftMarker: L.CircleMarker | null = null

const spots = ref<Spot[]>([])
const error = ref<string | null>(null)
const notice = ref<string | null>(null)
const adding = ref(false)
const draft = ref<{ lat: number; lng: number } | null>(null)
const selected = ref<number>(-1) // index du spot affiché

// Init carte (une fois).
onMounted(() => {
  if (!mapEl.value || map) return
  map = L.map(mapEl.value, { scrollWheelZoom: false }).setView(FRANCE, 5)
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap, © CARTO',
    maxZoom: 19,
  }).addTo(map)
  markers = L.layerGroup().addTo(map)
  // Charge les spots.
  api
    .spots()
    .then((s) => (spots.value = s))
    .catch((e) => (error.value = e instanceof ApiError ? e.message : t('spots.loadError')))
})

onUnmounted(() => {
  map?.remove()
  map = null
})

// Dessine les marqueurs ; cliquer un marqueur sélectionne le spot.
watch([spots, selected], () => {
  const group = markers
  if (!group || !map) return
  group.clearLayers()
  spots.value.forEach((s, i) => {
    L.circleMarker([s.latitude, s.longitude], {
      radius: 8,
      color: CREAM,
      weight: 2,
      fillColor: CREAM,
      fillOpacity: i === selected.value ? 1 : 0.6,
    })
      .on('click', () => (selected.value = i))
      .addTo(group)
  })
  if (spots.value.length > 0 && selected.value < 0) {
    map.fitBounds(L.latLngBounds(spots.value.map((s) => [s.latitude, s.longitude])).pad(0.2))
  }
})

// Quand on sélectionne un spot : recentrer la carte dessus.
watch([selected, spots], () => {
  if (!map || selected.value < 0 || !spots.value[selected.value]) return
  const s = spots.value[selected.value]
  map.flyTo([s.latitude, s.longitude], Math.max(map.getZoom(), 11), { duration: 0.6 })
})

// Mode ajout : capter le prochain clic sur la carte.
let detachAddClick: (() => void) | null = null
watch(adding, () => {
  if (!map) return
  detachAddClick?.()
  detachAddClick = null
  if (!adding.value) {
    map.getContainer().style.cursor = ''
    return
  }
  map.getContainer().style.cursor = 'crosshair'
  const onClick = (e: L.LeafletMouseEvent) => {
    draft.value = { lat: e.latlng.lat, lng: e.latlng.lng }
    draftMarker?.remove()
    draftMarker = L.circleMarker(e.latlng, {
      radius: 9,
      color: '#fff',
      weight: 2,
      fillColor: CREAM,
      fillOpacity: 0.9,
    }).addTo(map!)
  }
  map.on('click', onClick)
  detachAddClick = () => map?.off('click', onClick)
})

onUnmounted(() => detachAddClick?.())

function resetDraft() {
  draft.value = null
  adding.value = false
  draftMarker?.remove()
  draftMarker = null
  if (map) map.getContainer().style.cursor = ''
}

async function submitSpot(payload: {
  name: string
  city?: string
  spot_type: string
  description?: string
  photos: string[]
}) {
  if (!draft.value) return
  error.value = null
  try {
    const created = await api.createSpot({
      ...payload,
      latitude: draft.value.lat,
      longitude: draft.value.lng,
    })
    if (created.approved) {
      spots.value = [created, ...spots.value]
      notice.value = t('spots.added')
    } else {
      notice.value = t('spots.pending')
    }
    resetDraft()
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : t('spots.error')
  }
}

// --- SpotCard (fiche) ---
function spotShare(spot: Spot) {
  shareToMessages(
    `📍 ${spot.name}${spot.city ? ` (${spot.city})` : ''} — ${spot.spot_type}\nhttps://www.openstreetmap.org/?mlat=${spot.latitude}&mlon=${spot.longitude}#map=17/${spot.latitude}/${spot.longitude}`,
  )
}

const cardPhoto = ref(0)
// Réinitialise la photo affichée quand on change de spot.
watch(selected, () => (cardPhoto.value = 0))

function prevSpot() {
  selected.value = (selected.value - 1 + spots.value.length) % spots.value.length
}
function nextSpot() {
  selected.value = (selected.value + 1) % spots.value.length
}

// --- SpotForm (formulaire) ---
const fName = ref('')
const fCity = ref('')
const fSpotType = ref('street')
const fDescription = ref('')
const fPhotos = ref<string[]>([])
const fBusy = ref(false)

watch(draft, (d) => {
  if (d) {
    fName.value = ''
    fCity.value = ''
    fSpotType.value = 'street'
    fDescription.value = ''
    fPhotos.value = []
    fBusy.value = false
  }
})

async function addFiles(files: FileList | null) {
  if (!files || files.length === 0) return
  fBusy.value = true
  try {
    for (const file of Array.from(files).slice(0, 12 - fPhotos.value.length)) {
      const resized = await resizeImage(file)
      const media = await api.uploadMedia(resized)
      fPhotos.value = fPhotos.value.length < 12 ? [...fPhotos.value, media.url] : fPhotos.value
    }
  } catch {
    /* upload échoué — on ignore silencieusement cette photo */
  } finally {
    fBusy.value = false
  }
}

function onFormSubmit() {
  submitSpot({
    name: fName.value.trim(),
    city: fCity.value.trim() || undefined,
    spot_type: fSpotType.value,
    description: fDescription.value.trim() || undefined,
    photos: fPhotos.value,
  })
}

function removeFormPhoto(i: number) {
  fPhotos.value = fPhotos.value.filter((_, j) => j !== i)
}
</script>

<template>
  <div class="spots">
    <div class="spots__bar">
      <span class="spots__count">{{ t('spots.count').replace('{n}', String(spots.length)) }}</span>
      <template v-if="user">
        <button v-if="adding" class="btn btn--ghost" @click="resetDraft">
          {{ t('spots.cancel') }}
        </button>
        <button v-else class="btn btn--accent" @click="adding = true">
          {{ t('spots.add') }}
        </button>
      </template>
      <span v-else class="spots__hint">{{ t('spots.guest') }}</span>
    </div>

    <p v-if="adding && !draft" class="spots__hint spots__hint--pulse">{{ t('spots.clickMap') }}</p>
    <p v-if="notice" class="spots__notice">{{ notice }}</p>
    <p v-if="error" class="account__error">{{ error }}</p>

    <div class="spots__map" ref="mapEl" />

    <div v-if="selected >= 0 && spots[selected]" class="spotcard">
      <button class="spotcard__close" aria-label="×" @click="selected = -1">×</button>

      <div v-if="spotPhotos(spots[selected]).length > 0" class="spotcard__gallery">
        <img
          class="spotcard__photo"
          :src="spotPhotos(spots[selected])[cardPhoto]"
          :alt="spots[selected].name"
        />
        <div v-if="spotPhotos(spots[selected]).length > 1" class="spotcard__dots">
          <button
            v-for="(_, i) in spotPhotos(spots[selected])"
            :key="i"
            :class="`spotcard__dot ${i === cardPhoto ? 'is-on' : ''}`"
            :aria-label="`Photo ${i + 1}`"
            @click="cardPhoto = i"
          />
        </div>
      </div>

      <div class="spotcard__body">
        <h3 class="spotcard__name">{{ spots[selected].name }}</h3>
        <p class="spotcard__meta">
          {{ spots[selected].city ? `${spots[selected].city} · ` : '' }}
          <em>{{ spots[selected].spot_type }}</em>
        </p>
        <p v-if="spots[selected].description" class="spotcard__desc">
          {{ spots[selected].description }}
        </p>
        <button
          v-if="user"
          class="btn btn--ghost spotcard__share"
          @click="spotShare(spots[selected])"
        >
          🔗 {{ t('spots.share') }}
        </button>
      </div>

      <div class="spotcard__nav">
        <button class="btn btn--ghost" @click="prevSpot">‹</button>
        <span class="spotcard__pos">{{ selected + 1 }} / {{ spots.length }}</span>
        <button class="btn btn--ghost" @click="nextSpot">›</button>
      </div>
    </div>

    <form v-if="draft" class="spots__form" @submit.prevent="onFormSubmit">
      <input class="field" :placeholder="t('spots.form.name')" v-model="fName" required />
      <input class="field" :placeholder="t('spots.form.city')" v-model="fCity" />
      <select class="field" v-model="fSpotType">
        <option v-for="st in SPOT_TYPES" :key="st" :value="st">{{ st }}</option>
      </select>
      <textarea
        class="field"
        :placeholder="t('spots.form.description')"
        v-model="fDescription"
        :rows="2"
      />

      <label class="spots__photos-btn">
        {{ fBusy ? t('spots.photos.adding') : t('spots.photos.add') }}
        <input
          type="file"
          accept="image/*"
          multiple
          hidden
          :disabled="fBusy || fPhotos.length >= 12"
          @change="addFiles(($event.target as HTMLInputElement).files)"
        />
      </label>
      <div v-if="fPhotos.length > 0" class="spots__thumbs">
        <div class="spots__thumb" v-for="(p, i) in fPhotos" :key="p">
          <img :src="mediaUrl(p)" alt="" />
          <button
            type="button"
            class="spots__thumb-x"
            aria-label="×"
            @click="removeFormPhoto(i)"
          >
            ×
          </button>
        </div>
      </div>

      <div class="spots__form-actions">
        <button type="button" class="btn btn--ghost" @click="resetDraft">
          {{ t('spots.cancel') }}
        </button>
        <button class="btn btn--accent" :disabled="!fName.trim() || fBusy">
          {{ t('spots.form.send') }}
        </button>
      </div>
    </form>
  </div>
</template>
