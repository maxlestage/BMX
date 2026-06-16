<script setup lang="ts">
// Marketplace : petites annonces de matos entre membres, avec négociation
// (offres de prix) et contact vendeur via la messagerie.

import { onMounted, ref, watch } from 'vue'
import { api, ApiError, mediaUrl, type Listing } from '../../api'
import { useAuth } from '../../auth'
import { useI18n } from '../../i18n'
import MarketplaceListingDetail from './MarketplaceListingDetail.vue'
import MarketplaceListingForm from './MarketplaceListingForm.vue'

const CATEGORIES = ['deck', 'trucks', 'wheels', 'bearings', 'shoes', 'apparel', 'complete', 'other']

function fmtPrice(cents: number): string {
  return (cents / 100).toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  })
}

const { user } = useAuth()
const { t } = useI18n()
const listings = ref<Listing[]>([])
const category = ref('')
const selling = ref(false)
const selected = ref<Listing | null>(null)
const error = ref<string | null>(null)
const notice = ref<string | null>(null)

function load(cat = category.value) {
  api
    .listings(cat ? { category: cat } : {})
    .then((l) => (listings.value = l))
    .catch((e) => (error.value = e instanceof ApiError ? e.message : t('market.loadError')))
}

onMounted(() => load())
watch(category, () => load())

function onCreated(l: Listing) {
  listings.value = [l, ...listings.value]
  selling.value = false
  notice.value = t('market.published')
}

function onUpdated(l: Listing) {
  listings.value =
    l.status === 'active'
      ? listings.value.map((x) => (x.id === l.id ? { ...x, ...l } : x))
      : listings.value.filter((x) => x.id !== l.id)
  selected.value = null
}
</script>

<template>
  <div class="market">
    <div class="spots__bar">
      <span class="spots__count">
        {{ t('market.count').replace('{n}', String(listings.length)) }}
      </span>
      <button
        v-if="user"
        :class="`btn ${selling ? 'btn--ghost' : 'btn--accent'}`"
        @click="selling = !selling"
      >
        {{ selling ? t('market.cancel') : t('market.sell') }}
      </button>
      <span v-else class="spots__hint">{{ t('market.guest') }}</span>
    </div>

    <div class="market__cats">
      <button
        :class="`market__cat ${category === '' ? 'is-on' : ''}`"
        @click="category = ''"
      >
        {{ t('market.cat.all') }}
      </button>
      <button
        v-for="c in CATEGORIES"
        :key="c"
        :class="`market__cat ${category === c ? 'is-on' : ''}`"
        @click="category = c"
      >
        {{ t(`market.cat.${c}`) }}
      </button>
    </div>

    <p v-if="notice" class="spots__notice">{{ notice }}</p>
    <p v-if="error" class="account__error">{{ error }}</p>

    <MarketplaceListingForm v-if="selling" @created="onCreated" @cancel="selling = false" />

    <p v-if="listings.length === 0 && !selling" class="market__empty">{{ t('market.empty') }}</p>

    <div class="market__grid">
      <button v-for="l in listings" :key="l.id" class="market__card" @click="selected = l">
        <img
          v-if="l.photos.length > 0"
          class="market__photo"
          :src="mediaUrl(l.photos[0])"
          :alt="l.title"
        />
        <div v-else class="market__photo market__photo--ph">🚲</div>
        <div class="market__meta">
          <strong class="market__title">{{ l.title }}</strong>
          <span class="market__price">{{ fmtPrice(l.price_cents) }}</span>
          <span class="market__sub">
            {{ t(`market.cond.${l.condition}`) }}{{ l.city ? ` · ${l.city}` : '' }}
          </span>
        </div>
      </button>
    </div>

    <MarketplaceListingDetail
      v-if="selected"
      :listing="selected"
      @close="selected = null"
      @updated="onUpdated"
    />
  </div>
</template>
