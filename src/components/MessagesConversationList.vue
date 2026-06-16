<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api, ApiError, type Conversation } from '../api'
import { useI18n } from '../i18n'
import { useUI } from '../ui'
import Avatar from './Avatar.vue'

const emit = defineEmits<{ (e: 'open', c: Conversation): void }>()

const { t } = useI18n()
const { openProfile } = useUI()
const convos = ref<Conversation[] | null>(null)
const error = ref<string | null>(null)

onMounted(() => {
  api
    .conversations()
    .then((c) => (convos.value = c))
    .catch((e) => (error.value = e instanceof ApiError ? e.message : t('msg.loadError')))
})
</script>

<template>
  <p v-if="error" class="crew__empty">{{ error }}</p>
  <p v-else-if="!convos" class="crew__empty">{{ t('msg.loading') }}</p>
  <p v-else-if="convos.length === 0" class="crew__empty">{{ t('msg.empty') }}</p>

  <div v-else class="convos">
    <div v-for="c in convos" class="convo" :key="c.user_id">
      <button
        class="convo__av"
        @click="openProfile(c.user_id)"
        :aria-label="c.display_name ?? `#${c.user_id}`"
      >
        <Avatar :url="c.avatar_url" :name="c.display_name" :size="44" />
      </button>
      <button class="convo__body" @click="emit('open', c)">
        <span class="convo__name">{{ c.display_name ?? `#${c.user_id}` }}</span>
        <span class="convo__last">{{ c.last_body }}</span>
      </button>
      <span v-if="c.unread" class="convo__dot" :aria-label="t('msg.unread')" />
    </div>
  </div>
</template>
