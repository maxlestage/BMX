<script setup lang="ts">
// Stories rondes en haut du feed : avatars du crew dans des cercles néon
// (style stiz). Alimenté par les riders importés (photo + nom).
// Au clic : visionneuse plein écran IN-APP (les stories n'avaient aucun
// gestionnaire de clic → elles « ne s'ouvraient pas »).
import { computed, onMounted, ref } from 'vue'
import { api, type Rider } from '../api'
import { useI18n } from '../i18n'

const { t } = useI18n()
const riders = ref<Rider[]>([])
const open = ref<Rider | null>(null)

// Avatars en échec de chargement (clé = id du rider).
const failed = ref<Record<number, boolean>>({})

onMounted(() => {
  api
    .riders()
    .then((list) => (riders.value = list.filter((s) => s.photo_url).slice(0, 16)))
    .catch(() => (riders.value = []))
})

function firstName(name: string): string {
  return name.split(' ')[0]
}

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

const instagram = computed(() =>
  open.value?.instagram
    ? `https://instagram.com/${open.value.instagram.replace(/^@/, '')}`
    : null,
)
const rating = computed(() =>
  open.value && Number(open.value.avg_rating) > 0 ? open.value.avg_rating : null,
)
</script>

<template>
  <template v-if="riders.length > 0">
    <div class="stories" aria-label="Crew">
      <button
        v-for="s in riders"
        class="story"
        :key="s.id"
        :title="s.name"
        @click="open = s"
      >
        <span class="story__ring">
          <span v-if="!s.photo_url || failed[s.id]" class="story__ph">{{ initials(s.name) }}</span>
          <img
            v-else
            class="story__img"
            :src="s.photo_url"
            :alt="s.name"
            loading="lazy"
            @error="failed[s.id] = true"
          />
        </span>
        <span class="story__name">{{ firstName(s.name) }}</span>
      </button>
    </div>
    <div
      v-if="open"
      class="story-viewer"
      role="dialog"
      aria-modal="true"
      @click="open = null"
    >
      <div class="story-viewer__card" @click.stop>
        <button class="story-viewer__close" @click="open = null" :aria-label="t('story.close')">
          ×
        </button>
        <img
          v-if="open.photo_url"
          class="story-viewer__img"
          :src="open.photo_url"
          :alt="open.name"
        />
        <div v-else class="story-viewer__img story-viewer__img--ph" aria-hidden="true" />
        <div class="story-viewer__info">
          <strong class="story-viewer__name">{{ open.name }}</strong>
          <span class="story-viewer__sub">
            {{ open.country ? `${open.country}` : '' }}
            {{ open.country && rating ? ' · ' : '' }}
            {{ rating ? `★ ${rating}/10` : '' }}
          </span>
          <a
            v-if="instagram"
            class="btn btn--solid story-viewer__link"
            :href="instagram"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ t('story.instagram') }}
          </a>
        </div>
      </div>
    </div>
  </template>
</template>
