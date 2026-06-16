<script setup lang="ts">
// Sélecteur de langue. Le menu est toujours rendu dans le DOM ; sa visibilité
// est pilotée par la classe `lang--open` et par le CSS.
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { LANGS, useI18n } from '../i18n'

const { lang, setLang, t } = useI18n()
const open = ref(false)
const root = ref<HTMLDivElement | null>(null)
const current = computed(() => LANGS.find((l) => l.code === lang.value) ?? LANGS[0])

function onDoc(e: MouseEvent) {
  if (root.value && !root.value.contains(e.target as Node)) open.value = false
}
onMounted(() => document.addEventListener('click', onDoc))
onUnmounted(() => document.removeEventListener('click', onDoc))

function pick(code: (typeof LANGS)[number]['code']) {
  setLang(code)
  open.value = false
}
</script>

<template>
  <div class="lang" :class="{ 'lang--open': open }" ref="root">
    <button
      class="lang__toggle"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :aria-label="t('lang.label')"
      @click="open = !open"
    >
      <span aria-hidden="true">{{ current.flag }}</span>
      <span class="lang__code">{{ current.code.toUpperCase() }}</span>
    </button>
    <ul class="lang__menu" role="listbox" :aria-label="t('lang.label')">
      <li v-for="l in LANGS" :key="l.code">
        <button
          role="option"
          :aria-selected="l.code === lang"
          class="lang__item"
          :class="{ 'is-active': l.code === lang }"
          @click="pick(l.code)"
        >
          <span aria-hidden="true">{{ l.flag }}</span> {{ l.label }}
        </button>
      </li>
    </ul>
  </div>
</template>
