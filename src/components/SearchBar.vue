<script setup lang="ts">
// Barre de recherche « intelligente » : interprète une phrase libre et émet
// la requête parsée au parent (filtrage local des spots/riders/vidéos).
import { ref } from 'vue'
import { useI18n } from '../i18n'

const emit = defineEmits<{ (e: 'search', q: string): void }>()
const { t } = useI18n()
const value = ref('')

function submit(e: Event) {
  e.preventDefault()
  emit('search', value.value)
}

function onInput(e: Event) {
  value.value = (e.target as HTMLInputElement).value
  emit('search', value.value)
}
</script>

<template>
  <form class="search" @submit="submit">
    <span class="search__ai" aria-hidden="true">✦</span>
    <input
      class="search__input"
      type="search"
      :value="value"
      :placeholder="t('search.placeholder')"
      @input="onInput"
      :aria-label="t('search.placeholder')"
    />
    <span class="search__badge">AI</span>
  </form>
</template>
