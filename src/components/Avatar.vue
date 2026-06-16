<script setup lang="ts">
// Avatar réutilisable : photo du membre si disponible, sinon ses initiales.
import { computed } from 'vue'
import { mediaUrl } from '../api'

const props = withDefaults(
  defineProps<{
    url?: string | null
    name?: string | null
    size?: number
    /** Sans bordure accent (ex. petit avatar d'onglet). */
    bare?: boolean
    className?: string
  }>(),
  { url: null, name: null, size: 44, bare: false, className: '' },
)

function initials(name?: string | null): string {
  const n = (name ?? '').trim()
  if (!n) return '?'
  return n
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

const src = computed(() => mediaUrl(props.url))
const style = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  fontSize: `${Math.round(props.size * 0.4)}px`,
}))
const cls = computed(() => `avatar ${props.bare ? 'avatar--bare' : ''} ${props.className}`.trim())
</script>

<template>
  <img v-if="src" :class="cls" :style="style" :src="src" alt="" loading="lazy" />
  <span v-else :class="`${cls} avatar--ph`" :style="style" aria-hidden="true">{{ initials(name) }}</span>
</template>
