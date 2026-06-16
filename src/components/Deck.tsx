/** BMX vu de profil, dessiné en SVG. Sert au héros et au logo. */
export function Deck({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 320 110"
      role="img"
      aria-label="Un BMX"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Planche */}
      <path
        d="M20 38 Q12 36 16 48 Q22 60 44 60 H276 Q298 60 304 48 Q308 36 300 38 Q286 50 264 50 H56 Q34 50 20 38 Z"
        fill="currentColor"
      />
      {/* Trucks */}
      <rect x="66" y="60" width="8" height="14" rx="3" fill="currentColor" />
      <rect x="246" y="60" width="8" height="14" rx="3" fill="currentColor" />
      {/* Roues */}
      <circle cx="70" cy="86" r="15" fill="currentColor" />
      <circle cx="250" cy="86" r="15" fill="currentColor" />
      <circle cx="70" cy="86" r="5" fill="var(--bg, #17191c)" />
      <circle cx="250" cy="86" r="5" fill="var(--bg, #17191c)" />
    </svg>
  )
}
