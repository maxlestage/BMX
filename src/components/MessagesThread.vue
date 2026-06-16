<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { api, type Conversation, type Message } from '../api'
import { useAuth } from '../auth'
import { useI18n } from '../i18n'
import { useUI } from '../ui'

const props = withDefaults(
  defineProps<{ convo: Conversation; initialText?: string }>(),
  { initialText: '' },
)
const emit = defineEmits<{ (e: 'back'): void }>()

const { user } = useAuth()
const { t } = useI18n()
const { refreshUnread } = useUI()
const msgs = ref<Message[]>([])
const text = ref(props.initialText)
const busy = ref(false)
const name = ref<string | null>(null)
const endRef = ref<HTMLDivElement | null>(null)

// Charge le nom de l'interlocuteur s'il n'est pas connu (cas brouillon).
watch(
  () => [props.convo.user_id, props.convo.display_name],
  () => {
    if (props.convo.display_name) return
    api
      .profile(props.convo.user_id)
      .then((p) => (name.value = p.user.display_name))
      .catch(() => {})
  },
  { immediate: true },
)

async function load() {
  try {
    msgs.value = await api.thread(props.convo.user_id)
    refreshUnread() // le fil vient d'être marqué comme lu côté serveur
  } catch {
    /* ignore */
  }
}

let timer: ReturnType<typeof setInterval> | null = null
watch(
  () => props.convo.user_id,
  () => {
    load()
    if (timer) clearInterval(timer)
    timer = setInterval(load, 5000) // rafraîchit le fil toutes les 5 s
  },
  { immediate: true },
)
onUnmounted(() => {
  if (timer) clearInterval(timer)
})

watch(msgs, () => {
  nextTick(() => endRef.value?.scrollIntoView({ behavior: 'smooth' }))
})

async function send(e: Event) {
  e.preventDefault()
  const body = text.value.trim()
  if (!body) return
  busy.value = true
  try {
    const m = await api.sendMessage(props.convo.user_id, body)
    msgs.value = [...msgs.value, m]
    text.value = ''
  } catch {
    /* ignore */
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="thread">
    <header class="thread__head">
      <button class="thread__back" @click="emit('back')" :aria-label="t('msg.back')">
        ‹
      </button>
      <strong>{{ convo.display_name ?? name ?? `#${convo.user_id}` }}</strong>
    </header>

    <div class="thread__list">
      <div
        v-for="m in msgs"
        :key="m.id"
        class="bubble"
        :class="{ 'bubble--me': m.sender_id === user!.id }"
      >
        {{ m.body }}
      </div>
      <div ref="endRef" />
    </div>

    <form class="thread__form" @submit="send">
      <input
        class="field"
        :placeholder="t('msg.placeholder')"
        v-model="text"
      />
      <button class="btn btn--accent" :disabled="busy || !text.trim()">
        {{ t('msg.send') }}
      </button>
    </form>
  </div>
</template>
