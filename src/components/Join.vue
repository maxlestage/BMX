<script setup lang="ts">
import { ref } from 'vue'
import { useReveal } from '../composables/pwa'
import { useI18n } from '../i18n'

const { el, visible } = useReveal()
const { t } = useI18n()
const email = ref('')
const sent = ref(false)

function submit(e: Event) {
  e.preventDefault()
  if (!email.value.trim()) return
  // Pas de backend : on célèbre localement l'intention de rouler avec nous.
  sent.value = true
}
</script>

<template>
  <section id="roule" ref="el" class="join reveal" :class="{ 'is-visible': visible }">
    <div class="join__card">
      <p class="section__kicker">{{ t('join.kicker') }}</p>
      <h2 class="join__title">{{ t('join.title') }}</h2>
      <p class="join__lede">{{ t('join.lede') }}</p>

      <p v-if="sent" class="join__thanks" role="status">
        {{ t('join.thanks') }}
      </p>
      <form v-else class="join__form" @submit="submit">
        <input
          type="email"
          required
          :placeholder="t('join.placeholder')"
          :aria-label="t('join.emailAria')"
          v-model="email"
        />
        <button type="submit" class="btn btn--solid">
          {{ t('join.submit') }}
        </button>
      </form>
    </div>
  </section>
</template>
