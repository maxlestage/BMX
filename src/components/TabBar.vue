<script setup lang="ts">
// Barre d'onglets fixe en bas — donne l'allure d'une app native.
import { useAuth } from '../auth'
import { useI18n } from '../i18n'
import { useUI } from '../ui'
import Avatar from './Avatar.vue'

export type Tab = 'home' | 'crew' | 'videos' | 'spots' | 'market' | 'messages' | 'profile'

defineProps<{ active: Tab }>()
const emit = defineEmits<{ (e: 'change', tab: Tab): void }>()

const { t } = useI18n()
const { unread } = useUI()
const { user } = useAuth()

const TABS: { id: Tab; key: string; icon: string }[] = [
  { id: 'home', key: 'tab.home', icon: '🏠' },
  { id: 'crew', key: 'tab.crew', icon: '🚲' },
  { id: 'videos', key: 'tab.videos', icon: '🎬' },
  { id: 'spots', key: 'crew.tab.spots', icon: '📍' },
  { id: 'market', key: 'tab.market', icon: '🛒' },
  { id: 'messages', key: 'tab.messages', icon: '💬' },
  { id: 'profile', key: 'tab.profile', icon: '👤' },
]
</script>

<template>
  <nav class="tabbar" :aria-label="t('tab.bar')">
    <button
      v-for="tab in TABS"
      :key="tab.id"
      class="tabbar__item"
      :class="{ 'is-active': active === tab.id }"
      :aria-current="active === tab.id ? 'page' : undefined"
      @click="emit('change', tab.id)"
    >
      <span class="tabbar__icon" aria-hidden="true">
        <Avatar
          v-if="tab.id === 'profile' && user"
          :url="user.avatar_url"
          :name="user.display_name"
          :size="24"
          bare
        />
        <template v-else>{{ tab.icon }}</template>
        <span v-if="tab.id === 'messages' && unread > 0" class="tabbar__badge">
          {{ unread > 9 ? '9+' : unread }}
        </span>
      </span>
      <span class="tabbar__label">{{ t(tab.key) }}</span>
    </button>
  </nav>
</template>
