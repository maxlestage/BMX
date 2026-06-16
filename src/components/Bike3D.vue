<script setup lang="ts">
// Vélo BMX en 3D (three.js pur), profil latéral qui tourne lentement.
// Construit à partir de primitives : roues (tores + rayons), cadre, fourche,
// guidon, selle, pédales et pegs. Chargé à la demande (chunk séparé).
import { onMounted, onUnmounted, ref } from 'vue'
import * as THREE from 'three'

const host = ref<HTMLDivElement | null>(null)
let raf = 0
let renderer: THREE.WebGLRenderer | null = null
let ro: ResizeObserver | null = null

const TIRE = 0x16181c
const FRAME = 0xededec
const ACCENT = 0xff2e63
const STEEL = 0xb9bec6

const disposables: { dispose: () => void }[] = []
function track<T extends { dispose: () => void }>(o: T): T {
  disposables.push(o)
  return o
}

/** Tube cylindrique entre deux points. */
function tube(group: THREE.Group, a: THREE.Vector3, b: THREE.Vector3, r: number, color: number) {
  const dir = new THREE.Vector3().subVectors(b, a)
  const len = dir.length()
  const geo = track(new THREE.CylinderGeometry(r, r, len, 18))
  const mat = track(new THREE.MeshStandardMaterial({ color, metalness: 0.5, roughness: 0.35 }))
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.copy(a).addScaledVector(dir, 0.5)
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize())
  group.add(mesh)
}

function wheel(group: THREE.Group, cx: number, cy: number) {
  const R = 0.92
  const torusGeo = track(new THREE.TorusGeometry(R, 0.11, 16, 48))
  const tireMat = track(new THREE.MeshStandardMaterial({ color: TIRE, metalness: 0.2, roughness: 0.8 }))
  const tire = new THREE.Mesh(torusGeo, tireMat)
  tire.position.set(cx, cy, 0)
  group.add(tire)

  // Jante (accent) un peu en dedans.
  const rimGeo = track(new THREE.TorusGeometry(R - 0.13, 0.03, 12, 48))
  const rimMat = track(new THREE.MeshStandardMaterial({ color: ACCENT, metalness: 0.4, roughness: 0.4 }))
  const rim = new THREE.Mesh(rimGeo, rimMat)
  rim.position.set(cx, cy, 0)
  group.add(rim)

  // Moyeu.
  const hubGeo = track(new THREE.CylinderGeometry(0.08, 0.08, 0.22, 16))
  const hubMat = track(new THREE.MeshStandardMaterial({ color: STEEL, metalness: 0.8, roughness: 0.2 }))
  const hub = new THREE.Mesh(hubGeo, hubMat)
  hub.rotation.x = Math.PI / 2
  hub.position.set(cx, cy, 0)
  group.add(hub)

  // Rayons.
  const spokeMat = track(new THREE.MeshStandardMaterial({ color: STEEL, metalness: 0.7, roughness: 0.3 }))
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2
    const geo = track(new THREE.CylinderGeometry(0.012, 0.012, R - 0.14, 6))
    const s = new THREE.Mesh(geo, spokeMat)
    s.position.set(cx + (Math.cos(a) * (R - 0.14)) / 2, cy + (Math.sin(a) * (R - 0.14)) / 2, 0)
    s.rotation.z = a - Math.PI / 2
    group.add(s)
  }

  // Pegs (axe qui dépasse, détail BMX).
  const pegGeo = track(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 12))
  const pegMat = track(new THREE.MeshStandardMaterial({ color: ACCENT, metalness: 0.5, roughness: 0.4 }))
  const peg = new THREE.Mesh(pegGeo, pegMat)
  peg.rotation.x = Math.PI / 2
  peg.position.set(cx, cy, 0)
  group.add(peg)
}

