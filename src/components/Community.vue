<script setup lang="ts">
// Section « La communauté » — feed des parts, carte des spots, sondages.
import { ref } from 'vue'
import { useI18n } from '../i18n'
import Account from './community/Account.vue'
import Parts from './community/Parts.vue'
import Spots from './community/Spots.vue'
import Polls from './community/Polls.vue'
import Riders from './community/Riders.vue'
import Videos from './community/Videos.vue'

type Tab = 'parts' | 'spots' | 'polls' | 'riders' | 'videos'

const { t } = useI18n()
const tab = ref<Tab>('parts')

const TABS: { id: Tab; key: string }[] = [
  { id: 'parts', key: 'crew.tab.parts' },
  { id: 'videos', key: 'crew.tab.videos' },
  { id: 'riders', key: 'crew.tab.riders' },
  { id: 'spots', key: 'crew.tab.spots' },
  { id: 'polls', key: 'crew.tab.polls' },
]
</script>

<template>
  <section class="crew" id="crew">
    <div class="crew__inner">
      <header class="crew__head">
        <p class="crew__eyebrow">{{ t('crew.kicker') }}</p>
        <h2 class="crew__title">{{ t('crew.title') }}</h2>
        <p class="crew__sub">{{ t('crew.sub') }}</p>
      </header>

      <Account />

      <nav class="crew__tabs" :aria-label="t('crew.tabs')">
        <button
          v-for="tab2 in TABS"
          :key="tab2.id"
          :class="{ 'is-active': tab === tab2.id }"
          @click="tab = tab2.id"
        >
          {{ t(tab2.key) }}
        </button>
      </nav>

      <div class="crew__panel">
        <Parts v-if="tab === 'parts'" />
        <Videos v-else-if="tab === 'videos'" />
        <Riders v-else-if="tab === 'riders'" />
        <Spots v-else-if="tab === 'spots'" />
        <Polls v-else-if="tab === 'polls'" />
      </div>
    </div>
  </section>
</template>
