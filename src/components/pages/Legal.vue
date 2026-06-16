<script setup lang="ts">
import { computed, watch, onMounted, onUnmounted } from 'vue'
import { useI18n, type Lang } from '../../i18n'

type Block = { heading?: string; content: string }
type Section = { id: string; title: string; tocLabel: string; blocks: Block[] }
type Content = { title: string; updated: string; sections: Section[] }

const props = defineProps<{ section?: string }>()

const LEGAL: Record<Lang, Content> = {
  fr: {
    title: 'Mentions légales & RGPD',
    updated: 'Dernière mise à jour : 2026',
    sections: [
      { id: 'mentions', title: '1. Mentions légales', tocLabel: 'Mentions légales', blocks: [
        { content: 'Éditeur : bmx — Maxime Nathan Lestage, entrepreneur individuel (France). Contact : hello@bmx.bike.' },
        { content: 'Hébergement : site statique sur GitHub Pages (GitHub Inc.) ; API sur Heroku (Salesforce), région Union Européenne.' },
        { content: 'Propriété intellectuelle : la marque, le logo et le contenu éditorial de bmx sont protégés. Les contenus publiés par les membres restent leur propriété.' },
      ] },
      { id: 'cgu', title: "2. Conditions Générales d'Utilisation", tocLabel: 'CGU', blocks: [
        { heading: 'Objet', content: "Les présentes CGU régissent l'accès et l'usage de l'application bmx." },
        { heading: 'Compte', content: "Certaines fonctions nécessitent un compte. Tu es responsable de tes identifiants. Âge minimum : 13 ans." },
        { heading: 'Règles de conduite', content: "Respecte les autres. Les contenus haineux, illégaux ou portant atteinte aux droits d'autrui sont interdits et peuvent être retirés." },
        { heading: 'Contenu des membres', content: "Tu restes propriétaire de tes parts, photos et spots. En les publiant, tu accordes à bmx une licence non exclusive pour les afficher dans l'app." },
        { heading: 'Responsabilité', content: "L'app est fournie « telle quelle ». Le bmx comporte des risques : tu bmxs sous ta seule responsabilité." },
        { heading: 'Résiliation', content: "Tu peux supprimer ton compte à tout moment. Nous pouvons suspendre un compte en cas de manquement aux CGU." },
      ] },
      { id: 'cgv', title: '3. Conditions Générales de Vente', tocLabel: 'CGV', blocks: [
        { heading: 'Abonnement', content: 'bmx+ est un abonnement payant mensuel (upload HD, effets de montage, sans pub).' },
        { heading: 'Paiement', content: "Les paiements sont traités par Stripe ; sur mobile, par l'App Store / Google Play. Aucune donnée bancaire n'est stockée par bmx." },
        { heading: 'Durée & résiliation', content: "Sans engagement, résiliable à tout moment depuis l'app ou le store. L'accès reste actif jusqu'à la fin de la période payée." },
        { heading: 'Rétractation', content: "En activant immédiatement le service, tu renonces au délai de rétractation de 14 jours pour la période en cours." },
      ] },
      { id: 'privacy', title: '4. Politique de confidentialité', tocLabel: 'Confidentialité', blocks: [
        { heading: 'Données collectées', content: 'Compte (e-mail, pseudo), contenus publiés (parts, spots, messages) et données techniques minimales.' },
        { heading: 'Finalités', content: 'Fournir le service, sécuriser les comptes et gérer les abonnements.' },
        { heading: 'Base légale', content: "Exécution du contrat (CGU) et ton consentement pour les notifications." },
        { heading: 'Hébergement & conservation', content: 'Données hébergées dans l’UE, conservées tant que ton compte est actif, puis supprimées sur demande.' },
        { heading: 'Partage', content: 'Aucune revente. Prestataires limités : Stripe (paiement) et hébergeur. Aucun tracker publicitaire.' },
        { heading: 'Contact', content: 'Pour toute question : privacy@bmx.bike.' },
      ] },
      { id: 'cookies', title: '5. Politique de cookies', tocLabel: 'Cookies', blocks: [
        { content: 'bmx n’utilise que le stockage strictement nécessaire : session, préférence de langue et jeton de connexion.' },
        { content: 'Aucun cookie publicitaire, aucun traçage tiers.' },
      ] },
      { id: 'rights', title: '6. Tes droits RGPD', tocLabel: 'Droits RGPD', blocks: [
        { content: "Tu disposes des droits d'accès, de rectification, d'effacement, de portabilité et d'opposition sur tes données." },
        { content: 'Pour les exercer, écris à privacy@bmx.bike. Tu peux aussi saisir la CNIL.' },
      ] },
    ],
  },
  en: {
    title: 'Legal notice & GDPR',
    updated: 'Last updated: 2026',
    sections: [
      { id: 'mentions', title: '1. Legal notice', tocLabel: 'Legal notice', blocks: [
        { content: 'Publisher: bmx — Maxime Nathan Lestage, sole trader (France). Contact: hello@bmx.bike.' },
        { content: 'Hosting: static site on GitHub Pages (GitHub Inc.); API on Heroku (Salesforce), European Union region.' },
        { content: 'Intellectual property: the bmx brand, logo and editorial content are protected. Content posted by members remains their property.' },
      ] },
      { id: 'cgu', title: '2. Terms of Service', tocLabel: 'Terms', blocks: [
        { heading: 'Purpose', content: 'These terms govern access to and use of the bmx app.' },
        { heading: 'Account', content: 'Some features require an account. You are responsible for your credentials. Minimum age: 13.' },
        { heading: 'Conduct', content: "Respect others. Hateful, illegal or rights-infringing content is prohibited and may be removed." },
        { heading: 'Member content', content: 'You keep ownership of your parts, photos and spots. By posting them, you grant bmx a non-exclusive licence to display them in the app.' },
        { heading: 'Liability', content: 'The app is provided “as is”. BMX carries risks: you bmx at your own risk.' },
        { heading: 'Termination', content: 'You can delete your account at any time. We may suspend an account that breaches these terms.' },
      ] },
      { id: 'cgv', title: '3. Sales Terms', tocLabel: 'Sales terms', blocks: [
        { heading: 'Subscription', content: 'bmx+ is a paid monthly subscription (HD upload, editing effects, no ads).' },
        { heading: 'Payment', content: 'Payments are processed by Stripe; on mobile, by the App Store / Google Play. No card data is stored by bmx.' },
        { heading: 'Duration & cancellation', content: 'No commitment, cancellable at any time from the app or store. Access stays active until the end of the paid period.' },
        { heading: 'Withdrawal', content: 'By activating the service immediately, you waive the 14-day withdrawal period for the current period.' },
      ] },
      { id: 'privacy', title: '4. Privacy policy', tocLabel: 'Privacy', blocks: [
        { heading: 'Data collected', content: 'Account (email, username), posted content (parts, spots, messages) and minimal technical data.' },
        { heading: 'Purposes', content: 'Provide the service, secure accounts and manage subscriptions.' },
        { heading: 'Legal basis', content: 'Performance of the contract (terms) and your consent for notifications.' },
        { heading: 'Hosting & retention', content: 'Data hosted in the EU, kept while your account is active, then deleted on request.' },
        { heading: 'Sharing', content: 'No resale. Limited providers: Stripe (payment) and host. No advertising tracker.' },
        { heading: 'Contact', content: 'Any question: privacy@bmx.bike.' },
      ] },
      { id: 'cookies', title: '5. Cookie policy', tocLabel: 'Cookies', blocks: [
        { content: 'bmx only uses strictly necessary storage: session, language preference and login token.' },
        { content: 'No advertising cookie, no third-party tracking.' },
      ] },
      { id: 'rights', title: '6. Your GDPR rights', tocLabel: 'GDPR rights', blocks: [
        { content: 'You have rights of access, rectification, erasure, portability and objection over your data.' },
        { content: 'To exercise them, write to privacy@bmx.bike. You may also contact your data protection authority.' },
      ] },
    ],
  },
  es: {
    title: 'Aviso legal & RGPD',
    updated: 'Última actualización: 2026',
    sections: [
      { id: 'mentions', title: '1. Aviso legal', tocLabel: 'Aviso legal', blocks: [
        { content: 'Editor: bmx — Maxime Nathan Lestage, autónomo (Francia). Contacto: hello@bmx.bike.' },
        { content: 'Alojamiento: sitio estático en GitHub Pages (GitHub Inc.); API en Heroku (Salesforce), región Unión Europea.' },
        { content: 'Propiedad intelectual: la marca, el logo y el contenido editorial de bmx están protegidos. El contenido publicado por los miembros sigue siendo suyo.' },
      ] },
      { id: 'cgu', title: '2. Términos de uso', tocLabel: 'Términos', blocks: [
        { heading: 'Objeto', content: 'Estos términos regulan el acceso y uso de la app bmx.' },
        { heading: 'Cuenta', content: 'Algunas funciones requieren una cuenta. Eres responsable de tus credenciales. Edad mínima: 13 años.' },
        { heading: 'Conducta', content: 'Respeta a los demás. El contenido de odio, ilegal o que vulnere derechos está prohibido y puede ser retirado.' },
        { heading: 'Contenido de los miembros', content: 'Conservas la propiedad de tus parts, fotos y spots. Al publicarlos, concedes a bmx una licencia no exclusiva para mostrarlos en la app.' },
        { heading: 'Responsabilidad', content: 'La app se ofrece «tal cual». El bmx conlleva riesgos: patinas bajo tu responsabilidad.' },
        { heading: 'Resolución', content: 'Puedes eliminar tu cuenta en cualquier momento. Podemos suspender una cuenta que incumpla los términos.' },
      ] },
      { id: 'cgv', title: '3. Términos de venta', tocLabel: 'Términos de venta', blocks: [
        { heading: 'Suscripción', content: 'bmx+ es una suscripción mensual de pago (subida HD, efectos, sin anuncios).' },
        { heading: 'Pago', content: 'Los pagos los procesa Stripe; en móvil, la App Store / Google Play. bmx no almacena datos bancarios.' },
        { heading: 'Duración y cancelación', content: 'Sin compromiso, cancelable en cualquier momento desde la app o la store. El acceso sigue activo hasta el fin del periodo pagado.' },
        { heading: 'Desistimiento', content: 'Al activar el servicio de inmediato, renuncias al plazo de desistimiento de 14 días para el periodo en curso.' },
      ] },
      { id: 'privacy', title: '4. Política de privacidad', tocLabel: 'Privacidad', blocks: [
        { heading: 'Datos recogidos', content: 'Cuenta (email, usuario), contenido publicado (parts, spots, mensajes) y datos técnicos mínimos.' },
        { heading: 'Finalidades', content: 'Prestar el servicio, proteger las cuentas y gestionar las suscripciones.' },
        { heading: 'Base legal', content: 'Ejecución del contrato (términos) y tu consentimiento para las notificaciones.' },
        { heading: 'Alojamiento y conservación', content: 'Datos alojados en la UE, conservados mientras tu cuenta esté activa y luego eliminados a petición.' },
        { heading: 'Compartición', content: 'Sin reventa. Proveedores limitados: Stripe (pago) y alojamiento. Ningún rastreador publicitario.' },
        { heading: 'Contacto', content: 'Cualquier duda: privacy@bmx.bike.' },
      ] },
      { id: 'cookies', title: '5. Política de cookies', tocLabel: 'Cookies', blocks: [
        { content: 'bmx solo usa almacenamiento estrictamente necesario: sesión, preferencia de idioma y token de conexión.' },
        { content: 'Ninguna cookie publicitaria, ningún rastreo de terceros.' },
      ] },
      { id: 'rights', title: '6. Tus derechos RGPD', tocLabel: 'Derechos RGPD', blocks: [
        { content: 'Tienes derechos de acceso, rectificación, supresión, portabilidad y oposición sobre tus datos.' },
        { content: 'Para ejercerlos, escribe a privacy@bmx.bike. También puedes acudir a tu autoridad de protección de datos.' },
      ] },
    ],
  },
  de: {
    title: 'Impressum & DSGVO',
    updated: 'Zuletzt aktualisiert: 2026',
    sections: [
      { id: 'mentions', title: '1. Impressum', tocLabel: 'Impressum', blocks: [
        { content: 'Anbieter: bmx — Maxime Nathan Lestage, Einzelunternehmer (Frankreich). Kontakt: hello@bmx.bike.' },
        { content: 'Hosting: statische Seite auf GitHub Pages (GitHub Inc.); API auf Heroku (Salesforce), Region Europäische Union.' },
        { content: 'Geistiges Eigentum: Marke, Logo und redaktionelle Inhalte von bmx sind geschützt. Von Mitgliedern veröffentlichte Inhalte bleiben deren Eigentum.' },
      ] },
      { id: 'cgu', title: '2. Nutzungsbedingungen', tocLabel: 'AGB', blocks: [
        { heading: 'Zweck', content: 'Diese Bedingungen regeln den Zugang zur und die Nutzung der bmx-App.' },
        { heading: 'Konto', content: 'Einige Funktionen erfordern ein Konto. Du bist für deine Zugangsdaten verantwortlich. Mindestalter: 13 Jahre.' },
        { heading: 'Verhalten', content: 'Respektiere andere. Hetzerische, illegale oder rechtsverletzende Inhalte sind verboten und können entfernt werden.' },
        { heading: 'Mitglieder-Inhalte', content: 'Du behältst das Eigentum an deinen Parts, Fotos und Spots. Mit dem Posten gewährst du bmx eine nicht-exklusive Lizenz zur Anzeige in der App.' },
        { heading: 'Haftung', content: 'Die App wird „wie besehen“ bereitgestellt. BMX birgt Risiken: Du fährst auf eigene Gefahr.' },
        { heading: 'Kündigung', content: 'Du kannst dein Konto jederzeit löschen. Wir können ein Konto bei Verstößen sperren.' },
      ] },
      { id: 'cgv', title: '3. Verkaufsbedingungen', tocLabel: 'Verkauf', blocks: [
        { heading: 'Abonnement', content: 'bmx+ ist ein kostenpflichtiges Monatsabo (HD-Upload, Effekte, werbefrei).' },
        { heading: 'Zahlung', content: 'Zahlungen werden von Stripe abgewickelt; mobil über App Store / Google Play. bmx speichert keine Bankdaten.' },
        { heading: 'Laufzeit & Kündigung', content: 'Ohne Bindung, jederzeit über App oder Store kündbar. Der Zugang bleibt bis zum Ende des bezahlten Zeitraums aktiv.' },
        { heading: 'Widerruf', content: 'Mit der sofortigen Aktivierung des Dienstes verzichtest du für den laufenden Zeitraum auf das 14-tägige Widerrufsrecht.' },
      ] },
      { id: 'privacy', title: '4. Datenschutzerklärung', tocLabel: 'Datenschutz', blocks: [
        { heading: 'Erhobene Daten', content: 'Konto (E-Mail, Nutzername), veröffentlichte Inhalte (Parts, Spots, Nachrichten) und minimale technische Daten.' },
        { heading: 'Zwecke', content: 'Bereitstellung des Dienstes, Absicherung der Konten und Verwaltung der Abos.' },
        { heading: 'Rechtsgrundlage', content: 'Vertragserfüllung (AGB) und deine Einwilligung für Benachrichtigungen.' },
        { heading: 'Hosting & Aufbewahrung', content: 'Daten werden in der EU gehostet, solange dein Konto aktiv ist, und auf Anfrage gelöscht.' },
        { heading: 'Weitergabe', content: 'Kein Weiterverkauf. Begrenzte Dienstleister: Stripe (Zahlung) und Hoster. Kein Werbetracker.' },
        { heading: 'Kontakt', content: 'Bei Fragen: privacy@bmx.bike.' },
      ] },
      { id: 'cookies', title: '5. Cookie-Richtlinie', tocLabel: 'Cookies', blocks: [
        { content: 'bmx nutzt nur unbedingt erforderlichen Speicher: Sitzung, Sprachpräferenz und Login-Token.' },
        { content: 'Kein Werbe-Cookie, kein Tracking durch Dritte.' },
      ] },
      { id: 'rights', title: '6. Deine DSGVO-Rechte', tocLabel: 'DSGVO-Rechte', blocks: [
        { content: 'Du hast Rechte auf Auskunft, Berichtigung, Löschung, Übertragbarkeit und Widerspruch bezüglich deiner Daten.' },
        { content: 'Zur Ausübung schreibe an privacy@bmx.bike. Du kannst dich auch an deine Datenschutzbehörde wenden.' },
      ] },
    ],
  },
  pt: {
    title: 'Aviso legal & RGPD',
    updated: 'Última atualização: 2026',
    sections: [
      { id: 'mentions', title: '1. Aviso legal', tocLabel: 'Aviso legal', blocks: [
        { content: 'Editor: bmx — Maxime Nathan Lestage, empresário em nome individual (França). Contacto: hello@bmx.bike.' },
        { content: 'Alojamento: site estático no GitHub Pages (GitHub Inc.); API no Heroku (Salesforce), região União Europeia.' },
        { content: 'Propriedade intelectual: a marca, o logo e o conteúdo editorial da bmx estão protegidos. O conteúdo publicado pelos membros continua a ser deles.' },
      ] },
      { id: 'cgu', title: '2. Termos de Utilização', tocLabel: 'Termos', blocks: [
        { heading: 'Objeto', content: 'Estes termos regem o acesso e o uso da app bmx.' },
        { heading: 'Conta', content: 'Algumas funções exigem uma conta. És responsável pelas tuas credenciais. Idade mínima: 13 anos.' },
        { heading: 'Conduta', content: 'Respeita os outros. Conteúdo de ódio, ilegal ou que viole direitos é proibido e pode ser removido.' },
        { heading: 'Conteúdo dos membros', content: 'Mantens a propriedade das tuas parts, fotos e spots. Ao publicá-los, concedes à bmx uma licença não exclusiva para os mostrar na app.' },
        { heading: 'Responsabilidade', content: 'A app é fornecida «tal como está». O bmx tem riscos: andas por tua conta e risco.' },
        { heading: 'Rescisão', content: 'Podes eliminar a tua conta a qualquer momento. Podemos suspender uma conta que viole os termos.' },
      ] },
      { id: 'cgv', title: '3. Termos de Venda', tocLabel: 'Termos de venda', blocks: [
        { heading: 'Subscrição', content: 'bmx+ é uma subscrição mensal paga (upload HD, efeitos, sem anúncios).' },
        { heading: 'Pagamento', content: 'Os pagamentos são processados pela Stripe; no telemóvel, pela App Store / Google Play. A bmx não armazena dados bancários.' },
        { heading: 'Duração e cancelamento', content: 'Sem compromisso, cancelável a qualquer momento na app ou na store. O acesso mantém-se até ao fim do período pago.' },
        { heading: 'Direito de retratação', content: 'Ao ativar o serviço de imediato, renuncias ao prazo de retratação de 14 dias para o período em curso.' },
      ] },
      { id: 'privacy', title: '4. Política de privacidade', tocLabel: 'Privacidade', blocks: [
        { heading: 'Dados recolhidos', content: 'Conta (email, nome de utilizador), conteúdo publicado (parts, spots, mensagens) e dados técnicos mínimos.' },
        { heading: 'Finalidades', content: 'Prestar o serviço, proteger as contas e gerir as subscrições.' },
        { heading: 'Base legal', content: 'Execução do contrato (termos) e o teu consentimento para notificações.' },
        { heading: 'Alojamento e conservação', content: 'Dados alojados na UE, conservados enquanto a tua conta estiver ativa e depois eliminados a pedido.' },
        { heading: 'Partilha', content: 'Sem revenda. Fornecedores limitados: Stripe (pagamento) e alojamento. Nenhum rastreador publicitário.' },
        { heading: 'Contacto', content: 'Qualquer questão: privacy@bmx.bike.' },
      ] },
      { id: 'cookies', title: '5. Política de cookies', tocLabel: 'Cookies', blocks: [
        { content: 'A bmx só usa armazenamento estritamente necessário: sessão, preferência de idioma e token de sessão.' },
        { content: 'Nenhum cookie publicitário, nenhum rastreio de terceiros.' },
      ] },
      { id: 'rights', title: '6. Os teus direitos RGPD', tocLabel: 'Direitos RGPD', blocks: [
        { content: 'Tens direitos de acesso, retificação, apagamento, portabilidade e oposição sobre os teus dados.' },
        { content: 'Para os exercer, escreve para privacy@bmx.bike. Também podes contactar a autoridade de proteção de dados.' },
      ] },
    ],
  },
  zh: {
    title: '法律声明 & GDPR',
    updated: '最后更新：2026 年',
    sections: [
      { id: 'mentions', title: '1. 法律声明', tocLabel: '法律声明', blocks: [
        { content: '运营方：bmx —— Maxime Nathan Lestage，个体经营者（法国）。联系方式：hello@bmx.bike。' },
        { content: '托管：静态网站托管于 GitHub Pages（GitHub Inc.）；API 托管于 Heroku（Salesforce），欧盟区域。' },
        { content: '知识产权：bmx 的商标、logo 和编辑内容受保护。成员发布的内容仍归其所有。' },
      ] },
      { id: 'cgu', title: '2. 用户条款', tocLabel: '用户条款', blocks: [
        { heading: '目的', content: '本条款规范 bmx 应用的访问与使用。' },
        { heading: '账号', content: '部分功能需要账号。你需对自己的凭据负责。最低年龄：13 岁。' },
        { heading: '行为准则', content: '尊重他人。仇恨、违法或侵犯他人权利的内容被禁止，并可能被删除。' },
        { heading: '成员内容', content: '你保留对自己片段、照片和点位的所有权。发布即授予 bmx 在应用内展示它们的非独占许可。' },
        { heading: '责任', content: '应用按“现状”提供。BMX存在风险：你需自行承担骑行的责任。' },
        { heading: '终止', content: '你可随时删除账号。若违反条款，我们可暂停账号。' },
      ] },
      { id: 'cgv', title: '3. 销售条款', tocLabel: '销售条款', blocks: [
        { heading: '订阅', content: 'bmx+ 是按月付费订阅（高清上传、剪辑特效、无广告）。' },
        { heading: '支付', content: '支付由 Stripe 处理；在移动端由 App Store / Google Play 处理。bmx 不存储银行卡数据。' },
        { heading: '期限与取消', content: '无约束，可随时在应用或商店取消。访问权限保留至已付费周期结束。' },
        { heading: '撤销权', content: '立即启用服务即表示你放弃当前周期的 14 天撤销期。' },
      ] },
      { id: 'privacy', title: '4. 隐私政策', tocLabel: '隐私', blocks: [
        { heading: '收集的数据', content: '账号（邮箱、用户名）、发布的内容（片段、点位、消息）及最少的技术数据。' },
        { heading: '目的', content: '提供服务、保护账号安全和管理订阅。' },
        { heading: '法律依据', content: '履行合同（条款）以及你对通知的同意。' },
        { heading: '托管与保留', content: '数据托管于欧盟，在你的账号活跃期间保留，并可应请求删除。' },
        { heading: '共享', content: '不转售。有限的服务商：Stripe（支付）和托管商。无广告追踪器。' },
        { heading: '联系', content: '任何问题：privacy@bmx.bike。' },
      ] },
      { id: 'cookies', title: '5. Cookie 政策', tocLabel: 'Cookie', blocks: [
        { content: 'bmx 仅使用严格必要的存储：会话、语言偏好和登录令牌。' },
        { content: '无广告 cookie，无第三方追踪。' },
      ] },
      { id: 'rights', title: '6. 你的 GDPR 权利', tocLabel: 'GDPR 权利', blocks: [
        { content: '你对自己的数据享有访问、更正、删除、可携带和反对的权利。' },
        { content: '如需行使，请写信至 privacy@bmx.bike。你也可联系当地数据保护机构。' },
      ] },
    ],
  },
  ja: {
    title: '法的事項 & GDPR',
    updated: '最終更新：2026年',
    sections: [
      { id: 'mentions', title: '1. 法的事項', tocLabel: '法的事項', blocks: [
        { content: '運営者：bmx —— Maxime Nathan Lestage（フランス・個人事業主）。連絡先：hello@bmx.bike。' },
        { content: 'ホスティング：静的サイトは GitHub Pages（GitHub Inc.）、API は Heroku（Salesforce）の欧州連合リージョン。' },
        { content: '知的財産：bmx の商標、ロゴ、編集コンテンツは保護されています。メンバーが投稿したコンテンツはその所有物のままです。' },
      ] },
      { id: 'cgu', title: '2. 利用規約', tocLabel: '利用規約', blocks: [
        { heading: '目的', content: '本規約は bmx アプリへのアクセスと利用を定めます。' },
        { heading: 'アカウント', content: '一部の機能にはアカウントが必要です。認証情報の管理はあなたの責任です。最低年齢：13歳。' },
        { heading: '行動規範', content: '他者を尊重してください。差別的・違法・権利侵害のコンテンツは禁止され、削除されることがあります。' },
        { heading: 'メンバーのコンテンツ', content: 'パート、写真、スポットの所有権はあなたに残ります。投稿により、アプリ内で表示するための非独占的ライセンスを bmx に付与します。' },
        { heading: '責任', content: 'アプリは「現状のまま」提供されます。BMXには危険が伴います。滑走は自己責任です。' },
        { heading: '解約', content: 'いつでもアカウントを削除できます。規約違反の場合、アカウントを停止することがあります。' },
      ] },
      { id: 'cgv', title: '3. 販売条件', tocLabel: '販売条件', blocks: [
        { heading: 'サブスクリプション', content: 'bmx+ は有料の月額サブスク（HDアップロード、編集エフェクト、広告なし）です。' },
        { heading: '支払い', content: '支払いは Stripe が処理します。モバイルでは App Store / Google Play 経由。bmx はカード情報を保存しません。' },
        { heading: '期間と解約', content: '拘束なし、アプリまたはストアからいつでも解約可能。支払い済み期間の終了まで利用できます。' },
        { heading: 'クーリングオフ', content: 'サービスを即時に有効化することで、当該期間における14日間の撤回権を放棄します。' },
      ] },
      { id: 'privacy', title: '4. プライバシーポリシー', tocLabel: 'プライバシー', blocks: [
        { heading: '収集するデータ', content: 'アカウント（メール、ユーザー名）、投稿コンテンツ（パート、スポット、メッセージ）、最小限の技術データ。' },
        { heading: '目的', content: 'サービスの提供、アカウントの保護、サブスクの管理。' },
        { heading: '法的根拠', content: '契約（規約）の履行と、通知に対するあなたの同意。' },
        { heading: 'ホスティングと保持', content: 'データは EU 内でホストされ、アカウントが有効な間保持され、リクエストに応じて削除されます。' },
        { heading: '共有', content: '転売なし。限定的な事業者：Stripe（支払い）とホスティング。広告トラッカーなし。' },
        { heading: '連絡先', content: 'ご質問は privacy@bmx.bike まで。' },
      ] },
      { id: 'cookies', title: '5. Cookie ポリシー', tocLabel: 'Cookie', blocks: [
        { content: 'bmx は厳密に必要なストレージのみを使用します：セッション、言語設定、ログイントークン。' },
        { content: '広告 Cookie なし、第三者トラッキングなし。' },
      ] },
      { id: 'rights', title: '6. あなたの GDPR 権利', tocLabel: 'GDPR 権利', blocks: [
        { content: 'あなたは自分のデータに対しアクセス、訂正、消去、ポータビリティ、異議の権利を有します。' },
        { content: '行使するには privacy@bmx.bike までご連絡ください。データ保護当局に申し立てることもできます。' },
      ] },
    ],
  },
}

