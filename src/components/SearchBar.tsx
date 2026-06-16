// Barre de recherche « intelligente » : interprète une phrase libre et émet
// la requête parsée au parent (filtrage local des spots/riders/vidéos).
import { useState } from 'react'
import { useI18n } from '../i18n'

export function SearchBar({ onSearch }: { onSearch: (raw: string) => void }) {
  const { t } = useI18n()
  const [value, setValue] = useState('')

  return (
    <form
      className="search"
      onSubmit={(e) => {
        e.preventDefault()
        onSearch(value)
      }}
    >
      <span className="search__ai" aria-hidden="true">✦</span>
      <input
        className="search__input"
        type="search"
        value={value}
        placeholder={t('search.placeholder')}
        onChange={(e) => {
          setValue(e.target.value)
          onSearch(e.target.value)
        }}
        aria-label={t('search.placeholder')}
      />
      <span className="search__badge">AI</span>
    </form>
  )
}
