import './pages.css'
import { useI18n, type Lang } from '../../i18n'

type Card = { title: string; text: string }
type Content = { title: string; subtitle: string; cards: Card[] }

const ABOUT: Record<Lang, Content> = {
  fr: {
    title: 'À propos',
    subtitle: "bmx, c'est le bmx sans compétition ni ego — un crew où chaque ligne, chaque chute et chaque spot comptent.",
    cards: [
      { title: 'Notre mission', text: "Célébrer le bmx pour ce qu'il est : une culture, une communauté, une liberté. Pas de classement, pas de pression — juste l'envie de rouler." },
      { title: 'Comment ça marche', text: 'Poste tes parts, balance tes spots sur la carte, vote pour tes riders préférés et discute avec le crew. Le tout, gratuitement.' },
      { title: 'La communauté', text: "Pas d'algorithme, pas de likes qui dictent ta valeur. Juste des riders qui partagent ce qu'ils aiment, partout dans le monde." },
      { title: 'Sans pression', text: "Ici on applaudit la tentative autant que le trick réussi. Roule à ton rythme, progresse pour toi." },
    ],
  },
  en: {
    title: 'About',
    subtitle: 'bmx is BMX without competition or ego — a crew where every line, every fall and every spot counts.',
    cards: [
      { title: 'Our mission', text: 'Celebrate BMX for what it is: a culture, a community, a freedom. No ranking, no pressure — just the urge to ride.' },
      { title: 'How it works', text: 'Post your parts, drop your spots on the map, vote for your favourite riders and chat with the crew. All for free.' },
      { title: 'The community', text: 'No algorithm, no likes deciding your worth. Just riders sharing what they love, all over the world.' },
      { title: 'No pressure', text: 'Here we cheer the attempt as much as the landing. Ride at your own pace, progress for yourself.' },
    ],
  },
  es: {
    title: 'Acerca de',
    subtitle: 'bmx es bmx sin competición ni ego — un crew donde cada línea, cada caída y cada spot cuentan.',
    cards: [
      { title: 'Nuestra misión', text: 'Celebrar el bmx por lo que es: una cultura, una comunidad, una libertad. Sin ranking, sin presión — solo las ganas de rodar.' },
      { title: 'Cómo funciona', text: 'Publica tus parts, marca tus spots en el mapa, vota por tus riders favoritos y habla con el crew. Todo gratis.' },
      { title: 'La comunidad', text: 'Sin algoritmo, sin likes que decidan tu valor. Solo riders compartiendo lo que aman, por todo el mundo.' },
      { title: 'Sin presión', text: 'Aquí aplaudimos el intento tanto como el truco logrado. Rueda a tu ritmo, progresa para ti.' },
    ],
  },
  de: {
    title: 'Über uns',
    subtitle: 'bmx ist BMX ohne Wettbewerb oder Ego — eine Crew, in der jede Line, jeder Sturz und jeder Spot zählt.',
    cards: [
      { title: 'Unsere Mission', text: 'BMX feiern, wie es ist: eine Kultur, eine Community, eine Freiheit. Kein Ranking, kein Druck — nur die Lust zu fahren.' },
      { title: 'So funktioniert es', text: 'Poste deine Parts, setze deine Spots auf die Karte, wähle deine Lieblingsrider und chatte mit der Crew. Alles kostenlos.' },
      { title: 'Die Community', text: 'Kein Algorithmus, keine Likes, die deinen Wert bestimmen. Nur Rider, die teilen, was sie lieben — weltweit.' },
      { title: 'Kein Druck', text: 'Hier feiern wir den Versuch genauso wie den gestandenen Trick. Fahr in deinem Tempo, mach Fortschritte für dich.' },
    ],
  },
  pt: {
    title: 'Sobre',
    subtitle: 'bmx é bmx sem competição nem ego — um crew onde cada linha, cada queda e cada spot contam.',
    cards: [
      { title: 'A nossa missão', text: 'Celebrar o bmx pelo que é: uma cultura, uma comunidade, uma liberdade. Sem ranking, sem pressão — só a vontade de andar.' },
      { title: 'Como funciona', text: 'Publica as tuas parts, marca os teus spots no mapa, vota nos teus riders favoritos e fala com o crew. Tudo grátis.' },
      { title: 'A comunidade', text: 'Sem algoritmo, sem likes a decidir o teu valor. Só riders a partilhar o que amam, por todo o mundo.' },
      { title: 'Sem pressão', text: 'Aqui aplaudimos a tentativa tanto como o truque conseguido. Anda ao teu ritmo, evolui para ti.' },
    ],
  },
  zh: {
    title: '关于',
    subtitle: 'bmx 是没有竞争、没有自我的滑板——一个团队，每一条线路、每一次摔倒、每一个点位都重要。',
    cards: [
      { title: '我们的使命', text: '为滑板本来的样子喝彩：一种文化、一个社区、一种自由。没有排名，没有压力——只有滑行的冲动。' },
      { title: '如何运作', text: '发布你的片段，把点位标在地图上，为你喜欢的滑手投票，和团队聊天。全部免费。' },
      { title: '社区', text: '没有算法，没有用点赞衡量你的价值。只有滑手分享他们所热爱的，遍布世界。' },
      { title: '没有压力', text: '在这里，我们为尝试喝彩，不亚于为成功的招式。按你的节奏滑，为自己进步。' },
    ],
  },
  ja: {
    title: '概要',
    subtitle: 'bmx は競争もエゴもないスケート——すべてのライン、転倒、スポットが大切なクルー。',
    cards: [
      { title: '私たちの使命', text: 'スケートをありのままに称える：文化、コミュニティ、自由。ランキングもプレッシャーもなく、ただ滑りたい気持ちだけ。' },
      { title: '使い方', text: 'パートを投稿し、スポットを地図に置き、好きなスケーターに投票し、クルーと話そう。すべて無料。' },
      { title: 'コミュニティ', text: 'アルゴリズムもなく、価値を決めるいいねもない。ただ好きなものを分かち合うスケーターが世界中にいるだけ。' },
      { title: 'プレッシャーなし', text: 'ここでは成功したトリックと同じくらい挑戦を称える。自分のペースで滑り、自分のために上達しよう。' },
    ],
  },
}

export function About() {
  const { t, lang } = useI18n()
  const c = ABOUT[lang]
  return (
    <main className="page">
      <a className="page__back" href="#top">{t('page.back')}</a>
      <h1 className="page__title">{c.title}</h1>
      <p className="page__sub">{c.subtitle}</p>
      <div className="page__grid">
        {c.cards.map((card) => (
          <article className="card" key={card.title}>
            <h2 className="card__title">{card.title}</h2>
            <p className="card__text">{card.text}</p>
          </article>
        ))}
      </div>
    </main>
  )
}
