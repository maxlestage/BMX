<script setup lang="ts">
// Sondages communautaires : résultats en barres + vote (un seul par sondage).
import { onMounted, ref } from 'vue'
import { api, ApiError, type PollWithOptions } from '../../api'
import { useAuth } from '../../auth'
import { useI18n } from '../../i18n'

const { user } = useAuth()
const { t } = useI18n()
const polls = ref<PollWithOptions[] | null>(null)
const error = ref<string | null>(null)
const voted = ref<Record<number, boolean>>({})

onMounted(() => {
  api
    .polls()
    .then((p) => (polls.value = p))
    .catch((e) => (error.value = e instanceof ApiError ? e.message : t('polls.loadError')))
})

async function vote(pollId: number, optionId: number) {
  error.value = null
  try {
    const updated = await api.votePoll(pollId, optionId)
    polls.value = polls.value?.map((p) => (p.poll.id === pollId ? updated : p)) ?? null
    voted.value = { ...voted.value, [pollId]: true }
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : t('polls.voteError')
  }
}

function total(options: PollWithOptions['options']) {
  return options.reduce((s, o) => s + o.votes_count, 0)
}
</script>

<template>
  <p v-if="error && !polls" class="crew__empty">{{ error }}</p>
  <p v-else-if="!polls" class="crew__empty">{{ t('polls.loading') }}</p>
  <p v-else-if="polls.length === 0" class="crew__empty">{{ t('polls.empty') }}</p>
  <div v-else class="polls">
    <p v-if="error" class="account__error">{{ error }}</p>
    <article v-for="{ poll, options } in polls" class="poll" :key="poll.id">
      <h3 class="poll__q">{{ poll.question }}</h3>
      <span class="poll__cat">{{ poll.category }}</span>
      <ul class="poll__options">
        <li v-for="o in options" :key="o.id">
          <button
            class="poll__opt"
            :disabled="!user || voted[poll.id] || poll.closed"
            @click="vote(poll.id, o.id)"
            :title="user ? '' : t('polls.voteGuest')"
          >
            <span
              class="poll__bar"
              :style="{ width: (voted[poll.id] || poll.closed) ? `${total(options) > 0 ? Math.round((o.votes_count / total(options)) * 100) : 0}%` : 0 }"
            />
            <span class="poll__label">{{ o.label }}</span>
            <span v-if="voted[poll.id] || poll.closed" class="poll__pct">{{ total(options) > 0 ? Math.round((o.votes_count / total(options)) * 100) : 0 }}%</span>
          </button>
        </li>
      </ul>
      <footer class="poll__foot">
        {{ t('polls.votes').replace('{n}', String(total(options))) }}
        {{ !user ? t('polls.guestSuffix') : '' }}
      </footer>
    </article>
  </div>
</template>
