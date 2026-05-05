import { useState } from 'react'
import { AttendanceLog } from './components/AttendanceLog'
import { FaceManager } from './components/FaceManager'
import { WebcamRecognizer } from './components/WebcamRecognizer'

type Tab = 'live' | 'faces' | 'attendance'

const tabs: { id: Tab; label: string }[] = [
  { id: 'live', label: 'Live' },
  { id: 'faces', label: 'Faces' },
  { id: 'attendance', label: 'Attendance' },
]

function App() {
  const [tab, setTab] = useState<Tab>('live')

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800 bg-slate-900/80">
        <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-white">
              Face recognition
            </h1>
            <p className="text-sm text-slate-400">
              Live webcam matching and attendance (Python + FastAPI + React)
            </p>
          </div>
          <nav className="flex gap-1 rounded-lg bg-slate-950 p-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                  tab === t.id
                    ? 'bg-violet-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main>
        {tab === 'live' && <WebcamRecognizer />}
        {tab === 'faces' && <FaceManager />}
        {tab === 'attendance' && <AttendanceLog />}
      </main>
    </div>
  )
}

export default App
