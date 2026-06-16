<script setup lang="ts">
// Résultats de la recherche intelligente : charge spots/riders/vidéos et
// affiche les correspondances (parsing local de la phrase). Vide tant qu'aucune
// requête n'est saisie.
import { computed, ref, watch } from 'vue'
import { api, mediaUrl, type Spot, type Rider, type Video } from '../api'
import { useI18n } from '../i18n'
import { parseQuery, filterSpots, filterRiders, filterVideos } from '../lib/search'

const props = defineProps<{ query: string }>()

const { t } = useI18n()
const spots = ref<Spot[]>([])
const riders = ref<Rider[]>([])
const videos = ref<Video[]>([])

// Charge les jeux de données une fois qu'une recherche commence.
watch(
  () => props.query,
  () => {
    if (!props.query.trim()) return
    if (spots.value.length || riders.value.length || videos.value.length) return
    api.spots().then((v) => (spots.value = v)).catch(() => {})
    api.riders().then((v) => (riders.value = v)).catch(() => {})
    api.videos().then((v) => (videos.value = v)).catch(() => {})
  },
)

const parsed = computed(() => {
  const cities = [...new Set(spots.value.map((s) => s.city ?? '').filter(Boolean))]
  return parseQuery(props.query, cities)
})

const mSpots = computed(() => filterSpots(spots.value, parsed.value).slice(0, 8))
const mRiders = computed(() => filterRiders(riders.value, parsed.value).slice(0, 8))
const mVideos = computed(() => filterVideos(videos.value, parsed.value).slice(0, 6))
const total = computed(() => mSpots.value.length + mRiders.value.length + mVideos.value.length)
</script>

<template>
  <div v-if="query.trim()" class="results">
    <p class="results__count">
      {{ total }} {{ t('search.results') }}
      <template v-if="parsed.city">{{ ` · ${parsed.city}` }}</template>
      <template v-if="parsed.types.length > 0">{{ ` · ${parsed.types.join(', ')}` }}</template>
    </p>

    <section v-if="mSpots.length > 0" class="results__group">
      <h3 class="results__label">{{ t('crew.tab.spots') }}</h3>
      <div v-for="s in mSpots" class="results__row" :key="`sp${s.id}`">
        <span class="results__dot">📍</span>
        <div>
          <strong>{{ s.name }}</strong>
          <span class="results__meta">
            {{ s.city ? `${s.city} · ` : '' }}
            {{ s.spot_type }}
          </span>
        </div>
      </div>
    </section>

    <section v-if="mRiders.length > 0" class="results__group">
      <h3 class="results__label">{{ t('crew.tab.riders') }}</h3>
      <div v-for="s in mRiders" class="results__row" :key="`sk${s.id}`">
        <img v-if="s.photo_url" class="results__av" :src="s.photo_url" alt="" loading="lazy" />
        <span v-else class="results__dot">🏆</span>
        <div>
          <strong>{{ s.name }}</strong>
          <span v-if="s.country" class="results__meta">{{ s.country }}</span>
        </div>
      </div>
    </section>

    <section v-if="mVideos.length > 0" class="results__group">
      <h3 class="results__label">{{ t('crew.tab.videos') }}</h3>
      <a
        v-for="v in mVideos"
        class="results__row"
        :key="`vi${v.id}`"
        :href="v.url"
        target="_blank"
        rel="noopener noreferrer"
      >
        <img
          v-if="v.thumbnail_url"
          class="results__av results__av--sq"
          :src="mediaUrl(v.thumbnail_url)"
          alt=""
          loading="lazy"
        />
        <span v-else class="results__dot">🎬</span>
        <div>
          <strong>{{ v.title }}</strong>
        </div>
      </a>
    </section>

    <p v-if="total === 0" class="crew__empty">{{ t('search.none') }}</p>
  </div>
</template>
