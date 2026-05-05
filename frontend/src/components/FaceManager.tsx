import { type FormEvent, useCallback, useEffect, useState } from 'react'
import {
  deleteFace,
  faceImageUrl,
  listFaces,
  uploadFace,
  type FaceEntry,
} from '../api'

export function FaceManager() {
  const [faces, setFaces] = useState<FaceEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setMsg(null)
    try {
      const rows = await listFaces()
      setFaces(rows)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed to load faces')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!file || !name.trim()) {
      setMsg('Enter a name and choose an image.')
      return
    }
    setMsg(null)
    try {
      await uploadFace(name.trim(), file)
      setName('')
      setFile(null)
      await refresh()
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Upload failed')
    }
  }

  const onDelete = async (n: string) => {
    if (!confirm(`Delete known face "${n}"?`)) return
    setMsg(null)
    try {
      await deleteFace(n)
      await refresh()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-xl border border-slate-700 bg-slate-900/50 p-6"
      >
        <h2 className="text-lg font-semibold text-slate-100">Add known face</h2>
        <p className="text-sm text-slate-400">
          Use a clear front-facing photo with exactly one face. The name is stored
          with the image.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 text-sm">
            <span className="mb-1 block text-slate-400">Display name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-violet-500"
              placeholder="e.g. Jane Doe"
            />
          </label>
          <label className="flex-1 text-sm">
            <span className="mb-1 block text-slate-400">Image</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/bmp"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-slate-300 file:mr-3 file:rounded file:border-0 file:bg-violet-600 file:px-3 file:py-2 file:text-white"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-violet-600 px-4 py-2 font-medium text-white hover:bg-violet-500"
          >
            Upload
          </button>
        </div>
        {msg && <p className="text-sm text-amber-400">{msg}</p>}
      </form>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">Known faces</h2>
          <button
            type="button"
            onClick={() => void refresh()}
            className="text-sm text-violet-400 hover:text-violet-300"
          >
            Refresh
          </button>
        </div>
        {loading ? (
          <p className="text-slate-400">Loading…</p>
        ) : faces.length === 0 ? (
          <p className="text-slate-400">No faces yet. Add one above.</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {faces.map((f) => (
              <li
                key={f.name}
                className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900/50"
              >
                <img
                  src={faceImageUrl(f.name)}
                  alt={f.name}
                  className="aspect-square w-full object-cover"
                />
                <div className="flex items-center justify-between gap-2 p-3">
                  <span className="truncate font-medium text-slate-100">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => void onDelete(f.name)}
                    className="shrink-0 rounded bg-red-900/80 px-2 py-1 text-xs text-red-100 hover:bg-red-800"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
