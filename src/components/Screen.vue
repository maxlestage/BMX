<script setup lang="ts">
defineProps<{ title: string; sub?: string }>()
</script>

<template>
  <section class="screen">
    <header class="screen__head">
      <h1 class="screen__title">{{ title }}</h1>
      <p v-if="sub" class="screen__sub">{{ sub }}</p>
    </header>
    <slot />
  </section>
</template>
