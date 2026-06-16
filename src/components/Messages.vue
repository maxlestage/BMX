<script setup lang="ts">
// Messagerie : liste des conversations, puis fil de discussion + envoi.
import { onMounted, ref } from 'vue'
import { type Conversation } from '../api'
import { useAuth } from '../auth'
import { useI18n } from '../i18n'
import { useUI } from '../ui'
import ConversationList from './MessagesConversationList.vue'
import Thread from './MessagesThread.vue'

const { user } = useAuth()
const { t } = useI18n()
const { consumeDraft } = useUI()
const open = ref<Conversation | null>(null)
const draftText = ref('')

// Si on arrive avec un brouillon (partage de spot / message depuis profil),
// ouvre directement le fil avec le destinataire et pré-remplit le texte.
onMounted(() => {
  const d = consumeDraft()
  if (d?.recipientId != null) {
    open.value = {
      user_id: d.recipientId,
      username: null,
      display_name: null,
      avatar_url: null,
      last_body: '',
      last_at: '',
      unread: false,
    }
    draftText.value = d.body
  }
})
</script>

<template>
  <p v-if="!user" class="crew__empty">{{ t('msg.guest') }}</p>
  <Thread
    v-else-if="open"
    :convo="open"
    :initial-text="draftText"
    @back="open = null"
  />
  <ConversationList v-else @open="open = $event" />
</template>
