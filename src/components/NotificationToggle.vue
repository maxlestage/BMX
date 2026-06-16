<script setup lang="ts">
// Réglage « Notifications » : opt-in Web Push pour les nouveaux messages.
import { computed, onMounted, ref } from 'vue'
import { useAuth } from '../auth'
import { useI18n } from '../i18n'
import { disablePush, enablePush, getPushState, type PushState } from '../lib/push'

const { user } = useAuth()
const { t } = useI18n()
const state = ref<PushState | null>(null)
const busy = ref(false)
const error = ref<string | null>(null)

onMounted(() => {
  getPushState().then((s) => (state.value = s))
})

async function toggle() {
  busy.value = true
  error.value = null
  try {
    const next = state.value === 'on' ? await disablePush() : await enablePush()
    state.value = next
    if (next === 'denied') error.value = t('push.denied')
  } catch {
    error.value = t('push.error')
  } finally {
    busy.value = false
  }
}

// États non actionnables : on affiche une note informative.
const note = computed(() =>
  state.value === 'unsupported'
    ? t('push.unsupported')
    : state.value === 'ios-install'
      ? t('push.ios')
      : state.value === 'denied'
        ? t('push.denied')
        : state.value === 'unconfigured'
          ? t('push.unsupported')
          : null,
)

const isOn = computed(() => state.value === 'on')
const canToggle = computed(() => state.value === 'on' || state.value === 'off')
</script>

<template>
  <section v-if="user && state !== null" class="notif">
    <div class="notif__head">
      <span class="notif__icon" aria-hidden="true">
        🔔
      </span>
      <div>
        <strong class="notif__title">{{ t('push.title') }}</strong>
        <p class="notif__desc">{{ t('push.desc') }}</p>
      </div>
    </div>

    <button
      v-if="canToggle"
      class="btn notif__btn"
      :class="{ 'btn--accent': !isOn }"
      @click="toggle"
      :disabled="busy"
    >
      {{ busy ? t('push.working') : isOn ? t('push.disable') : t('push.enable') }}
    </button>
    <p v-else class="notif__note">{{ note }}</p>
    <p v-if="error && canToggle" class="notif__note notif__note--err">{{ error }}</p>
  </section>
</template>
