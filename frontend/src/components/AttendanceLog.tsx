import { useCallback, useEffect, useMemo, useState } from 'react'
import { clearAttendance, listAttendance, type AttendanceRow } from '../api'

function groupByDay(entries: AttendanceRow[]): Map<string, AttendanceRow[]> {
  const m = new Map<string, AttendanceRow[]>()
  for (const e of entries) {
    const day = e.day || e.ts.slice(0, 10)
    const list = m.get(day) ?? []
    list.push(e)
    m.set(day, list)
  }
  return m
}

export function AttendanceLog() {
  const [entries, setEntries] = useState<AttendanceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const rows = await listAttendance()
      setEntries(rows)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const grouped = useMemo(() => groupByDay(entries), [entries])
  const days = useMemo(
    () => [...grouped.keys()].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0)),
    [grouped],
  )

  const onClear = async () => {
    if (!confirm('Clear all attendance records?')) return
    setErr(null)
    try {
      await clearAttendance()
      await load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Clear failed')
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-100">Attendance log</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => void onClear()}
            className="rounded-lg bg-red-900/80 px-3 py-1.5 text-sm text-red-100 hover:bg-red-800"
          >
            Clear all
          </button>
        </div>
      </div>
      {err && <p className="text-sm text-red-400">{err}</p>}
      {loading ? (
        <p className="text-slate-400">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="text-slate-400">No attendance yet. Use Live recognition.</p>
      ) : (
        <div className="space-y-8">
          {days.map((day) => (
            <section key={day}>
              <h3 className="mb-2 border-b border-slate-700 pb-1 text-sm font-medium uppercase tracking-wide text-slate-400">
                {day}
              </h3>
              <div className="overflow-x-auto rounded-xl border border-slate-700">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-900/80 text-slate-400">
                    <tr>
                      <th className="px-3 py-2 font-medium">Name</th>
                      <th className="px-3 py-2 font-medium">Time (UTC)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(grouped.get(day) ?? []).map((row) => (
                      <tr
                        key={row.id}
                        className="border-t border-slate-800 odd:bg-slate-900/30"
                      >
                        <td className="px-3 py-2 font-medium text-slate-100">
                          {row.name}
                        </td>
                        <td className="px-3 py-2 text-slate-300">
                          {row.ts.replace('T', ' ').replace('+00:00', 'Z')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
