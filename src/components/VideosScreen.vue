<script setup lang="ts">
import { useI18n } from '../i18n'
import Screen from './Screen.vue'
import Videos from './community/Videos.vue'

const { t } = useI18n()
</script>

<template>
  <Screen :title="t('crew.tab.videos')">
    <Videos />
  </Screen>
</template>
