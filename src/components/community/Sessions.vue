<script setup lang="ts">
// Sessions de bmx : rendez-vous proposés par les membres (spot ou ville),
// avec inscription en un clic.

import { onMounted, ref } from 'vue'
import { api, ApiError, type BMXSession } from '../../api'
import { useAuth } from '../../auth'
import { useI18n, type Lang } from '../../i18n'
import Avatar from '../Avatar.vue'

const DATE_LOCALES: Record<Lang, string> = {
  fr: 'fr-FR',
  en: 'en-GB',
  es: 'es-ES',
  de: 'de-DE',
  pt: 'pt-PT',
  zh: 'zh-CN',
  ja: 'ja-JP',
}

function fmtWhen(iso: string, lang: Lang): string {
  return new Date(iso).toLocaleString(DATE_LOCALES[lang], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const { user } = useAuth()
const { t, lang } = useI18n()
const sessions = ref<BMXSession[]>([])
const adding = ref(false)
const error = ref<string | null>(null)

onMounted(() => {
  api
    .sessions()
    .then((s) => (sessions.value = s))
    .catch((e) => (error.value = e instanceof ApiError ? e.message : t('sessions.loadError')))
})

function replace(s: BMXSession) {
  sessions.value = sessions.value.map((x) => (x.id === s.id ? s : x))
}

async function toggle(s: BMXSession, joined: boolean) {
  try {
    replace(joined ? await api.leaveSession(s.id) : await api.joinSession(s.id))
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : t('sessions.error')
  }
}

function isJoined(s: BMXSession): boolean {
  return !!user.value && s.members.some((m) => m.id === user.value!.id)
}

function onCreated(s: BMXSession) {
  sessions.value = [...sessions.value, s].sort((a, b) => a.starts_at.localeCompare(b.starts_at))
  adding.value = false
}

// --- SessionForm (formulaire) ---
const fTitle = ref('')
const fCity = ref(user.value?.city ?? '')
const fWhen = ref('')
const fDescription = ref('')
const fBusy = ref(false)
const fError = ref<string | null>(null)

async function submit() {
  const date = new Date(fWhen.value)
  if (Number.isNaN(date.getTime())) return
  fBusy.value = true
  fError.value = null
  try {
    const created = await api.createSession({
      title: fTitle.value.trim(),
      city: fCity.value.trim() || undefined,
      description: fDescription.value.trim() || undefined,
      starts_at: date.toISOString(),
    })
    onCreated(created)
  } catch (e) {
    fError.value = e instanceof ApiError ? e.message : t('sessions.error')
  } finally {
    fBusy.value = false
  }
}

function openForm() {
  adding.value = !adding.value
  if (adding.value) {
    fTitle.value = ''
    fCity.value = user.value?.city ?? ''
    fWhen.value = ''
    fDescription.value = ''
    fBusy.value = false
    fError.value = null
  }
}
</script>

<template>
  <div class="sessions">
    <div class="spots__bar">
      <span class="spots__count">
        {{ t('sessions.count').replace('{n}', String(sessions.length)) }}
      </span>
      <button
        v-if="user"
        :class="`btn ${adding ? 'btn--ghost' : 'btn--accent'}`"
        @click="openForm"
      >
        {{ adding ? t('sessions.cancel') : t('sessions.add') }}
      </button>
      <span v-else class="spots__hint">{{ t('sessions.guest') }}</span>
    </div>

    <p v-if="error" class="account__error">{{ error }}</p>

    <form v-if="adding" class="spots__form" @submit.prevent="submit">
      <input class="field" :placeholder="t('sessions.form.title')" v-model="fTitle" required />
      <div class="market__offer-row">
        <input
          class="field"
          type="datetime-local"
          :aria-label="t('sessions.form.when')"
          v-model="fWhen"
          required
        />
        <input class="field" :placeholder="t('sessions.form.city')" v-model="fCity" />
      </div>
      <textarea
        class="field"
        :placeholder="t('sessions.form.description')"
        v-model="fDescription"
        :rows="2"
      />
      <p v-if="fError" class="account__error">{{ fError }}</p>
      <div class="spots__form-actions">
        <button type="button" class="btn btn--ghost" @click="adding = false">
          {{ t('sessions.cancel') }}
        </button>
        <button class="btn btn--accent" :disabled="!fTitle.trim() || !fWhen || fBusy">
          {{ t('sessions.form.send') }}
        </button>
      </div>
    </form>

    <p v-if="sessions.length === 0 && !adding" class="market__empty">{{ t('sessions.empty') }}</p>

    <ul class="sessions__list">
      <li v-for="s in sessions" :key="s.id" class="sessions__card">
        <div class="sessions__when">{{ fmtWhen(s.starts_at, lang) }}</div>
        <div class="sessions__body">
          <strong class="sessions__title">{{ s.title }}</strong>
          <span class="sessions__meta">
            {{ s.city ? `📍 ${s.city} · ` : '' }}
            {{ t('sessions.host').replace('{name}', s.host.display_name ?? s.host.username ?? '—') }}
          </span>
          <p v-if="s.description" class="sessions__desc">{{ s.description }}</p>
          <div class="sessions__riders">
            <span class="sessions__avatars">
              <Avatar
                v-for="(m, i) in s.members.slice(0, 5)"
                :key="m.id ?? i"
                :url="m.avatar_url"
                :name="m.display_name ?? '?'"
                :size="24"
                bare
              />
            </span>
            <span class="sessions__countlbl">
              {{ t('sessions.riders').replace('{n}', String(s.members_count)) }}
            </span>
            <button
              v-if="user"
              :class="`btn ${isJoined(s) ? 'btn--ghost' : 'btn--accent'}`"
              @click="toggle(s, isJoined(s))"
            >
              {{ isJoined(s) ? t('sessions.leave') : t('sessions.join') }}
            </button>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>
