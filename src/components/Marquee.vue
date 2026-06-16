<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '../i18n'

const { t } = useI18n()
// Doublé pour une boucle continue sans coupure.
const items = computed(() => {
  const words = [t('marquee.1'), t('marquee.2'), t('marquee.3'), t('marquee.4'), t('marquee.5'), t('marquee.6')]
  return [...words, ...words]
})
</script>

<template>
  <div class="marquee" aria-hidden="true">
    <div class="marquee__track">
      <span v-for="(w, i) in items" :key="i" class="marquee__item">
        {{ w }}<span class="marquee__star">★</span>
      </span>
    </div>
  </div>
</template>
