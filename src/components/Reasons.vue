<script setup lang="ts">
import { useReveal } from '../composables/pwa'
import { useI18n } from '../i18n'

const { el, visible } = useReveal()
const { t } = useI18n()

const REASONS = [
  { n: '01', icon: '🚲', key: 1 },
  { n: '02', icon: '🤝', key: 2 },
  { n: '03', icon: '🔁', key: 3 },
  { n: '04', icon: '🎨', key: 4 },
]
</script>

<template>
  <section id="pourquoi" ref="el" class="reasons reveal" :class="{ 'is-visible': visible }">
    <header class="reasons__head">
      <p class="section__kicker">{{ t('reasons.kicker') }}</p>
      <h2 class="section__title">{{ t('reasons.title') }}</h2>
    </header>

    <div class="reasons__grid">
      <article
        v-for="(r, i) in REASONS"
        :key="r.n"
        class="card"
        :style="{ '--delay': `${i * 90}ms` }"
      >
        <span class="card__num">{{ r.n }}</span>
        <span class="card__icon" aria-hidden="true">{{ r.icon }}</span>
        <h3 class="card__title">{{ t(`reasons.${r.key}.title`) }}</h3>
        <p class="card__text">{{ t(`reasons.${r.key}.text`) }}</p>
      </article>
    </div>
  </section>
</template>
