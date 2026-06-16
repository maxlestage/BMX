<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{ name: string; url: string | null }>()

const failed = ref(false)
const initials = computed(() =>
  props.name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase(),
)
</script>

<template>
  <div v-if="!url || failed" class="rider__photo rider__photo--ph">{{ initials }}</div>
  <img
    v-else
    class="rider__photo"
    :src="url"
    :alt="name"
    loading="lazy"
    @error="failed = true"
  />
</template>
