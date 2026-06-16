<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import { useI18n } from '../i18n'
import logo from '../assets/logo-bmx-neon.png'

// Scène 3D chargée à la demande (three.js en chunk séparé).
const Bike3D = defineAsyncComponent(() => import('./Bike3D.vue'))

const { t } = useI18n()
</script>

<template>
  <section class="hero" id="top">
    <div class="hero__inner">
      <img class="hero__logo" :src="logo" alt="bmx riders company" />

      <div class="hero__bike">
        <Bike3D />
      </div>

      <h1 class="hero__title">
        {{ t('hero.title.l1') }}
        <br />
        {{ t('hero.title.l2a') }}
        <span class="hero__accent">{{ t('hero.title.accent') }}</span
        >.
      </h1>

      <p class="hero__lede">{{ t('hero.lede') }}</p>

      <div class="hero__cta">
        <a class="btn btn--solid" href="#manifeste">{{ t('hero.cta.manifesto') }}</a>
        <a class="btn btn--ghost" href="#roule">{{ t('hero.cta.join') }}</a>
      </div>
    </div>

    <a class="hero__scroll" href="#manifeste" :aria-label="t('hero.scrollAria')">
      <span>{{ t('hero.scroll') }}</span>
      <span class="hero__scroll-line" />
    </a>
  </section>
</template>

<style scoped>
.hero__bike {
  width: min(440px, 80vw);
  height: 240px;
  margin: 0.5rem auto 1.5rem;
}
</style>
