<script setup lang="ts">
// Upload d'une photo de profil : sélection → redimensionnement → upload →
// mise à jour du profil. L'avatar se répercute partout (auth.refresh()).
import { ref } from 'vue'
import { api, ApiError, type User } from '../api'
import { useAuth } from '../auth'
import { useI18n } from '../i18n'
import { resizeImage } from '../lib/image'
import Avatar from './Avatar.vue'

defineProps<{ user: User }>()

const { refresh } = useAuth()
const { t } = useI18n()
const inputRef = ref<HTMLInputElement | null>(null)
const busy = ref(false)
const error = ref<string | null>(null)

async function onPick(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  target.value = '' // permet de re-choisir le même fichier
  if (!file) return
  busy.value = true
  error.value = null
  try {
    const resized = await resizeImage(file)
    const media = await api.uploadMedia(resized)
    await api.updateMe({ avatar_url: media.url })
    await refresh() // rafraîchit l'utilisateur courant → avatar à jour partout
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : t('avatar.error')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="avatar-edit">
    <button
      class="avatar-edit__pic"
      @click="inputRef?.click()"
      :disabled="busy"
      :aria-label="t('avatar.change')"
      :style="{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }"
    >
      <Avatar :url="user.avatar_url" :name="user.display_name" :size="72" />
      <span class="avatar-edit__cam" aria-hidden="true">
        📷
      </span>
    </button>
    <div class="avatar-edit__info">
      <button class="avatar-edit__btn" @click="inputRef?.click()" :disabled="busy">
        {{ busy ? t('avatar.uploading') : t('avatar.change') }}
      </button>
      <p v-if="error" class="avatar-edit__err">{{ error }}</p>
    </div>
    <input
      ref="inputRef"
      type="file"
      accept="image/*"
      hidden
      @change="onPick"
    />
  </div>
</template>
