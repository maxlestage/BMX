<script setup lang="ts">
// Carte mondiale des BMX shops — annuaire pur (on n'y vend rien, la vente
// entre membres se passe dans l'onglet Market). Deuxième carte Leaflet,
// indépendante de celle des spots. Pré-remplie par le seed OpenStreetMap
// (732 shops dans le monde), enrichie par la communauté (soumission par clic,
// modération comme les spots).

import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { api, ApiError, mediaUrl, type Shop } from '../../api'
import { useAuth } from '../../auth'
import { useI18n } from '../../i18n'

const SHOP_COLOR = '#c4d8ee'
const WORLD: L.LatLngTuple = [25, 5]
const LIST_MAX = 80

const { user } = useAuth()
const { t } = useI18n()

const mapEl = ref<HTMLDivElement | null>(null)
let map: L.Map | null = null
let markers: L.LayerGroup | null = null
let draftMarker: L.CircleMarker | null = null

const shops = ref<Shop[]>([])
const error = ref<string | null>(null)
const notice = ref<string | null>(null)
const adding = ref(false)
const draft = ref<{ lat: number; lng: number } | null>(null)
const selected = ref<number>(-1) // index du shop affiché
const query = ref('')

// Init carte (une fois).
onMounted(() => {
  if (!mapEl.value || map) return
  map = L.map(mapEl.value, { scrollWheelZoom: false }).setView(WORLD, 2)
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap, © CARTO',
    maxZoom: 19,
  }).addTo(map)
  markers = L.layerGroup().addTo(map)
  // Charge les shops.
  api
    .shops()
    .then((s) => (shops.value = s))
    .catch((e) => (error.value = e instanceof ApiError ? e.message : t('shops.loadError')))
})

onUnmounted(() => {
  map?.remove()
  map = null
})

// Dessine les marqueurs ; cliquer un marqueur sélectionne le shop.
watch([shops, selected], () => {
  const group = markers
  if (!group || !map) return
  group.clearLayers()
  const located = shops.value.filter((s) => s.latitude != null && s.longitude != null)
  located.forEach((s) => {
    const i = shops.value.indexOf(s)
    L.circleMarker([s.latitude!, s.longitude!], {
      radius: 7,
      color: SHOP_COLOR,
      weight: 2,
      fillColor: SHOP_COLOR,
      fillOpacity: i === selected.value ? 1 : 0.55,
    })
      .on('click', () => (selected.value = i))
      .addTo(group)
  })
  if (located.length > 0 && selected.value < 0) {
    map.fitBounds(L.latLngBounds(located.map((s) => [s.latitude!, s.longitude!])).pad(0.1), {
      maxZoom: 6,
    })
  }
})

// Quand on sélectionne un shop : recentrer la carte dessus.
watch([selected, shops], () => {
  const s = selected.value >= 0 ? shops.value[selected.value] : null
  if (!map || !s || s.latitude == null || s.longitude == null) return
  map.flyTo([s.latitude, s.longitude], Math.max(map.getZoom(), 12), { duration: 0.6 })
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
      fillColor: SHOP_COLOR,
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

async function submitShop(payload: {
  name: string
  city?: string
  address?: string
  url?: string
  description?: string
}) {
  if (!draft.value) return
  error.value = null
  try {
    const created = await api.createShop({
      ...payload,
      latitude: draft.value.lat,
      longitude: draft.value.lng,
    })
    if (created.approved) {
      shops.value = [...shops.value, created]
      notice.value = t('shops.added')
    } else {
      notice.value = t('shops.pending')
    }
    resetDraft()
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : t('shops.error')
  }
}

const current = computed(() => (selected.value >= 0 ? shops.value[selected.value] : null))

// Recherche (nom / ville / adresse), liste plafonnée pour rester fluide.
const matches = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return shops.value
  return shops.value.filter((s) =>
    [s.name, s.city, s.address].some((v) => v && v.toLowerCase().includes(q)),
  )
})

function prevShop() {
  selected.value = (selected.value - 1 + shops.value.length) % shops.value.length
}
function nextShop() {
  selected.value = (selected.value + 1) % shops.value.length
}
function indexOf(s: Shop) {
  return shops.value.indexOf(s)
}

