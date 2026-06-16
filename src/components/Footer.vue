<script setup lang="ts">
import { useI18n } from '../i18n'
import LangSwitcher from './LangSwitcher.vue'
import logo from '../assets/logo-bmx.png'

const { t } = useI18n()
const year = new Date().getFullYear()
</script>

<template>
  <footer class="footer">
    <img class="footer__logo" :src="logo" alt="bmx riders company" />
    <p class="footer__tagline">{{ t('footer.tagline') }}</p>
    <nav class="footer__links" :aria-label="t('footer.links')">
      <a href="#manifeste">{{ t('nav.manifesto') }}</a>
      <a href="#pourquoi">{{ t('nav.why') }}</a>
      <a href="#tricks">{{ t('nav.tricks') }}</a>
      <a href="#roule">{{ t('nav.roll') }}</a>
      <a href="#page=about">{{ t('footer.about') }}</a>
      <a href="#page=press">{{ t('footer.press') }}</a>
      <a href="#contact">{{ t('footer.contact') }}</a>
    </nav>
    <nav class="footer__links footer__links--legal" :aria-label="t('footer.legal.aria')">
      <a href="#page=legal:mentions">{{ t('footer.legal') }}</a>
      <a href="#page=legal:cgu">{{ t('footer.terms') }}</a>
      <a href="#page=legal:cgv">{{ t('footer.sales') }}</a>
      <a href="#page=legal:privacy">{{ t('footer.privacy') }}</a>
      <a href="#page=legal:cookies">{{ t('footer.cookies') }}</a>
    </nav>
    <div class="footer__lang">
      <LangSwitcher />
    </div>
    <p class="footer__legal">{{ t('footer.legalLine').replace('{year}', String(year)) }}</p>
  </footer>
</template>
