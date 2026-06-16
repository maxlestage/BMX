<script setup lang="ts">
// Fiche profil d'un membre (modale) : photo, nom, stats, bouton « message ».
import { computed, ref, watch } from 'vue'
import { api, type User } from '../api'
import { useAuth } from '../auth'
import { useUI } from '../ui'
import { useI18n } from '../i18n'
import Avatar from './Avatar.vue'

interface Profile {
  user: User
  parts_count: number
  total_likes: number
  total_views: number
}

const { profileId, closeProfile, shareToMessages } = useUI()
const { user } = useAuth()
const { t } = useI18n()
const data = ref<Profile | null>(null)
const error = ref(false)

watch(
  profileId,
  () => {
    if (profileId.value == null) return
    data.value = null
    error.value = false
    api
      .profile(profileId.value)
      .then((d) => (data.value = d))
      .catch(() => (error.value = true))
  },
  { immediate: true },
)

const isMe = computed(() => user.value?.id === profileId.value)
</script>

<template>
  <div
    v-if="profileId != null"
    class="modal"
    role="dialog"
    aria-modal="true"
    @click="closeProfile"
  >
    <div class="modal__card" @click.stop>
      <button class="modal__close" :aria-label="t('msg.back')" @click="closeProfile">
        ×
      </button>

      <p v-if="error" class="crew__empty">{{ t('profile.error') }}</p>
      <p v-if="!data && !error" class="crew__empty">{{ t('msg.loading') }}</p>

      <template v-if="data">
        <div class="profile-card">
          <Avatar
            :url="data.user.avatar_url"
            :name="data.user.display_name"
            :size="88"
            class-name="profile-card__av"
          />
          <h2 class="profile-card__name">
            {{ data.user.display_name }}
            <span v-if="data.user.is_premium" class="badge-premium">✦</span>
          </h2>
          <p class="profile-card__handle">@{{ data.user.username }}</p>
          <p v-if="data.user.city" class="profile-card__city">📍 {{ data.user.city }}</p>
        </div>

        <div class="stats">
          <div class="stats__item">
            <strong>{{ data.parts_count }}</strong>
            <span>{{ t('premium.stats.parts') }}</span>
          </div>
          <div class="stats__item">
            <strong>{{ data.total_likes }}</strong>
            <span>{{ t('premium.stats.likes') }}</span>
          </div>
          <div class="stats__item">
            <strong>{{ data.total_views }}</strong>
            <span>{{ t('premium.stats.views') }}</span>
          </div>
        </div>

        <button
          v-if="!isMe && user"
          class="btn btn--accent profile-card__msg"
          @click="closeProfile(); shareToMessages('', profileId!)"
        >
          💬 {{ t('profile.message') }}
        </button>
      </template>
    </div>
  </div>
</template>
