// Planche de bmx 3D du héros (React Three Fiber). 100% procédural : aucun
// asset externe. Deck popsicle réaliste (nose/tail relevés), grip noir, plis de
// bois (7-plis) sur la tranche, graphique « panda » rouge/blanc sous la planche
// (hommage dessiné au canvas), vrais trucks. Parallaxe (souris + gyro), kickflip
// au survol/tap, matériaux enrichis (RoomEnvironment généré, grain sur le grip).

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import logoUrl from '../assets/logo-bmx.png'

const GRIP = '#15171a'
const METAL = '#d7dadf'
const WHEEL = '#efeae0'
const BEARING = '#3a3d42'
const ACCENT = '#e6d3a7'
const FLIP_DURATION = 0.75

const DECK_L = 3.0
const DECK_W = 0.82
const DECK_T = 0.07
const KICK_R = DECK_W / 2
const KICK_HX = DECK_L / 2 - KICK_R

// --- Matériaux trucks (partagés) ---
const matMetal = new THREE.MeshStandardMaterial({ color: METAL, metalness: 1.0, roughness: 0.16, envMapIntensity: 1.7 })
const matSteel = new THREE.MeshStandardMaterial({ color: '#2a2d33', metalness: 0.85, roughness: 0.35 })
const matZinc = new THREE.MeshStandardMaterial({ color: '#c6c9cf', metalness: 0.9, roughness: 0.32, envMapIntensity: 1.2 })
const matBushing = new THREE.MeshStandardMaterial({ color: '#1f9aa0', metalness: 0.05, roughness: 0.5 })
const matWheel = new THREE.MeshStandardMaterial({ color: WHEEL, roughness: 0.4, metalness: 0.05, envMapIntensity: 0.5 })
const matBearing = new THREE.MeshStandardMaterial({ color: BEARING, metalness: 0.9, roughness: 0.3 })

function easeInOut(p: number) {
  return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2
}

function deckShape() {
  const s = new THREE.Shape()
  s.moveTo(-KICK_HX, -KICK_R)
  s.lineTo(KICK_HX, -KICK_R)
  s.absarc(KICK_HX, 0, KICK_R, -Math.PI / 2, Math.PI / 2, false)
  s.lineTo(-KICK_HX, KICK_R)
  s.absarc(-KICK_HX, 0, KICK_R, Math.PI / 2, Math.PI * 1.5, false)
  return s
}

/** Relève nose et tail (déformation des vertices au-delà du seuil). */
function applyKick(geo: THREE.BufferGeometry) {
  const kickStart = KICK_HX - 0.12
  const kickLen = DECK_L / 2 - kickStart
  const maxAngle = 0.5
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const ax = Math.abs(x)
    if (ax > kickStart) {
      const sign = Math.sign(x)
      const d = (ax - kickStart) / kickLen
      const ang = d * maxAngle * sign
      const px = sign * kickStart
      const dx = x - px
      const ca = Math.cos(ang)
      const sa = Math.sin(ang)
      pos.setX(i, px + dx * ca - y * sa)
      pos.setY(i, y * ca + dx * sa)
    }
  }
  geo.computeVertexNormals()
}

function buildDeck() {
  const geo = new THREE.ExtrudeGeometry(deckShape(), {
    depth: DECK_T,
    bevelEnabled: true,
    bevelThickness: 0.014,
    bevelSize: 0.014,
    bevelSegments: 2,
    curveSegments: 40,
    steps: 1,
  })
  geo.center()
  geo.rotateX(-Math.PI / 2)
  applyKick(geo)
  return geo
}

/** Décalque plat épousant le dessous (UV normalisées pour le graphique). */
function buildGraphic() {
  const geo = new THREE.ShapeGeometry(deckShape(), 40)
  const pos = geo.attributes.position
  const uv = geo.attributes.uv
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, (pos.getX(i) + DECK_L / 2) / DECK_L, (pos.getY(i) + DECK_W / 2) / DECK_W)
  }
  geo.rotateX(-Math.PI / 2)
  applyKick(geo)
  geo.scale(0.96, 1, 0.95)
  geo.translate(0, -DECK_T / 2 - 0.004, 0)
  return geo
}

