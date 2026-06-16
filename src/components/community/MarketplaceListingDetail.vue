<script setup lang="ts">
/** Fiche annonce : galerie, vendeur, offre (acheteur) ou gestion (vendeur). */
import { ref } from 'vue'
import { api, ApiError, mediaUrl, type Listing } from '../../api'
import { useAuth } from '../../auth'
import { useI18n } from '../../i18n'
import { useUI } from '../../ui'
import Avatar from '../Avatar.vue'
import MarketplaceOfferForm from './MarketplaceOfferForm.vue'
import MarketplaceOwnerPanel from './MarketplaceOwnerPanel.vue'

const props = defineProps<{ listing: Listing }>()
const emit = defineEmits<{ close: []; updated: [l: Listing] }>()

function fmtPrice(cents: number): string {
  return (cents / 100).toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  })
}

const { user } = useAuth()
const { t } = useI18n()
const { shareToMessages, openProfile } = useUI()
const mine = user.value?.id === props.listing.user_id
const photo = ref(0)
const error = ref<string | null>(null)
const notice = ref<string | null>(null)

async function act(fn: () => Promise<Listing>) {
  error.value = null
  try {
    emit('updated', await fn())
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : t('market.error')
  }
}

function onContact() {
  shareToMessages(
    `🛒 ${props.listing.title} — ${fmtPrice(props.listing.price_cents)}\n${t('market.contactIntro')}`,
    props.listing.user_id,
  )
}
</script>

<template>
  <div class="spotcard market__detail">
    <button class="spotcard__close" aria-label="×" @click="emit('close')">×</button>

    <div v-if="listing.photos.length > 0" class="spotcard__gallery">
      <img class="spotcard__photo" :src="mediaUrl(listing.photos[photo])" :alt="listing.title" />
      <div v-if="listing.photos.length > 1" class="spotcard__dots">
        <button
          v-for="(_, i) in listing.photos"
          :key="i"
          :class="`spotcard__dot ${i === photo ? 'is-on' : ''}`"
          :aria-label="`Photo ${i + 1}`"
          @click="photo = i"
        />
      </div>
    </div>

    <div class="spotcard__body">
      <h3 class="spotcard__name">{{ listing.title }}</h3>
      <p class="market__price market__price--big">{{ fmtPrice(listing.price_cents) }}</p>
      <p class="spotcard__meta">
        {{ t(`market.cat.${listing.category}`) }} · {{ t(`market.cond.${listing.condition}`) }}{{ listing.city ? ` · ${listing.city}` : '' }}
      </p>
      <p v-if="listing.description" class="spotcard__desc">{{ listing.description }}</p>

      <button
        v-if="listing.seller.id != null"
        class="market__seller"
        @click="openProfile(listing.seller.id!)"
      >
        <Avatar
          :url="listing.seller.avatar_url"
          :name="listing.seller.display_name ?? '?'"
          :size="28"
          bare
        />
        <span>{{ listing.seller.display_name ?? listing.seller.username }}</span>
      </button>

      <p v-if="notice" class="spots__notice">{{ notice }}</p>
      <p v-if="error" class="account__error">{{ error }}</p>

      <MarketplaceOwnerPanel
        v-if="mine"
        :listing="listing"
        @sold="act(() => api.markListingSold(listing.id))"
        @remove="act(() => api.removeListing(listing.id))"
      />
      <template v-else-if="user">
        <MarketplaceOfferForm
          :listing-id="listing.id"
          @sent="notice = t('market.offer.sent')"
        />
        <button class="btn btn--ghost spotcard__share" @click="onContact">
          💬 {{ t('market.contact') }}
        </button>
      </template>
      <p v-else class="spots__hint">{{ t('market.guest') }}</p>
    </div>
  </div>
</template>
