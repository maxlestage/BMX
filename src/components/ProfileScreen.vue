<script setup lang="ts">
import { useI18n } from '../i18n'
import Screen from './Screen.vue'
import Account from './community/Account.vue'
import NotificationToggle from './NotificationToggle.vue'
import Riders from './community/Riders.vue'

const { t } = useI18n()
</script>

<template>
  <Screen :title="t('tab.profile')">
    <Account />
    <NotificationToggle />
    <Riders />
  </Screen>
</template>
