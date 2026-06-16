<script setup lang="ts">
// Panneau compte : connexion / inscription, ou résumé du profil connecté.
import { useAuth } from '../../auth'
import { useI18n } from '../../i18n'
import AvatarEditor from '../AvatarEditor.vue'
import Premium from './Premium.vue'
import AuthForm from './AuthForm.vue'

const { user, logout } = useAuth()
const { t } = useI18n()
</script>

<template>
  <div v-if="user" class="account account--in">
    <AvatarEditor :user="user" />
    <div class="account__top">
      <div>
        <span class="account__hi">
          {{ t('account.hi').replace('{name}', user.display_name) }}
          <span v-if="user.is_premium" class="badge-premium">✦ bmx+</span>
        </span>
        <span class="account__handle">@{{ user.username }}</span>
      </div>
      <button class="btn btn--ghost" @click="logout">
        {{ t('account.logout') }}
      </button>
    </div>
    <a v-if="user.role === 'admin'" class="btn btn--ghost account__admin-link" href="#admin">
      ⚙️ Tableau de bord admin
    </a>
    <Premium :is-premium="user.is_premium" />
  </div>
  <AuthForm v-else />
</template>
