<script setup lang="ts">
/** Panneau vendeur : offres reçues (accepter/refuser) + statut de l'annonce. */
import { onMounted, ref } from 'vue'
import { api, type Listing, type Offer } from '../../api'
import { useI18n } from '../../i18n'

const props = defineProps<{ listing: Listing }>()
const emit = defineEmits<{ sold: []; remove: [] }>()

function fmtPrice(cents: number): string {
  return (cents / 100).toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  })
}

const { t } = useI18n()
const offers = ref<Offer[] | null>(null)

onMounted(() => {
  api
    .listingOffers(props.listing.id)
    .then((o) => (offers.value = o))
    .catch(() => (offers.value = []))
})

async function answer(o: Offer, accept: boolean) {
  try {
    const updated = accept ? await api.acceptOffer(o.id) : await api.declineOffer(o.id)
    offers.value = offers.value?.map((x) => (x.id === o.id ? { ...x, ...updated } : x)) ?? null
    if (accept) emit('sold')
  } catch {
    /* déjà traitée / annonce close */
  }
}
</script>

<template>
  <div class="market__owner">
    <h4 class="market__owner-title">{{ t('market.offers') }}</h4>
    <p v-if="!offers || offers.length === 0" class="spots__hint">{{ t('market.offers.none') }}</p>
    <ul v-else class="market__offers">
      <li v-for="o in offers" :key="o.id" class="market__offer-item">
        <span class="market__offer-who">
          {{ o.buyer?.display_name ?? o.buyer?.username ?? '—' }}
        </span>
        <span class="market__price">{{ fmtPrice(o.amount_cents) }}</span>
        <span v-if="o.message" class="market__offer-msg">« {{ o.message }} »</span>
        <span v-if="o.status === 'pending'" class="market__offer-actions">
          <button class="btn btn--accent" @click="answer(o, true)">
            {{ t('market.accept') }}
          </button>
          <button class="btn btn--ghost" @click="answer(o, false)">
            {{ t('market.decline') }}
          </button>
        </span>
        <em v-else class="market__offer-status">{{ t(`market.offer.${o.status}`) }}</em>
      </li>
    </ul>
    <div class="spots__form-actions">
      <button v-if="listing.status === 'active'" class="btn btn--accent" @click="emit('sold')">
        {{ t('market.markSold') }}
      </button>
      <button class="btn btn--ghost" @click="emit('remove')">
        {{ t('market.remove') }}
      </button>
    </div>
  </div>
</template>