// --- ShopForm (formulaire) ---
const fName = ref('')
const fCity = ref('')
const fAddress = ref('')
const fUrl = ref('')
const fDescription = ref('')

watch(draft, (d) => {
  if (d) {
    fName.value = ''
    fCity.value = ''
    fAddress.value = ''
    fUrl.value = ''
    fDescription.value = ''
  }
})

function onFormSubmit() {
  submitShop({
    name: fName.value.trim(),
    city: fCity.value.trim() || undefined,
    address: fAddress.value.trim() || undefined,
    url: fUrl.value.trim() || undefined,
    description: fDescription.value.trim() || undefined,
  })
}
</script>

<template>
  <div class="shops">
    <div class="spots__bar">
      <span class="spots__count">{{ t('shops.count').replace('{n}', String(shops.length)) }}</span>
      <template v-if="user">
        <button v-if="adding" class="btn btn--ghost" @click="resetDraft">
          {{ t('shops.cancel') }}
        </button>
        <button v-else class="btn btn--accent" @click="adding = true">
          {{ t('shops.add') }}
        </button>
      </template>
      <span v-else class="spots__hint">{{ t('shops.guest') }}</span>
    </div>
    <p class="shops__tagline">{{ t('shops.tagline') }}</p>

    <p v-if="adding && !draft" class="spots__hint spots__hint--pulse">{{ t('shops.clickMap') }}</p>
    <p v-if="notice" class="spots__notice">{{ notice }}</p>
    <p v-if="error" class="account__error">{{ error }}</p>

    <div class="spots__map" ref="mapEl" />

    <div v-if="current" class="spotcard">
      <button class="spotcard__close" aria-label="×" @click="selected = -1">×</button>

      <div v-if="current.photo_url" class="spotcard__gallery">
        <img class="spotcard__photo" :src="mediaUrl(current.photo_url)" :alt="current.name" />
      </div>

      <div class="spotcard__body">
        <h3 class="spotcard__name">🏪 {{ current.name }}</h3>
        <p class="spotcard__meta">{{ [current.city, current.address].filter(Boolean).join(' · ') }}</p>
        <p v-if="current.description" class="spotcard__desc">{{ current.description }}</p>
        <a
          v-if="current.url"
          class="shops__link"
          :href="current.url"
          target="_blank"
          rel="noreferrer"
        >
          🔗 {{ t('shops.visit') }}
        </a>
      </div>

      <div class="spotcard__nav">
        <button class="btn btn--ghost" @click="prevShop">‹</button>
        <span class="spotcard__pos">{{ selected + 1 }} / {{ shops.length }}</span>
        <button class="btn btn--ghost" @click="nextShop">›</button>
      </div>
    </div>

    <form v-if="draft" class="spots__form" @submit.prevent="onFormSubmit">
      <input class="field" :placeholder="t('shops.form.name')" v-model="fName" required />
      <div class="market__offer-row">
        <input class="field" :placeholder="t('shops.form.city')" v-model="fCity" />
        <input class="field" :placeholder="t('shops.form.address')" v-model="fAddress" />
      </div>
      <input class="field" type="url" :placeholder="t('shops.form.url')" v-model="fUrl" />
      <textarea
        class="field"
        :placeholder="t('shops.form.description')"
        v-model="fDescription"
        :rows="2"
      />
      <div class="spots__form-actions">
        <button type="button" class="btn btn--ghost" @click="resetDraft">
          {{ t('shops.cancel') }}
        </button>
        <button class="btn btn--accent" :disabled="!fName.trim()">
          {{ t('shops.form.send') }}
        </button>
      </div>
    </form>

    <input
      class="field shops__search"
      type="search"
      :placeholder="t('shops.search')"
      v-model="query"
    />
    <ul class="shops__list">
      <li v-for="s in matches.slice(0, LIST_MAX)" :key="s.id">
        <button
          :class="`shops__row ${indexOf(s) === selected ? 'is-active' : ''}`"
          @click="selected = indexOf(s)"
        >
          <strong class="shops__name">{{ s.name }}</strong>
          <span class="shops__meta">{{ s.city ?? '' }}</span>
        </button>
      </li>
    </ul>
    <p v-if="matches.length > LIST_MAX" class="shops__more">
      {{ t('shops.more').replace('{n}', String(matches.length - LIST_MAX)) }}
    </p>
  </div>
</template>