function buildBike(): THREE.Group {
  const g = new THREE.Group()

  const rearHub = new THREE.Vector3(-1.5, -0.35, 0)
  const frontHub = new THREE.Vector3(1.5, -0.35, 0)
  const bb = new THREE.Vector3(0, -0.5, 0) // boîtier de pédalier
  const seat = new THREE.Vector3(-0.5, 0.7, 0)
  const head = new THREE.Vector3(1.05, 0.42, 0)
  const headTop = new THREE.Vector3(1.18, 0.66, 0)
  const barTop = new THREE.Vector3(1.18, 1.0, 0)

  wheel(g, rearHub.x, rearHub.y)
  wheel(g, frontHub.x, frontHub.y)

  // Triangle principal + arrière (cadre compact BMX).
  tube(g, bb, head, 0.07, FRAME) // down tube
  tube(g, bb, seat, 0.07, FRAME) // seat tube
  tube(g, seat, head, 0.06, FRAME) // top tube
  tube(g, bb, rearHub, 0.05, FRAME) // chain stay
  tube(g, seat, rearHub, 0.05, FRAME) // seat stay
  tube(g, head, frontHub, 0.05, STEEL) // fourche
  tube(g, head, headTop, 0.06, FRAME) // douille
  tube(g, headTop, barTop, 0.05, STEEL) // potence

  // Guidon (barre transversale vers le spectateur → effet 3D).
  const barGeo = track(new THREE.CylinderGeometry(0.045, 0.045, 0.8, 16))
  const barMat = track(new THREE.MeshStandardMaterial({ color: ACCENT, metalness: 0.5, roughness: 0.35 }))
  const bar = new THREE.Mesh(barGeo, barMat)
  bar.rotation.x = Math.PI / 2
  bar.position.copy(barTop)
  g.add(bar)

  // Selle.
  const seatGeo = track(new THREE.BoxGeometry(0.42, 0.09, 0.2))
  const seatMat = track(new THREE.MeshStandardMaterial({ color: TIRE, metalness: 0.2, roughness: 0.7 }))
  const seatMesh = new THREE.Mesh(seatGeo, seatMat)
  seatMesh.position.set(seat.x - 0.05, seat.y + 0.07, 0)
  g.add(seatMesh)

  // Pédalier + manivelle + pédale.
  const crankGeo = track(new THREE.BoxGeometry(0.07, 0.4, 0.05))
  const crankMat = track(new THREE.MeshStandardMaterial({ color: STEEL, metalness: 0.7, roughness: 0.3 }))
  const crank = new THREE.Mesh(crankGeo, crankMat)
  crank.position.copy(bb)
  crank.rotation.z = 0.5
  g.add(crank)
  const pedalGeo = track(new THREE.BoxGeometry(0.22, 0.05, 0.14))
  const pedalMat = track(new THREE.MeshStandardMaterial({ color: ACCENT, metalness: 0.4, roughness: 0.5 }))
  const pedal = new THREE.Mesh(pedalGeo, pedalMat)
  pedal.position.set(bb.x + 0.18, bb.y - 0.18, 0.12)
  g.add(pedal)

  g.rotation.x = -0.12
  return g
}

onMounted(() => {
  const el = host.value
  if (!el) return

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)
  camera.position.set(0, 0.2, 6.4)

  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  el.appendChild(renderer.domElement)

  scene.add(new THREE.AmbientLight(0xffffff, 0.7))
  const key = new THREE.DirectionalLight(0xffffff, 1.1)
  key.position.set(3, 4, 5)
  scene.add(key)
  const rim = new THREE.PointLight(ACCENT, 0.8, 30)
  rim.position.set(-4, -2, 3)
  scene.add(rim)

  const bike = buildBike()
  scene.add(bike)

  function resize() {
    if (!renderer || !el) return
    const w = el.clientWidth || 1
    const h = el.clientHeight || 1
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  resize()
  ro = new ResizeObserver(resize)
  ro.observe(el)

  const loop = () => {
    bike.rotation.y += 0.01
    renderer!.render(scene, camera)
    raf = requestAnimationFrame(loop)
  }
  loop()
})

onUnmounted(() => {
  cancelAnimationFrame(raf)
  ro?.disconnect()
  for (const d of disposables) d.dispose()
  renderer?.dispose()
  renderer?.domElement.remove()
  renderer = null
})
</script>

<template>
  <div class="bike3d" ref="host" aria-hidden="true" />
</template>

<style scoped>
.bike3d {
  width: 100%;
  height: 100%;
}
.bike3d :deep(canvas) {
  display: block;
  width: 100% !important;
  height: 100% !important;
}
</style>
