<script setup lang="ts">
// Tableau de bord admin — accessible via /admin (ou #admin).
// Réservé aux comptes dont le rôle est « admin » : vue d'ensemble chiffrée.

import { ref, computed, watch } from 'vue'
import { useAuth } from '../../auth'
import { api, type AdminStats } from '../../api'

/** Renvoie à l'accueil (efface le hash/chemin admin). */
function goHome() {
  window.location.hash = ''
  window.history.replaceState({}, '', window.location.pathname.replace(/\/admin\/?$/, '/'))
  // Recharge l'état d'écran de l'app.
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}

interface Metric {
  key: keyof AdminStats
  label: string
  icon: string
  hint?: (s: AdminStats) => string | undefined
}

const METRICS: Metric[] = [
  { key: 'users', label: 'Membres', icon: '🚲', hint: (s) => `dont ${s.admins} admin${s.admins > 1 ? 's' : ''}` },
  { key: 'parts', label: 'Parts', icon: '🎞️' },
  { key: 'spots', label: 'Spots', icon: '📍', hint: (s) => (s.spots_pending > 0 ? `${s.spots_pending} en attente` : 'tous validés') },
  { key: 'messages', label: 'Messages', icon: '✉️' },
  { key: 'polls', label: 'Sondages', icon: '📊' },
  { key: 'riders', label: 'Riders', icon: '⭐' },
  { key: 'videos', label: 'Vidéos', icon: '📺' },
]

const { user, ready } = useAuth()
const stats = ref<AdminStats | null>(null)
const error = ref<string | null>(null)
const loading = ref(false)

const isAdmin = computed(() => user.value?.role === 'admin')

watch(
  [ready, isAdmin],
  () => {
    if (!ready.value || !isAdmin.value) return
    loading.value = true
    error.value = null
    api
      .adminStats()
      .then((s) => {
        stats.value = s
      })
      .catch((e) => {
        error.value = e?.message || 'Erreur de chargement.'
      })
      .finally(() => {
        loading.value = false
      })
  },
  { immediate: true },
)
</script>

<template>
  <!-- Garde-fous d'accès. -->
  <section class="admin" v-if="!ready">
    <p class="admin__muted">…</p>
  </section>

  <section class="admin admin--gate" v-else-if="!user">
    <h1 class="admin__title">Espace admin</h1>
    <p class="admin__muted">Connecte-toi avec un compte administrateur pour accéder à cette page.</p>
    <button class="btn btn--accent" @click="goHome">
      ← Retour à l'app
    </button>
  </section>

  <section class="admin admin--gate" v-else-if="!isAdmin">
    <h1 class="admin__title">Accès réservé</h1>
    <p class="admin__muted">
      Ce compte ({{ user.display_name }}) n'a pas les droits administrateur.
    </p>
    <button class="btn btn--accent" @click="goHome">
      ← Retour à l'app
    </button>
  </section>

  <section class="admin" v-else>
    <header class="admin__head">
      <div>
        <p class="admin__kicker">Tableau de bord</p>
        <h1 class="admin__title">Admin · bmx</h1>
      </div>
      <button class="btn btn--ghost" @click="goHome">
        ← App
      </button>
    </header>

    <p class="admin__error" v-if="error">{{ error }}</p>
    <p class="admin__muted" v-if="loading && !stats">Chargement des statistiques…</p>

    <template v-if="stats">
      <div class="admin__grid">
        <div class="admin__card" v-for="m in METRICS" :key="m.key">
          <span class="admin__card-icon" aria-hidden="true">
            {{ m.icon }}
          </span>
          <span class="admin__card-value">{{ stats[m.key].toLocaleString('fr-FR') }}</span>
          <span class="admin__card-label">{{ m.label }}</span>
          <span class="admin__card-hint" v-if="m.hint && m.hint(stats)">{{ m.hint(stats) }}</span>
        </div>
      </div>

      <p class="admin__note" v-if="stats.spots_pending > 0">
        ⚠️ {{ stats.spots_pending }} spot{{ stats.spots_pending > 1 ? 's' : '' }} en attente de
        validation.
      </p>
    </template>
  </section>
</template>
