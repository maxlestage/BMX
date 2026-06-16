<script setup lang="ts">
import { ref } from 'vue'
import { api, ApiError, type Part, type Effects } from '../../api'
import { useAuth } from '../../auth'
import { useI18n } from '../../i18n'

// Les parts sont bornées à 10 s et 175 Mo (validé avant l'envoi).
const MAX_SECS = 10
const MAX_MB = 175
const MAX_BYTES = MAX_MB * 1024 * 1024

/** Lit la durée réelle d'une vidéo côté client (secondes, métadonnées). */
function readDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const v = document.createElement('video')
    v.preload = 'metadata'
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(v.src)
      resolve(Number.isFinite(v.duration) ? v.duration : 0)
    }
    v.onerror = () => resolve(0)
    v.src = URL.createObjectURL(file)
  })
}

// Le label « Grain » vient du dictionnaire ; les autres sont des termes propres.
const FX: { id: keyof Effects; label: string; premium: boolean }[] = [
  { id: 'grain', label: '', premium: false },
  { id: 'vhs', label: 'VHS', premium: true },
  { id: 'fisheye', label: 'Fisheye', premium: true },
  { id: 'slowmo', label: 'Slow-mo', premium: true },
]

const emit = defineEmits<{ created: [p: Part] }>()

const { user } = useAuth()
const { t } = useI18n()
const premium = !!user.value?.is_premium
const title = ref('')
const file = ref<File | null>(null)
const duration = ref(0)
const fx = ref<Record<string, boolean>>({})
const busy = ref(false)
const error = ref<string | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)

function clearFile() {
  file.value = null
  duration.value = 0
  if (inputRef.value) inputRef.value.value = ''
}

// Validation à la sélection : ≤ 175 Mo et ≤ 10 s.
async function onPick(e: Event) {
  const target = e.target as HTMLInputElement
  const f = target.files?.[0] ?? null
  error.value = null
  if (!f) {
    clearFile()
    return
  }
  if (f.size > MAX_BYTES) {
    error.value = t('parts.upload.tooBig')
    clearFile()
    return
  }
  const secs = await readDuration(f)
  if (secs > MAX_SECS + 0.5) {
    error.value = t('parts.upload.tooLong')
    clearFile()
    return
  }
  file.value = f
  duration.value = secs
}

async function submit(e: Event) {
  e.preventDefault()
  if (!file.value) {
    error.value = t('parts.upload.chooseVideo')
    return
  }
  busy.value = true
  error.value = null
  try {
    const media = await api.uploadMedia(file.value)
    const anyFx = FX.some((f) => fx.value[f.id])
    const effects: Effects | undefined = anyFx
      ? { vhs: !!fx.value.vhs, fisheye: fx.value.fisheye ? 1 : 0, grain: fx.value.grain ? 1 : 0, slowmo: fx.value.slowmo ? 1 : 0 }
      : undefined
    const part = await api.createPart({
      title: title.value.trim() || file.value.name,
      video_media_id: media.id,
      duration_secs: Math.max(1, Math.round(duration.value)),
      effects,
    })
    emit('created', part)
    title.value = ''
    clearFile()
    fx.value = {}
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : t('parts.upload.failed')
  } finally {
    busy.value = false
  }
}

function toggleFx(id: string) {
  fx.value = { ...fx.value, [id]: !fx.value[id] }
}
</script>

<template>
  <form class="upload" @submit="submit">
    <h3 class="upload__title">{{ t('parts.upload.title') }}</h3>
    <input
      class="field"
      :placeholder="t('parts.upload.titlePlaceholder')"
      v-model="title"
      :maxlength="120"
    />
    <input
      ref="inputRef"
      class="field field--file"
      type="file"
      accept="video/*"
      @change="onPick"
    />
    <p class="upload__limit">{{ t('parts.upload.limit') }}</p>

    <div class="fx">
      <span class="fx__label">{{ t('parts.fx.label') }}</span>
      <div class="fx__chips">
        <button
          v-for="f in FX"
          type="button"
          :key="f.id"
          :class="`fx__chip ${fx[f.id] ? 'is-on' : ''} ${f.premium && !premium ? 'is-locked' : ''}`"
          :disabled="f.premium && !premium"
          :title="f.premium && !premium ? t('parts.fx.locked') : ''"
          @click="toggleFx(f.id)"
        >
          {{ f.label || t('parts.fx.grain') }}{{ f.premium ? ' ✦' : '' }}
        </button>
      </div>
      <p v-if="!premium" class="fx__hint">{{ t('parts.fx.hint') }}</p>
    </div>

    <p v-if="file" class="upload__hint">{{ file.name }} · {{ (file.size / 1_048_576).toFixed(1) }} Mo</p>
    <p v-if="error" class="account__error">{{ error }}</p>
    <button class="btn btn--accent" :disabled="busy || !file">
      {{ busy ? t('parts.upload.sending') : t('parts.upload.publish') }}
    </button>
  </form>
</template>
