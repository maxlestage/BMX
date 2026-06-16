<script setup lang="ts">
/** Formulaire de publication d'annonce. */
import { ref } from 'vue'
import { api, ApiError, mediaUrl, type Listing } from '../../api'
import { useI18n } from '../../i18n'
import { resizeImage } from '../../lib/image'

const emit = defineEmits<{ created: [l: Listing]; cancel: [] }>()

const CATEGORIES = ['deck', 'trucks', 'wheels', 'bearings', 'shoes', 'apparel', 'complete', 'other']
const CONDITIONS = ['new', 'good', 'worn']

const { t } = useI18n()
const title = ref('')
const description = ref('')
const price = ref('')
const category = ref('deck')
const condition = ref('good')
const city = ref('')
const photos = ref<string[]>([])
const busy = ref(false)
const error = ref<string | null>(null)

async function addFiles(files: FileList | null) {
  if (!files || files.length === 0) return
  busy.value = true
  try {
    for (const file of Array.from(files).slice(0, 8 - photos.value.length)) {
      const resized = await resizeImage(file)
      const media = await api.uploadMedia(resized)
      photos.value = photos.value.length < 8 ? [...photos.value, media.url] : photos.value
    }
  } catch {
    /* upload échoué — on ignore cette photo */
  } finally {
    busy.value = false
  }
}

async function submit() {
  const cents = Math.round(parseFloat(price.value.replace(',', '.')) * 100)
  if (!Number.isFinite(cents) || cents < 0) return
  busy.value = true
  error.value = null
  try {
    const created = await api.createListing({
      title: title.value.trim(),
      description: description.value.trim() || undefined,
      price_cents: cents,
      category: category.value,
      condition: condition.value,
      city: city.value.trim() || undefined,
      photos: photos.value,
    })
    emit('created', created)
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : t('market.error')
  } finally {
    busy.value = false
  }
}

function removePhoto(i: number) {
  photos.value = photos.value.filter((_, j) => j !== i)
}
</script>

<template>
  <form class="spots__form" @submit.prevent="submit">
    <input class="field" :placeholder="t('market.form.title')" v-model="title" required />
    <div class="market__offer-row">
      <input
        class="field"
        type="number"
        min="0"
        step="0.01"
        inputmode="decimal"
        :placeholder="t('market.form.price')"
        v-model="price"
        required
      />
      <input class="field" :placeholder="t('market.form.city')" v-model="city" />
    </div>
    <div class="market__offer-row">
      <select class="field" v-model="category">
        <option v-for="c in CATEGORIES" :key="c" :value="c">{{ t(`market.cat.${c}`) }}</option>
      </select>
      <select class="field" v-model="condition">
        <option v-for="c in CONDITIONS" :key="c" :value="c">{{ t(`market.cond.${c}`) }}</option>
      </select>
    </div>
    <textarea
      class="field"
      :placeholder="t('market.form.description')"
      v-model="description"
      :rows="2"
    />

    <label class="spots__photos-btn">
      {{ busy ? t('spots.photos.adding') : t('spots.photos.add') }}
      <input
        type="file"
        accept="image/*"
        multiple
        hidden
        :disabled="busy || photos.length >= 8"
        @change="addFiles(($event.target as HTMLInputElement).files)"
      />
    </label>
    <div v-if="photos.length > 0" class="spots__thumbs">
      <div class="spots__thumb" v-for="(p, i) in photos" :key="p">
        <img :src="mediaUrl(p)" alt="" />
        <button type="button" class="spots__thumb-x" aria-label="×" @click="removePhoto(i)">
          ×
        </button>
      </div>
    </div>

    <p v-if="error" class="account__error">{{ error }}</p>
    <div class="spots__form-actions">
      <button type="button" class="btn btn--ghost" @click="emit('cancel')">
        {{ t('market.cancel') }}
      </button>
      <button class="btn btn--accent" :disabled="!title.trim() || !price || busy">
        {{ t('market.form.send') }}
      </button>
    </div>
  </form>
</template>
