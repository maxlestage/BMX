<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { usePwaInstall } from '../composables/pwa'
import { useI18n } from '../i18n'
import LangSwitcher from './LangSwitcher.vue'
import logo from '../assets/logo-bmx.png'

const LINKS = [
  { href: '#manifeste', key: 'nav.manifesto' },
  { href: '#pourquoi', key: 'nav.why' },
  { href: '#tricks', key: 'nav.tricks' },
  { href: '#crew', key: 'nav.crew' },
  { href: '#roule', key: 'nav.roll' },
]

const { t } = useI18n()
const { canInstall, promptInstall } = usePwaInstall()
const scrolled = ref(false)
const open = ref(false)

function onScroll() {
  scrolled.value = window.scrollY > 24
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') open.value = false
}

onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('keydown', onKey)
})
onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('keydown', onKey)
  document.body.style.overflow = ''
})

// Verrouille le scroll du body quand le menu mobile est ouvert.
watch(open, (v) => {
  document.body.style.overflow = v ? 'hidden' : ''
})
</script>

<template>
  <header class="nav" :class="{ 'nav--scrolled': scrolled }">
    <a class="nav__brand" href="#top" :aria-label="t('nav.home')">
      <img class="nav__logo" :src="logo" alt="bmx riders company" />
    </a>

    <nav class="nav__links" :class="{ 'nav__links--open': open }" :aria-label="t('nav.primary')">
      <a v-for="l in LINKS" :key="l.href" :href="l.href" @click="open = false">{{ t(l.key) }}</a>
      <button v-if="canInstall" class="nav__install" @click="promptInstall">{{ t('nav.install') }}</button>
      <LangSwitcher />
    </nav>

    <button
      class="nav__burger"
      :class="{ 'nav__burger--open': open }"
      :aria-label="open ? t('nav.menuClose') : t('nav.menuOpen')"
      :aria-expanded="open"
      @click="open = !open"
    >
      <span />
      <span />
      <span />
    </button>
  </header>
</template>
