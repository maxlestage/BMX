import './pages.css'
import { useI18n, type Lang } from '../../i18n'
import logo from '../../assets/logo-bmx.png'

type Content = {
  title: string
  subtitle: string
  taglineHeading: string
  tagline: string
  factsHeading: string
  facts: string[]
  logoHeading: string
  logoLabel: string
  founderHeading: string
  founder: string
  contactHeading: string
  contactIntro: string
}

const PRESS: Record<Lang, Content> = {
  fr: {
    title: 'Presse', subtitle: 'Tout ce qu’il faut pour parler de bmx : pitch, chiffres, logo et contact direct.',
    taglineHeading: 'En une phrase',
    tagline: "bmx est une app communautaire de bmx, sans pub ni classement : parts vidéo, carte des spots, classement des riders et messagerie. Le bmx, ensemble.",
    factsHeading: 'Chiffres clés',
    facts: ['PWA installable (iOS / Android / desktop), fonctionne hors-ligne', 'Gratuit · option bmx+ (upload HD, effets, sans pub)', '7 langues : FR, EN, ES, DE, PT, 中文, 日本語', 'Hébergement européen, zéro tracker publicitaire'],
    logoHeading: 'Logo', logoLabel: 'Logo PNG',
    founderHeading: 'Fondateur',
    founder: 'Projet indépendant lancé en France par Maxime Nathan Lestage — auto-financé, sans levée de fonds.',
    contactHeading: 'Contact presse',
    contactIntro: 'Interviews, visuels supplémentaires, accès : réponse sous 48 h.',
  },
  en: {
    title: 'Press', subtitle: 'Everything you need to talk about bmx: pitch, key facts, logo and a direct contact.',
    taglineHeading: 'In one sentence',
    tagline: 'bmx is a community BMX app, with no ads or rankings: video parts, a spot map, a rider ranking and messaging. Riding, together.',
    factsHeading: 'Key facts',
    facts: ['Installable PWA (iOS / Android / desktop), works offline', 'Free · bmx+ option (HD upload, effects, no ads)', '7 languages: FR, EN, ES, DE, PT, 中文, 日本語', 'European hosting, zero advertising tracker'],
    logoHeading: 'Logo', logoLabel: 'PNG logo',
    founderHeading: 'Founder',
    founder: 'Independent project launched in France by Maxime Nathan Lestage — self-funded, no outside investment.',
    contactHeading: 'Press contact',
    contactIntro: 'Interviews, extra visuals, access: reply within 48 hours.',
  },
  es: {
    title: 'Prensa', subtitle: 'Todo lo necesario para hablar de bmx: pitch, cifras, logo y contacto directo.',
    taglineHeading: 'En una frase',
    tagline: 'bmx es una app comunitaria de bmx, sin publicidad ni rankings: parts en vídeo, mapa de spots, ranking de riders y mensajería. El bmx, juntos.',
    factsHeading: 'Cifras clave',
    facts: ['PWA instalable (iOS / Android / escritorio), funciona sin conexión', 'Gratis · opción bmx+ (subida HD, efectos, sin anuncios)', '7 idiomas: FR, EN, ES, DE, PT, 中文, 日本語', 'Alojamiento europeo, cero rastreadores publicitarios'],
    logoHeading: 'Logo', logoLabel: 'Logo PNG',
    founderHeading: 'Fundador',
    founder: 'Proyecto independiente lanzado en Francia por Maxime Nathan Lestage — autofinanciado, sin inversión externa.',
    contactHeading: 'Contacto prensa',
    contactIntro: 'Entrevistas, visuales adicionales, acceso: respuesta en 48 h.',
  },
  de: {
    title: 'Presse', subtitle: 'Alles, um über bmx zu sprechen: Pitch, Zahlen, Logo und direkter Kontakt.',
    taglineHeading: 'In einem Satz',
    tagline: 'bmx ist eine Community-BMX-App, ohne Werbung und Rankings: Video-Parts, Spot-Karte, Rider-Ranking und Messaging. BMXn, gemeinsam.',
    factsHeading: 'Eckdaten',
    facts: ['Installierbare PWA (iOS / Android / Desktop), offline nutzbar', 'Kostenlos · bmx+ Option (HD-Upload, Effekte, werbefrei)', '7 Sprachen: FR, EN, ES, DE, PT, 中文, 日本語', 'Europäisches Hosting, null Werbetracker'],
    logoHeading: 'Logo', logoLabel: 'PNG-Logo',
    founderHeading: 'Gründer',
    founder: 'Unabhängiges Projekt, in Frankreich von Maxime Nathan Lestage gestartet — selbstfinanziert, ohne Fremdkapital.',
    contactHeading: 'Pressekontakt',
    contactIntro: 'Interviews, zusätzliches Bildmaterial, Zugang: Antwort binnen 48 Stunden.',
  },
  pt: {
    title: 'Imprensa', subtitle: 'Tudo o que precisas para falar de bmx: pitch, números, logo e contacto direto.',
    taglineHeading: 'Numa frase',
    tagline: 'bmx é uma app comunitária de bmx, sem publicidade nem rankings: parts em vídeo, mapa de spots, ranking de riders e mensagens. O bmx, juntos.',
    factsHeading: 'Números-chave',
    facts: ['PWA instalável (iOS / Android / desktop), funciona offline', 'Grátis · opção bmx+ (upload HD, efeitos, sem anúncios)', '7 idiomas: FR, EN, ES, DE, PT, 中文, 日本語', 'Alojamento europeu, zero rastreadores publicitários'],
    logoHeading: 'Logo', logoLabel: 'Logo PNG',
    founderHeading: 'Fundador',
    founder: 'Projeto independente lançado em França por Maxime Nathan Lestage — autofinanciado, sem investimento externo.',
    contactHeading: 'Contacto imprensa',
    contactIntro: 'Entrevistas, visuais adicionais, acesso: resposta em 48 h.',
  },
  zh: {
    title: '媒体', subtitle: '谈论 bmx 所需的一切：简介、数据、logo 和直接联系方式。',
    taglineHeading: '一句话',
    tagline: 'bmx 是一款滑板社区应用，没有广告也没有排名：视频片段、点位地图、滑手排行和消息。一起滑板。',
    factsHeading: '关键数据',
    facts: ['可安装的 PWA（iOS / Android / 桌面），可离线使用', '免费 · bmx+ 选项（高清上传、特效、无广告）', '7 种语言：FR、EN、ES、DE、PT、中文、日本語', '欧洲托管，零广告追踪器'],
    logoHeading: 'Logo', logoLabel: 'PNG logo',
    founderHeading: '创始人',
    founder: '由 Maxime Nathan Lestage 在法国发起的独立项目——自筹资金，未进行融资。',
    contactHeading: '媒体联系',
    contactIntro: '采访、更多素材、访问权限：48 小时内回复。',
  },
  ja: {
    title: 'プレス', subtitle: 'bmx について語るために必要なすべて：ピッチ、数字、ロゴ、直接の連絡先。',
    taglineHeading: '一言で',
    tagline: 'bmx は広告もランキングもないスケートのコミュニティアプリ：動画パート、スポットマップ、スケーターのランキング、メッセージ。みんなでスケート。',
    factsHeading: '主な数字',
    facts: ['インストール可能な PWA（iOS / Android / デスクトップ）、オフライン対応', '無料 · bmx+ オプション（HDアップロード、エフェクト、広告なし）', '7言語：FR、EN、ES、DE、PT、中文、日本語', '欧州ホスティング、広告トラッカーゼロ'],
    logoHeading: 'ロゴ', logoLabel: 'PNG ロゴ',
    founderHeading: '創業者',
    founder: 'Maxime Nathan Lestage がフランスで立ち上げた独立プロジェクト——自己資金、外部投資なし。',
    contactHeading: 'プレス窓口',
    contactIntro: '取材、追加素材、アクセス：48時間以内に返信。',
  },
}

export function Press() {
  const { t, lang } = useI18n()
  const c = PRESS[lang]
  return (
    <main className="page">
      <a className="page__back" href="#top">{t('page.back')}</a>
      <h1 className="page__title">{c.title}</h1>
      <p className="page__sub">{c.subtitle}</p>

      <h2 className="page__h2">{c.taglineHeading}</h2>
      <p className="page__p">{c.tagline}</p>

      <h2 className="page__h2">{c.factsHeading}</h2>
      <ul className="page__list">
        {c.facts.map((f) => <li key={f}>{f}</li>)}
      </ul>

      <h2 className="page__h2">{c.logoHeading}</h2>
      <a className="page__asset" href={logo} download>
        <img src={logo} alt="bmx" />
        {c.logoLabel}
      </a>

      <h2 className="page__h2">{c.founderHeading}</h2>
      <p className="page__p">{c.founder}</p>

      <h2 className="page__h2">{c.contactHeading}</h2>
      <p className="page__p">
        {c.contactIntro}<br />
        <a className="page__mail" href="mailto:press@bmx.bike">press@bmx.bike</a>
      </p>
    </main>
  )
}
