<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api, ApiError, type Stats } from '../../api'
import { useI18n } from '../../i18n'

const props = defineProps<{ isPremium: boolean }>()

const { t } = useI18n()
const busy = ref(false)
const error = ref<string | null>(null)
const stats = ref<Stats | null>(null)

const perks = [
  t('premium.perk.hd'),
  t('premium.perk.fx'),
  t('premium.perk.badge'),
  t('premium.perk.noads'),
]

onMounted(() => {
  if (props.isPremium) api.myStats().then((s) => (stats.value = s)).catch(() => (stats.value = null))
})

async function go(kind: 'checkout' | 'portal') {
  busy.value = true
  error.value = null
  try {
    const { url } = kind === 'checkout' ? await api.checkout() : await api.portal()
    window.location.href = url
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : t('premium.error')
    busy.value = false
  }
}
</script>

<template>
  <div v-if="isPremium" class="premium premium--active">
    <div class="premium__row">
      <span>{{ t('premium.active') }}</span>
      <button class="btn btn--ghost" :disabled="busy" @click="go('portal')">
        {{ busy ? '…' : t('premium.manage') }}
      </button>
    </div>
    <div v-if="stats" class="stats">
      <div class="stats__item">
        <strong>{{ stats.parts_count }}</strong>
        <span>{{ t('premium.stats.parts') }}</span>
      </div>
      <div class="stats__item">
        <strong>{{ stats.total_likes }}</strong>
        <span>{{ t('premium.stats.likes') }}</span>
      </div>
      <div class="stats__item">
        <strong>{{ stats.total_views }}</strong>
        <span>{{ t('premium.stats.views') }}</span>
      </div>
    </div>
    <p v-if="error" class="account__error">{{ error }}</p>
  </div>
  <div v-else class="premium">
    <p class="premium__title">{{ t('premium.title') }}</p>
    <ul class="premium__perks">
      <li v-for="p in perks" :key="p">{{ p }}</li>
    </ul>
    <button class="btn btn--accent" :disabled="busy" @click="go('checkout')">
      {{ busy ? '…' : t('premium.go') }}
    </button>
    <p v-if="error" class="account__error">{{ error }}</p>
  </div>
</template>
