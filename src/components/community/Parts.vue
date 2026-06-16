<script setup lang="ts">
// Feed des parts (vidéos courtes) + upload depuis le navigateur.
import { ref, watch } from 'vue'
import { api, ApiError, mediaUrl, type Part } from '../../api'
import { useAuth } from '../../auth'
import { useI18n } from '../../i18n'
import UploadPart from './UploadPart.vue'

const { user } = useAuth()
const { t } = useI18n()
const parts = ref<Part[] | null>(null)
const sort = ref<'recent' | 'popular'>('recent')
const error = ref<string | null>(null)

watch(
  sort,
  () => {
    parts.value = null
    api
      .parts(sort.value)
      .then((p) => (parts.value = p))
      .catch((e) => (error.value = e instanceof ApiError ? e.message : t('parts.loadError')))
  },
  { immediate: true },
)

async function like(id: number) {
  try {
    const updated = await api.likePart(id)
    parts.value = parts.value?.map((p) => (p.id === id ? updated : p)) ?? null
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : t('parts.actionError')
  }
}

function onCreated(p: Part) {
  parts.value = [p, ...(parts.value ?? [])]
}
</script>

<template>
  <div class="parts">
    <UploadPart v-if="user" @created="onCreated" />

    <div class="parts__sort">
      <button :class="sort === 'recent' ? 'is-active' : ''" @click="sort = 'recent'">
        {{ t('parts.sort.recent') }}
      </button>
      <button
        :class="sort === 'popular' ? 'is-active' : ''"
        @click="sort = 'popular'"
      >
        {{ t('parts.sort.popular') }}
      </button>
    </div>

    <p v-if="error" class="account__error">{{ error }}</p>

    <p v-if="!parts" class="crew__empty">{{ t('parts.loading') }}</p>
    <p v-if="parts && parts.length === 0" class="crew__empty">
      {{ user ? t('parts.emptyUser') : t('parts.emptyGuest') }}
    </p>

    <div class="parts__grid">
      <article v-for="p in parts" class="part" :key="p.id">
        <video
          class="part__video"
          :src="mediaUrl(p.video_url)"
          :poster="p.thumbnail_url ? mediaUrl(p.thumbnail_url) : undefined"
          controls
          playsinline
          preload="metadata"
        />
        <div class="part__meta">
          <h3 class="part__title">{{ p.title }}</h3>
          <div class="part__stats">
            <button
              class="part__like"
              @click="like(p.id)"
              :disabled="!user"
              :title="user ? t('parts.like') : t('parts.likeGuest')"
            >
              ♥ {{ p.likes_count }}
            </button>
            <span class="part__views">
              {{ t('parts.views').replace('{n}', String(p.views_count)) }}
            </span>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>
