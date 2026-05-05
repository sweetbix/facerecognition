import { useCallback, useEffect, useRef, useState } from 'react'
import type { RecognizedFace } from '../api'

function wsUrl(): string {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${window.location.host}/ws/recognize`
}

export function useRecognizerSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const [faces, setFaces] = useState<RecognizedFace[]>([])
  const [connected, setConnected] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)

  useEffect(() => {
    let closed = false
    const ws = new WebSocket(wsUrl())
    wsRef.current = ws

    ws.onopen = () => {
      if (!closed) {
        setConnected(true)
        setLastError(null)
      }
    }
    ws.onclose = () => {
      if (!closed) setConnected(false)
    }
    ws.onerror = () => {
      if (!closed) setLastError('WebSocket error')
    }
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data as string) as {
          faces?: RecognizedFace[]
          error?: string
        }
        if (data.error) setLastError(data.error)
        if (Array.isArray(data.faces)) setFaces(data.faces)
      } catch {
        setLastError('Invalid server message')
      }
    }

    return () => {
      closed = true
      ws.close()
      wsRef.current = null
    }
  }, [])

  const sendFrame = useCallback((dataUrl: string) => {
    const ws = wsRef.current
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ frame: dataUrl }))
    }
  }, [])

  return { faces, connected, lastError, sendFrame }
}
