<script setup lang="ts">
// Dernières vidéos Thrasher (flux YouTube). Miniature → lecture en embed au clic.
import { onMounted, ref } from 'vue'
import { api, ApiError, type Video } from '../../api'
import { useI18n } from '../../i18n'

const PAGE = 7

const { t } = useI18n()
const videos = ref<Video[] | null>(null)
const error = ref<string | null>(null)
const playing = ref<string | null>(null)
const limit = ref(PAGE)

function timeAgo(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso).getTime()
  if (Number.isNaN(d)) return ''
  const days = Math.floor((Date.now() - d) / 86_400_000)
  if (days <= 0) return t('time.today')
  if (days === 1) return t('time.yesterday')
  if (days < 30) return t('time.days').replace('{n}', String(days))
  if (days < 365) return t('time.months').replace('{n}', String(Math.floor(days / 30)))
  return t('time.years').replace('{n}', String(Math.floor(days / 365)))
}

onMounted(() => {
  api
    .videos()
    .then((v) => (videos.value = v))
    .catch((e) => (error.value = e instanceof ApiError ? e.message : t('videos.loadError')))
})
</script>

<template>
  <p v-if="error" class="crew__empty">{{ error }}</p>
  <p v-else-if="!videos" class="crew__empty">{{ t('videos.loading') }}</p>
  <p v-else-if="videos.length === 0" class="crew__empty">{{ t('videos.empty') }}</p>
  <div v-else class="videos">
    <p class="videos__src">{{ t('videos.source') }}</p>
    <div class="videos__grid">
      <article v-for="v in videos.slice(0, limit)" class="video" :key="v.id">
        <div class="video__frame">
          <iframe
            v-if="playing === v.external_id"
            :src="`https://www.youtube-nocookie.com/embed/${v.external_id}?autoplay=1`"
            :title="v.title"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
          />
          <button
            v-else
            class="video__thumb"
            @click="playing = v.external_id"
            :aria-label="t('videos.play').replace('{title}', v.title)"
          >
            <img v-if="v.thumbnail_url" :src="v.thumbnail_url" alt="" loading="lazy" />
            <span class="video__play">▶</span>
          </button>
        </div>
        <div class="video__meta">
          <h3 class="video__title">
            <a :href="v.url" target="_blank" rel="noopener noreferrer">
              {{ v.title }}
            </a>
          </h3>
          <span class="video__date">{{ timeAgo(v.published_at) }}</span>
        </div>
      </article>
    </div>
    <button
      v-if="videos.length > limit"
      class="btn btn--ghost riders__more"
      @click="limit += PAGE"
    >
      {{ t('riders.more').replace('{n}', String(videos.length - limit)) }}
    </button>
  </div>
</template>
