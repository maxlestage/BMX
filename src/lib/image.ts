// Redimensionnement d'image côté client (canvas) : on réduit chaque photo à une
// taille raisonnable avant upload pour qu'elle prenne le moins de place possible.

const MAX_EDGE = 1280 // bord max (px)
const QUALITY = 0.82 // qualité JPEG/WebP

/** Charge un fichier image, le redimensionne, renvoie un File compressé. */
export async function resizeImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file
  const bitmap = await loadBitmap(file)
  const { width, height } = bitmap
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height))
  const w = Math.round(width * scale)
  const h = Math.round(height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0, w, h)
  if ('close' in bitmap) (bitmap as ImageBitmap).close()

  // WebP si supporté (plus léger), sinon JPEG.
  const type = canvas.toDataURL('image/webp').startsWith('data:image/webp')
    ? 'image/webp'
    : 'image/jpeg'
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, type, QUALITY))
  if (!blob) return file
  const ext = type === 'image/webp' ? 'webp' : 'jpg'
  return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.' + ext, { type })
}

function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    return createImageBitmap(file)
  }
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}
