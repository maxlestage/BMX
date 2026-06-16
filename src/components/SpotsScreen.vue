<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from '../i18n'
import Screen from './Screen.vue'
import Spots from './community/Spots.vue'
import Sessions from './community/Sessions.vue'
import Shops from './community/Shops.vue'

const { t } = useI18n()
const sub = ref<'map' | 'sessions' | 'shops'>('map')
const SUBS = [
  { id: 'map', key: 'spots.tab.map' },
  { id: 'sessions', key: 'spots.tab.sessions' },
  { id: 'shops', key: 'spots.tab.shops' },
] as const
</script>

<template>
  <Screen :title="t('crew.tab.spots')">
    <div class="subtabs" role="tablist">
      <button
        v-for="s in SUBS"
        :key="s.id"
        role="tab"
        :aria-selected="sub === s.id"
        class="subtabs__item"
        :class="{ 'is-active': sub === s.id }"
        @click="sub = s.id"
      >
        {{ t(s.key) }}
      </button>
    </div>
    <Spots v-if="sub === 'map'" />
    <Sessions v-else-if="sub === 'sessions'" />
    <Shops v-else-if="sub === 'shops'" />
  </Screen>
</template>
