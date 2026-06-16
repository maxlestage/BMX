<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from '../i18n'
import Screen from './Screen.vue'
import SearchBar from './SearchBar.vue'
import SearchResults from './SearchResults.vue'
import Account from './community/Account.vue'
import Stories from './Stories.vue'
import Parts from './community/Parts.vue'

const { t } = useI18n()
const query = ref('')
</script>

<template>
  <Screen :title="t('crew.title')" :sub="t('crew.sub')">
    <SearchBar @search="(q: string) => (query = q)" />
    <SearchResults :query="query" />
    <template v-if="!query.trim()">
      <Account />
      <Stories />
      <Parts />
    </template>
  </Screen>
</template>
