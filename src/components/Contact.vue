<script setup lang="ts">
import { useReveal } from '../composables/pwa'
import { useI18n } from '../i18n'

const { el, visible } = useReveal()
const { t } = useI18n()

// Canaux de contact — chacun ouvre le client mail de l'utilisateur.
const CHANNELS = [
  { key: 'support', icon: '💬', email: 'hello@bmx.bike' },
  { key: 'press', icon: '📰', email: 'press@bmx.bike' },
  { key: 'partners', icon: '🤝', email: 'partners@bmx.bike' },
  { key: 'privacy', icon: '🔒', email: 'privacy@bmx.bike' },
]
</script>

<template>
  <section id="contact" ref="el" class="contact reveal" :class="{ 'is-visible': visible }">
    <header class="contact__head">
      <p class="section__kicker">{{ t('contact.kicker') }}</p>
      <h2 class="section__title">{{ t('contact.title') }}</h2>
      <p class="contact__sub">{{ t('contact.sub') }}</p>
    </header>

    <div class="contact__grid">
      <a
        v-for="(c, i) in CHANNELS"
        class="card contact__card"
        :key="c.key"
        :href="`mailto:${c.email}`"
        :style="{ '--delay': `${i * 90}ms` }"
      >
        <span class="card__icon" aria-hidden="true">
          {{ c.icon }}
        </span>
        <h3 class="card__title">{{ t(`contact.${c.key}.title`) }}</h3>
        <p class="card__text">{{ t(`contact.${c.key}.text`) }}</p>
        <span class="contact__mail">{{ c.email }}</span>
      </a>
    </div>
  </section>
</template>
