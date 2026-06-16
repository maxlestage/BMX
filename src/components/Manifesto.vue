<script setup lang="ts">
import { useReveal } from '../composables/pwa'
import { useI18n } from '../i18n'

const { el, visible } = useReveal()
const { t } = useI18n()
</script>

<template>
  <section id="manifeste" ref="el" class="manifesto reveal" :class="{ 'is-visible': visible }">
    <p class="section__kicker">{{ t('manifesto.kicker') }}</p>
    <h2 class="manifesto__text">{{ t('manifesto.text') }}</h2>
    <p class="manifesto__sign">{{ t('manifesto.sign') }}</p>
  </section>
</template>
