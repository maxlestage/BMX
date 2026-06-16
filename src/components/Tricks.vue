<script setup lang="ts">
import { ref } from 'vue'
import { useReveal } from '../composables/pwa'
import { useI18n } from '../i18n'

const { el, visible } = useReveal()
const { t } = useI18n()
const active = ref(0)

// Noms de tricks BMX (universels, non traduits) ; le niveau et la description
// viennent du dictionnaire.
const TRICKS = ['Bunny hop', '180', 'Grind', 'Manual', 'Tailwhip']

function pad(i: number) {
  return String(i + 1).padStart(2, '0')
}
</script>

<template>
  <section id="tricks" ref="el" class="tricks reveal" :class="{ 'is-visible': visible }">
    <header class="tricks__head">
      <p class="section__kicker">{{ t('tricks.kicker') }}</p>
      <h2 class="section__title">{{ t('tricks.title') }}</h2>
    </header>

    <div class="tricks__list" role="tablist" :aria-label="t('tricks.list')">
      <button
        v-for="(name, i) in TRICKS"
        :key="name"
        role="tab"
        :aria-selected="i === active"
        class="trick"
        :class="{ 'trick--open': i === active }"
        @click="active = i"
      >
        <span class="trick__index">{{ pad(i) }}</span>
        <span class="trick__body">
          <span class="trick__name">{{ name }}</span>
          <span class="trick__level">{{ t(`tricks.${i + 1}.level`) }}</span>
          <span class="trick__text">{{ t(`tricks.${i + 1}.text`) }}</span>
        </span>
        <span class="trick__chevron" aria-hidden="true">{{ i === active ? '–' : '+' }}</span>
      </button>
    </div>
  </section>
</template>
