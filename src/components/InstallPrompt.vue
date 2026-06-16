<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { usePwaInstall } from '../composables/pwa'
import { useI18n } from '../i18n'

const DISMISS_KEY = 'bmx:install-dismissed'

const { t } = useI18n()
const { canInstall, isIos, isStandalone, promptInstall } = usePwaInstall()
const dismissed = ref(
  typeof localStorage !== 'undefined' && localStorage.getItem(DISMISS_KEY) === '1',
)

function close() {
  dismissed.value = true
  try {
    localStorage.setItem(DISMISS_KEY, '1')
  } catch {
    // localStorage indisponible (mode privé) — on ignore.
  }
}

// Disparaît tout seul après 12 s pour ne pas gêner la lecture.
let timer: ReturnType<typeof setTimeout> | null = null
function arm() {
  if (timer) clearTimeout(timer)
  timer = null
  if (dismissed.value) return
  timer = setTimeout(() => (dismissed.value = true), 12000)
}
onMounted(arm)
watch(dismissed, arm)
onUnmounted(() => {
  if (timer) clearTimeout(timer)
})
</script>

<template>
  <div
    v-if="!isStandalone && !dismissed && (canInstall || isIos)"
    class="install"
    role="dialog"
    :aria-label="t('install.dialog')"
  >
    <span class="install__icon" aria-hidden="true">
      🚲
    </span>
    <div class="install__copy">
      <strong>{{ t('install.title') }}</strong>
      <span>{{ isIos ? t('install.ios') : t('install.generic') }}</span>
    </div>
    <button v-if="canInstall" class="install__cta" @click="promptInstall">
      {{ t('install.cta') }}
    </button>
    <button class="install__close" :aria-label="t('install.close')" @click="close">
      ×
    </button>
  </div>
</template>
