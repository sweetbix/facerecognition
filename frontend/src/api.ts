export type FaceBox = [number, number, number, number]

export interface RecognizedFace {
  name: string | null
  distance: number
  box: FaceBox
}

export interface FaceEntry {
  name: string
}

export interface AttendanceRow {
  id: number
  name: string
  ts: string
  day: string
}

const jsonHeaders = { Accept: 'application/json' }

export async function listFaces(): Promise<FaceEntry[]> {
  const res = await fetch('/api/faces', { headers: jsonHeaders })
  if (!res.ok) throw new Error(await res.text())
  const data = (await res.json()) as { faces: FaceEntry[] }
  return data.faces
}

export function faceImageUrl(name: string): string {
  return `/api/faces/${encodeURIComponent(name)}/image`
}

export async function uploadFace(name: string, file: File): Promise<string> {
  const body = new FormData()
  body.append('name', name)
  body.append('file', file)
  const res = await fetch('/api/faces', { method: 'POST', body })
  if (!res.ok) {
    let detail = res.statusText
    try {
      const j = (await res.json()) as { detail?: string }
      if (j.detail) detail = j.detail
    } catch {
      /* ignore */
    }
    throw new Error(detail)
  }
  const data = (await res.json()) as { name: string }
  return data.name
}

export async function deleteFace(name: string): Promise<void> {
  const res = await fetch(`/api/faces/${encodeURIComponent(name)}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error(await res.text())
}

export async function listAttendance(date?: string): Promise<AttendanceRow[]> {
  const q = date ? `?date=${encodeURIComponent(date)}` : ''
  const res = await fetch(`/api/attendance${q}`, { headers: jsonHeaders })
  if (!res.ok) throw new Error(await res.text())
  const data = (await res.json()) as { entries: AttendanceRow[] }
  return data.entries
}

export async function clearAttendance(): Promise<void> {
  const res = await fetch('/api/attendance', { method: 'DELETE' })
  if (!res.ok) throw new Error(await res.text())
}
