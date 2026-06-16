<script setup lang="ts">
import { useI18n } from '../i18n'
import Screen from './Screen.vue'
import Marketplace from './community/Marketplace.vue'

const { t } = useI18n()
</script>

<template>
  <Screen :title="t('market.title')" :sub="t('market.sub')">
    <Marketplace />
  </Screen>
</template>
