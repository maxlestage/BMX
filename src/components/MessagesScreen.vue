<script setup lang="ts">
import { useI18n } from '../i18n'
import Screen from './Screen.vue'
import Messages from './Messages.vue'

const { t } = useI18n()
</script>

<template>
  <Screen :title="t('tab.messages')">
    <Messages />
  </Screen>
</template>
