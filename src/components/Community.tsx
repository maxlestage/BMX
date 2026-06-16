// Section « La communauté » — feed des parts, carte des spots, sondages.
// Lecture libre pour tous ; les écritures demandent une connexion.

import { useState } from 'react'
import './community/community.css'
import { useI18n } from '../i18n'
import { Account } from './community/Account'
import { Parts } from './community/Parts'
import { Spots } from './community/Spots'
import { Polls } from './community/Polls'
import { Riders } from './community/Riders'
import { Videos } from './community/Videos'

type Tab = 'parts' | 'spots' | 'polls' | 'riders' | 'videos'

const TABS: { id: Tab; key: string }[] = [
  { id: 'parts', key: 'crew.tab.parts' },
  { id: 'videos', key: 'crew.tab.videos' },
  { id: 'riders', key: 'crew.tab.riders' },
  { id: 'spots', key: 'crew.tab.spots' },
  { id: 'polls', key: 'crew.tab.polls' },
]

export function Community() {
  const { t } = useI18n()
  const [tab, setTab] = useState<Tab>('parts')

  return (
    <section className="crew" id="crew">
      <div className="crew__inner">
        <header className="crew__head">
          <p className="crew__eyebrow">{t('crew.kicker')}</p>
          <h2 className="crew__title">{t('crew.title')}</h2>
          <p className="crew__sub">{t('crew.sub')}</p>
        </header>

        <Account />

        <nav className="crew__tabs" aria-label={t('crew.tabs')}>
          {TABS.map((tab2) => (
            <button
              key={tab2.id}
              className={tab === tab2.id ? 'is-active' : ''}
              onClick={() => setTab(tab2.id)}
            >
              {t(tab2.key)}
            </button>
          ))}
        </nav>

        <div className="crew__panel">
          {tab === 'parts' && <Parts />}
          {tab === 'videos' && <Videos />}
          {tab === 'riders' && <Riders />}
          {tab === 'spots' && <Spots />}
          {tab === 'polls' && <Polls />}
        </div>
      </div>
    </section>
  )
}
