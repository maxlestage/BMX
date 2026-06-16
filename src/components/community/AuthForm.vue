<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '../../auth'
import { ApiError } from '../../api'
import { useI18n } from '../../i18n'

const { login, register } = useAuth()
const { t } = useI18n()
const mode = ref<'login' | 'register'>('login')
const email = ref('')
const password = ref('')
const username = ref('')
const displayName = ref('')
const busy = ref(false)
const error = ref<string | null>(null)

async function submit(e: Event) {
  e.preventDefault()
  busy.value = true
  error.value = null
  try {
    if (mode.value === 'login') {
      await login(email.value, password.value)
    } else {
      await register({ email: email.value, username: username.value, display_name: displayName.value, password: password.value })
    }
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : t('account.error')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <form class="account account--form" @submit="submit">
    <div class="account__tabs">
      <button
        type="button"
        :class="mode === 'login' ? 'is-active' : ''"
        @click="mode = 'login'"
      >
        {{ t('account.tab.login') }}
      </button>
      <button
        type="button"
        :class="mode === 'register' ? 'is-active' : ''"
        @click="mode = 'register'"
      >
        {{ t('account.tab.register') }}
      </button>
    </div>

    <template v-if="mode === 'register'">
      <label class="account__field">
        <span>{{ t('account.username') }}</span>
        <input
          class="field"
          v-model="username"
          autocomplete="username"
          required
        />
      </label>
      <label class="account__field">
        <span>{{ t('account.displayName') }}</span>
        <input
          class="field"
          v-model="displayName"
          required
        />
      </label>
    </template>
    <label class="account__field">
      <span>{{ t('account.email') }}</span>
      <input
        class="field"
        type="email"
        placeholder="ton@email.fr"
        v-model="email"
        autocomplete="email"
        required
      />
    </label>
    <label class="account__field">
      <span>{{ mode === 'register' ? t('account.passwordNew') : t('account.password') }}</span>
      <input
        class="field"
        type="password"
        v-model="password"
        :autocomplete="mode === 'register' ? 'new-password' : 'current-password'"
        required
      />
    </label>

    <p v-if="error" class="account__error">{{ error }}</p>

    <button class="btn btn--accent" :disabled="busy">
      {{ busy ? '…' : mode === 'login' ? t('account.login') : t('account.register') }}
    </button>
  </form>
</template>
