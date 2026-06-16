// Enveloppe de la planche du héros : charge la 3D en lazy, gère le repli 2D
// (WebGL absent / chargement / prefers-reduced-motion), et pilote l'interaction
// (kickflip au survol/tap, permission gyroscope au premier geste).

import { Component, Suspense, lazy, useEffect, useRef, useState, type ReactNode } from 'react'
import { Deck } from './Deck'

const Deck3D = lazy(() => import('./Deck3D'))

class GLErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

/** Demande l'accès au gyroscope (iOS 13+) — nécessite un geste utilisateur. */
function requestGyro() {
  const D = window.DeviceOrientationEvent as unknown as {
    requestPermission?: () => Promise<string>
  }
  if (D && typeof D.requestPermission === 'function') {
    D.requestPermission().catch(() => {})
  }
}

export function HeroBoard() {
  const [reduced, setReduced] = useState(true)
  const [flip, setFlip] = useState(0)
  const gyroAsked = useRef(false)

  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(m.matches)
    const on = () => setReduced(m.matches)
    m.addEventListener?.('change', on)
    return () => m.removeEventListener?.('change', on)
  }, [])

  function kickflip() {
    if (!gyroAsked.current) {
      gyroAsked.current = true
      requestGyro()
    }
    setFlip((n) => n + 1)
  }

  const fallback = <Deck className="hero__deck" />

  return (
    <div
      className="hero__board"
      onPointerEnter={() => !reduced && kickflip()}
      onClick={() => !reduced && kickflip()}
    >
      {reduced ? (
        fallback
      ) : (
        <GLErrorBoundary fallback={fallback}>
          <Suspense fallback={fallback}>
            <Deck3D flip={flip} />
          </Suspense>
        </GLErrorBoundary>
      )}
    </div>
  )
}
