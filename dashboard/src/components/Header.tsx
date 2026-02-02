import { useState, useEffect } from 'react'

export default function Header({ agentCount, taskCount }: { agentCount: number; taskCount: number }) {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const clock = time.toLocaleTimeString('en-US', { hour12: false })
  const date = time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  return (
    <header
      className="h-14 flex items-center justify-between px-6 flex-shrink-0"
      style={{ background: '#FFFFFF', borderBottom: '1px solid #E8E4DC' }}
    >
      {/* Left */}
      <div className="flex items-center gap-3">
        <div
          className="w-[18px] h-[18px] rotate-45"
          style={{ border: '2px solid #1A1A1A' }}
        />
        <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase' as const, color: '#1A1A1A' }}>
          MISSION CONTROL
        </span>
        <span
          className="mono"
          style={{
            fontSize: 12,
            color: '#8A8578',
            border: '1px solid #D4CFC6',
            borderRadius: 4,
            padding: '2px 8px',
          }}
        >
          CLAWD
        </span>
      </div>

      {/* Center stats */}
      <div className="flex items-center gap-10">
        <div className="text-center">
          <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1 }}>{agentCount}</div>
          <div className="label" style={{ marginTop: 2 }}>AGENTS</div>
        </div>
        <div className="text-center">
          <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1 }}>{taskCount}</div>
          <div className="label" style={{ marginTop: 2 }}>TASKS</div>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="mono" style={{ fontSize: 13, color: '#1A1A1A' }}>{clock}</div>
          <div className="label">{date}</div>
        </div>
        <div
          className="flex items-center gap-2"
          style={{
            border: '1px solid #22C55E',
            borderRadius: 9999,
            padding: '4px 12px',
          }}
        >
          <div
            className="w-2 h-2 rounded-full pulse-dot"
            style={{ background: '#22C55E' }}
          />
          <span style={{ fontSize: 11, fontWeight: 600, color: '#16A34A', letterSpacing: 1 }}>ONLINE</span>
        </div>
      </div>
    </header>
  )
}
