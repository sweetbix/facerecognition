import { useCallback, useEffect, useRef, useState } from 'react'
import type { RecognizedFace } from '../api'
import { useRecognizerSocket } from '../hooks/useRecognizerSocket'

const JPEG_QUALITY = 0.72
const CAPTURE_MS = 200

function drawFaces(
  ctx: CanvasRenderingContext2D,
  faces: RecognizedFace[],
  vw: number,
  vh: number,
  cw: number,
  ch: number,
) {
  ctx.clearRect(0, 0, cw, ch)
  if (!vw || !vh || !faces.length) return
  const sx = cw / vw
  const sy = ch / vh

  for (const f of faces) {
    const [top, right, bottom, left] = f.box
    const x = left * sx
    const y = top * sy
    const w = (right - left) * sx
    const h = (bottom - top) * sy

    ctx.strokeStyle = f.name ? '#22c55e' : '#f97316'
    ctx.lineWidth = 2
    ctx.strokeRect(x, y, w, h)

    const label = f.name
      ? `${f.name} (${f.distance.toFixed(2)})`
      : `? (${f.distance.toFixed(2)})`
    ctx.font = '14px system-ui, sans-serif'
    const pad = 4
    const metrics = ctx.measureText(label)
    const tw = metrics.width + pad * 2
    const th = 22
    ctx.fillStyle = f.name ? 'rgba(34, 197, 94, 0.9)' : 'rgba(249, 115, 22, 0.9)'
    ctx.fillRect(x, Math.max(0, y - th), tw, th)
    ctx.fillStyle = '#0f172a'
    ctx.fillText(label, x + pad, Math.max(14, y - 6))
  }
}

export function WebcamRecognizer() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const captureRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const { faces, connected, lastError, sendFrame } = useRecognizerSocket()
  const [running, setRunning] = useState(false)
  const [camError, setCamError] = useState<string | null>(null)

  const syncOverlaySize = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    const w = video.clientWidth
    const h = video.clientHeight
    if (w && h && (canvas.width !== w || canvas.height !== h)) {
      canvas.width = w
      canvas.height = h
    }
  }, [])

  useEffect(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const paint = () => {
      syncOverlaySize()
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      drawFaces(
        ctx,
        faces,
        video.videoWidth,
        video.videoHeight,
        canvas.width,
        canvas.height,
      )
    }

    paint()
    video.addEventListener('loadedmetadata', paint)
    window.addEventListener('resize', paint)
    return () => {
      video.removeEventListener('loadedmetadata', paint)
      window.removeEventListener('resize', paint)
    }
  }, [faces, syncOverlaySize])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setRunning(false)
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  const startCamera = useCallback(async () => {
    setCamError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      const video = videoRef.current
      if (video) {
        video.srcObject = stream
        await video.play()
      }
      setRunning(true)
    } catch (e) {
      setCamError(e instanceof Error ? e.message : 'Could not open camera')
    }
  }, [])

  useEffect(() => {
    return () => stopCamera()
  }, [stopCamera])

  useEffect(() => {
    if (!running || !connected) return

    const cap = captureRef.current
    const video = videoRef.current
    if (!cap || !video) return

    const tick = () => {
      const vw = video.videoWidth
      const vh = video.videoHeight
      if (!vw || !vh) return
      cap.width = vw
      cap.height = vh
      const cctx = cap.getContext('2d')
      if (!cctx) return
      cctx.drawImage(video, 0, 0, vw, vh)
      const dataUrl = cap.toDataURL('image/jpeg', JPEG_QUALITY)
      sendFrame(dataUrl)
    }

    const id = window.setInterval(tick, CAPTURE_MS)
    return () => window.clearInterval(id)
  }, [running, connected, sendFrame])

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-6">
      <div className="flex flex-wrap items-center gap-3">
        {!running ? (
          <button
            type="button"
            onClick={startCamera}
            className="rounded-lg bg-violet-600 px-4 py-2 font-medium text-white hover:bg-violet-500"
          >
            Start camera
          </button>
        ) : (
          <button
            type="button"
            onClick={stopCamera}
            className="rounded-lg border border-slate-600 px-4 py-2 font-medium text-slate-200 hover:bg-slate-800"
          >
            Stop camera
          </button>
        )}
        <span
          className={`text-sm ${connected ? 'text-emerald-400' : 'text-amber-400'}`}
        >
          {connected ? 'Server connected' : 'Connecting to server…'}
        </span>
      </div>

      {(camError || lastError) && (
        <p className="text-sm text-red-400">{camError ?? lastError}</p>
      )}

      <div className="relative inline-block max-w-full overflow-hidden rounded-xl border border-slate-700 bg-black">
        <video
          ref={videoRef}
          className="block max-h-[70vh] w-auto max-w-full"
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute left-0 top-0 h-full w-full"
        />
        <canvas ref={captureRef} className="hidden" />
      </div>

      <p className="text-sm text-slate-400">
        Frames are sent to the backend for recognition. Matched names are logged to
        attendance (once per person per UTC day).
      </p>
    </div>
  )
}