function ProceduralEnv() {
  const { gl, scene } = useThree()
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04)
    scene.environment = envRT.texture
    return () => {
      envRT.texture.dispose()
      pmrem.dispose()
      scene.environment = null
    }
  }, [gl, scene])
  return null
}

function useGrainTexture() {
  return useMemo(() => {
    // Grain de pegs : bruit haute fréquence très contrasté (papier de verre).
    const size = 256
    const data = new Uint8Array(size * size * 4)
    for (let i = 0; i < size * size; i++) {
      // Distribution piquée → grains saillants nets pour un relief marqué.
      const r = Math.random()
      const v = r * r > 0.55 ? 235 : 25 + Math.floor(Math.random() * 50)
      data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = v
      data[i * 4 + 3] = 255
    }
    const tex = new THREE.DataTexture(data, size, size)
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(22, 7)
    tex.anisotropy = 4
    tex.needsUpdate = true
    return tex
  }, [])
}

/** Texture de plis de bois (7-plis) pour la tranche. */
function usePlyTexture() {
  return useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 4
    c.height = 64
    const g = c.getContext('2d')!
    const tones = ['#d8b27a', '#c2924f', '#dcb780', '#bd8c4c', '#d3a86d', '#c89a5c', '#dab47c']
    const bh = c.height / tones.length
    tones.forEach((t, i) => {
      g.fillStyle = t
      g.fillRect(0, i * bh, c.width, bh + 1)
    })
    const tex = new THREE.CanvasTexture(c)
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(40, 1)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [])
}

/** Graphique du dessous : emblème bmx (crème) centré sur fond de marque. */
function useGraphicTexture() {
  return useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 1280
    c.height = 380
    const g = c.getContext('2d')!
    // Fond transparent : seul l'emblème est dessiné (le bleu nuit vient du deck).

    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    // miroir horizontal : lisible depuis le dessous (face arrière du décalque).
    tex.wrapS = THREE.RepeatWrapping
    tex.center.set(0.5, 0.5)
    tex.repeat.x = -1

    // L'emblème (PNG crème) est dessiné une fois l'image chargée.
    const img = new Image()
    img.onload = () => {
      const h = c.height * 0.92
      const w = (img.width / img.height) * h
      g.drawImage(img, (c.width - w) / 2, (c.height - h) / 2, w, h)
      tex.needsUpdate = true
    }
    img.src = logoUrl
    return tex
  }, [])
}

