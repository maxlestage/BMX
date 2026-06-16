<script setup lang="ts">
/** Formulaire d'offre (négociation) pour un acheteur. */
import { ref } from 'vue'
import { api, ApiError } from '../../api'
import { useI18n } from '../../i18n'

const props = defineProps<{ listingId: number }>()
const emit = defineEmits<{ sent: [] }>()

const { t } = useI18n()
const amount = ref('')
const message = ref('')
const busy = ref(false)
const error = ref<string | null>(null)

async function submit() {
  const cents = Math.round(parseFloat(amount.value.replace(',', '.')) * 100)
  if (!Number.isFinite(cents) || cents < 0) return
  busy.value = true
  error.value = null
  try {
    await api.makeOffer(props.listingId, {
      amount_cents: cents,
      message: message.value.trim() || undefined,
    })
    amount.value = ''
    message.value = ''
    emit('sent')
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : t('market.error')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <form class="market__offer" @submit.prevent="submit">
    <div class="market__offer-row">
      <input
        class="field"
        type="number"
        min="0"
        step="0.01"
        inputmode="decimal"
        :placeholder="t('market.offer.amount')"
        v-model="amount"
        required
      />
      <button class="btn btn--accent" :disabled="busy || !amount">
        {{ t('market.offer.send') }}
      </button>
    </div>
    <input
      class="field"
      :placeholder="t('market.offer.message')"
      v-model="message"
      :maxlength="500"
    />
    <p v-if="error" class="account__error">{{ error }}</p>
  </form>
</template>
