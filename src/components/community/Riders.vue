<script setup lang="ts">
// Classement des riders (importés de theboardr) + vote communautaire (1–10).
import { computed, onMounted, ref } from 'vue'
import { api, ApiError, type Rider } from '../../api'
import { useAuth } from '../../auth'
import { useI18n } from '../../i18n'
import RiderPhoto from './RiderPhoto.vue'

const PAGE = 7

const { user } = useAuth()
const { t } = useI18n()
const riders = ref<Rider[] | null>(null)
const error = ref<string | null>(null)
const query = ref('')
const limit = ref(PAGE)
const voted = ref<Record<number, number>>({})

onMounted(() => {
  api
    .riders()
    .then((r) => (riders.value = r))
    .catch((e) => (error.value = e instanceof ApiError ? e.message : t('riders.loadError')))
})

// Rang basé sur l'ordre renvoyé par l'API (meilleure moyenne d'abord).
const ranked = computed(() => (riders.value ?? []).map((s, i) => ({ ...s, rank: i + 1 })))
const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return q ? ranked.value.filter((s) => s.name.toLowerCase().includes(q)) : ranked.value
})

const shown = computed(() => filtered.value.slice(0, limit.value))

async function rate(id: number, score: number) {
  error.value = null
  try {
    const updated = await api.rateRider(id, score)
    riders.value = riders.value?.map((s) => (s.id === id ? updated : s)) ?? null
    voted.value = { ...voted.value, [id]: score }
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : t('riders.voteError')
  }
}

function onQuery(e: Event) {
  query.value = (e.target as HTMLInputElement).value
  limit.value = PAGE
}

function onRate(e: Event, id: number) {
  const value = (e.target as HTMLSelectElement).value
  if (value) rate(id, Number(value))
}

const tens = Array.from({ length: 10 }, (_, i) => 10 - i)
</script>

<template>
  <p v-if="error && !riders" class="crew__empty">{{ error }}</p>
  <p v-else-if="!riders" class="crew__empty">{{ t('riders.loading') }}</p>
  <div v-else class="riders">
    <input
      class="field riders__search"
      :placeholder="t('riders.search')"
      :value="query"
      @input="onQuery"
    />
    <p v-if="error" class="account__error">{{ error }}</p>
    <p v-if="!user" class="riders__hint">{{ t('riders.guest') }}</p>

    <div class="riders__grid">
      <article v-for="s in shown" class="rider" :key="s.id">
        <span class="rider__rank">#{{ s.rank }}</span>
        <RiderPhoto :name="s.name" :url="s.photo_url" />
        <h3 class="rider__name">{{ s.name }}</h3>
        <div class="rider__score">
          <template v-if="s.ratings_count > 0">
            <strong>{{ Number(s.avg_rating).toFixed(1) }}</strong>
            <span class="rider__count">
              {{ t('riders.votes').replace('{n}', String(s.ratings_count)) }}
            </span>
          </template>
          <span v-else class="rider__count">{{ t('riders.notRated') }}</span>
        </div>
        <label v-if="user" class="rider__rate">
          {{ voted[s.id]
            ? t('riders.yourRating').replace('{n}', String(voted[s.id]))
            : t('riders.rate') }}
          <select
            :value="voted[s.id] ?? ''"
            @change="onRate($event, s.id)"
            :aria-label="`${t('riders.rate')} ${s.name}`"
          >
            <option value="">1–10</option>
            <option v-for="n in tens" :key="n" :value="n">
              {{ n }}
            </option>
          </select>
        </label>
      </article>
    </div>

    <button
      v-if="filtered.length > limit"
      class="btn btn--ghost riders__more"
      @click="limit += PAGE"
    >
      {{ t('riders.more').replace('{n}', String(filtered.length - limit)) }}
    </button>
    <p v-if="filtered.length === 0" class="crew__empty">{{ t('riders.none') }}</p>
  </div>
</template>