const { t, lang } = useI18n()
const data = computed(() => LEGAL[lang.value])

// Défilement vers la sous-section demandée (#page=legal:cgu…).
let timeoutId: ReturnType<typeof setTimeout> | undefined
function clear() {
  if (timeoutId !== undefined) {
    clearTimeout(timeoutId)
    timeoutId = undefined
  }
}
function scrollToSection() {
  clear()
  if (!props.section) return
  const el = document.getElementById(props.section)
  if (el) {
    timeoutId = setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 60)
  }
}
onMounted(scrollToSection)
watch([() => props.section, lang], scrollToSection)
onUnmounted(clear)
</script>

<template>
  <main class="page">
    <a class="page__back" href="#top">{{ t('page.back') }}</a>
    <h1 class="page__title">{{ data.title }}</h1>
    <p class="page__sub">{{ data.updated }}</p>

    <nav class="page__toc" :aria-label="data.title">
      <a v-for="s in data.sections" :key="s.id" :href="`#page=legal:${s.id}`">{{ s.tocLabel }}</a>
    </nav>

    <section class="legal__section" :id="s.id" v-for="s in data.sections" :key="s.id">
      <h2>{{ s.title }}</h2>
      <div v-for="(b, i) in s.blocks" :key="i">
        <h3 v-if="b.heading">{{ b.heading }}</h3>
        <p class="page__p">{{ b.content }}</p>
      </div>
    </section>
  </main>
</template>