function Truck({ x }: { x: number }) {
  const inward = x > 0 ? -1 : 1
  const wheelZ = DECK_W / 2 + 0.13
  const axleY = -0.2
  const hangerX = inward * 0.02

  return (
    <group position={[x, -DECK_T / 2 - 0.01, 0]}>
      <mesh castShadow position={[0, -0.015, 0]} material={matMetal}>
        <boxGeometry args={[0.34, 0.045, 0.52]} />
      </mesh>
      {[
        [0.12, 0.2],
        [0.12, -0.2],
        [-0.12, 0.2],
        [-0.12, -0.2],
      ].map(([bx, bz], i) => (
        <mesh key={i} position={[bx, 0.01, bz]} material={matZinc}>
          <cylinderGeometry args={[0.022, 0.022, 0.025, 6]} />
        </mesh>
      ))}
      {/* Yoke arrondi (logement du kingpin) */}
      <mesh castShadow position={[hangerX, -0.13, 0]} scale={[1.0, 0.78, 1.15]} material={matMetal}>
        <sphereGeometry args={[0.12, 22, 16]} />
      </mesh>
      <mesh castShadow position={[hangerX, axleY, 0.27]} rotation={[Math.PI / 2, 0, 0]} material={matMetal}>
        <cylinderGeometry args={[0.035, 0.092, 0.42, 18]} />
      </mesh>
      <mesh castShadow position={[hangerX, axleY, -0.27]} rotation={[-Math.PI / 2, 0, 0]} material={matMetal}>
        <cylinderGeometry args={[0.035, 0.092, 0.42, 18]} />
      </mesh>
      <mesh castShadow position={[inward * 0.12, -0.085, 0]} rotation={[0, 0, inward * 0.9]} material={matMetal}>
        <cylinderGeometry args={[0.05, 0.07, 0.12, 12]} />
      </mesh>
      <group position={[inward * 0.09, -0.1, 0]} rotation={[0, 0, inward * 0.7]}>
        {/* Kingpin (acier) */}
        <mesh material={matSteel}>
          <cylinderGeometry args={[0.016, 0.016, 0.26, 10]} />
        </mesh>
        {/* Bushings turquoise (haut + bas) */}
        <mesh position={[0, 0.05, 0]} material={matBushing}>
          <cylinderGeometry args={[0.04, 0.072, 0.055, 18]} />
        </mesh>
        <mesh position={[0, -0.05, 0]} material={matBushing}>
          <cylinderGeometry args={[0.072, 0.04, 0.055, 18]} />
        </mesh>
        {/* Rondelle + écrou zingués */}
        <mesh position={[0, 0.085, 0]} material={matZinc}>
          <cylinderGeometry args={[0.05, 0.05, 0.012, 18]} />
        </mesh>
        <mesh position={[0, 0.108, 0]} material={matZinc}>
          <cylinderGeometry args={[0.034, 0.034, 0.03, 6]} />
        </mesh>
      </group>
      <mesh position={[hangerX, axleY, 0]} rotation={[Math.PI / 2, 0, 0]} material={matSteel}>
        <cylinderGeometry args={[0.02, 0.02, DECK_W + 0.62, 12]} />
      </mesh>
      {[wheelZ, -wheelZ].map((zz) => (
        <group key={zz} position={[hangerX, axleY, zz]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh castShadow material={matWheel}>
            <cylinderGeometry args={[0.17, 0.17, 0.16, 28]} />
          </mesh>
          <mesh material={matBearing}>
            <cylinderGeometry args={[0.06, 0.06, 0.165, 16]} />
          </mesh>
          <mesh position={[0, zz > 0 ? 0.092 : -0.092, 0]} material={matZinc}>
            <cylinderGeometry args={[0.032, 0.032, 0.03, 6]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function Board({ flip }: { flip: number }) {
  const outer = useRef<THREE.Group>(null)
  const flipGroup = useRef<THREE.Group>(null)
  const grain = useGrainTexture()
  const ply = usePlyTexture()
  const graphicTex = useGraphicTexture()
  const deckGeo = useMemo(() => buildDeck(), [])
  const graphicGeo = useMemo(() => buildGraphic(), [])
  const gripGeo = useMemo(() => {
    const g = deckGeo.clone()
    g.scale(0.99, 1, 0.92)
    g.translate(0, DECK_T / 2 + 0.006, 0)
    return g
  }, [deckGeo])

  // Matériaux du deck : tranche en plis de bois, faces en bois lisse.
  const deckMats = useMemo(() => {
    // Dessous/dessus = bleu nuit de marque (le dessus est masqué par le grip).
    const cap = new THREE.MeshStandardMaterial({ color: '#1b2a4d', roughness: 0.42, metalness: 0.05, envMapIntensity: 0.45 })
    const side = new THREE.MeshStandardMaterial({ color: '#d8b27a', roughness: 0.55, metalness: 0.03, envMapIntensity: 0.3, map: ply })
    return [cap, side]
  }, [ply])

  const target = useRef({ x: 0, y: 0 })
  const smooth = useRef({ x: 0, y: 0 })
  const anim = useRef({ active: false, t: 0 })

  useEffect(() => {
    const onMouse = (e: MouseEvent) => {
      target.current.x = (e.clientX / window.innerWidth) * 2 - 1
      target.current.y = (e.clientY / window.innerHeight) * 2 - 1
    }
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return
      target.current.x = Math.max(-1, Math.min(1, e.gamma / 35))
      target.current.y = Math.max(-1, Math.min(1, (e.beta - 45) / 35))
    }
    window.addEventListener('mousemove', onMouse, { passive: true })
    window.addEventListener('deviceorientation', onOrient, { passive: true })
    return () => {
      window.removeEventListener('mousemove', onMouse)
      window.removeEventListener('deviceorientation', onOrient)
    }
  }, [])

  useEffect(() => {
    if (flip > 0 && !anim.current.active) {
      anim.current.active = true
      anim.current.t = 0
    }
  }, [flip])

  useFrame((state, delta) => {
    const o = outer.current
    const f = flipGroup.current
    if (!o || !f) return
    const t = state.clock.elapsedTime
    smooth.current.x += (target.current.x - smooth.current.x) * Math.min(1, delta * 4)
    smooth.current.y += (target.current.y - smooth.current.y) * Math.min(1, delta * 4)
    // Roulis lent : montre tour à tour le dessus (grip) et le dessous (logo),
    // chacun bien à plat. Léger lacet 3/4 + parallaxe.
    // Dessous (logo) face caméra par défaut, léger tangage/lacet + parallaxe.
    // Orientation accentuée au mouvement (souris / gyroscope).
    o.rotation.x = -1.5 + Math.sin(t * 0.5) * 0.14 + smooth.current.y * 0.42
    o.rotation.y = 0.32 + Math.sin(t * 0.33) * 0.24 + smooth.current.x * 0.7
    o.rotation.z = smooth.current.x * 0.12

    let hop = 0
    if (anim.current.active) {
      anim.current.t += delta
      const p = Math.min(anim.current.t / FLIP_DURATION, 1)
      f.rotation.x = easeInOut(p) * Math.PI * 2
      hop = Math.sin(p * Math.PI) * 0.45
      if (p >= 1) {
        anim.current.active = false
        f.rotation.x = 0
      }
    }
    o.position.y = Math.sin(t * 1.1) * 0.06 + hop
  })

  return (
    <group ref={outer} rotation={[-1.5, 0.32, 0]} scale={1.05}>
      <group ref={flipGroup}>
        {/* Deck : faces bois + tranche 7-plis */}
        <mesh geometry={deckGeo} material={deckMats} castShadow />
        {/* Emblème sous la planche (cutout sur le bleu nuit du deck) */}
        <mesh geometry={graphicGeo}>
          <meshStandardMaterial
            map={graphicTex}
            transparent
            alphaTest={0.35}
            depthWrite={false}
            roughness={0.4}
            metalness={0.05}
            envMapIntensity={0.4}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* Grip tape noir : relief 3D marqué (papier de verre) */}
        <mesh geometry={gripGeo}>
          <meshStandardMaterial
            color={GRIP}
            roughness={0.95}
            roughnessMap={grain}
            bumpMap={grain}
            bumpScale={0.06}
            metalness={0.15}
            envMapIntensity={0.25}
          />
        </mesh>
        <Truck x={DECK_L / 2 - 0.62} />
        <Truck x={-(DECK_L / 2 - 0.62)} />
      </group>
    </group>
  )
}

export default function Deck3D({ flip = 0 }: { flip?: number }) {
  return (
    <Canvas
      style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
      dpr={[1, 1.8]}
      shadows
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ position: [0, 0.9, 5.4], fov: 36 }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.05
      }}
    >
      <ProceduralEnv />
      <ambientLight intensity={0.4} />
      <directionalLight position={[4, 6, 3]} intensity={1.2} color="#fff7e6" castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[-4, 1, -2]} intensity={0.4} color={ACCENT} />
      <Board flip={flip} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.62, 0]} receiveShadow>
        <planeGeometry args={[14, 14]} />
        <shadowMaterial transparent opacity={0.24} />
      </mesh>
    </Canvas>
  )
}
