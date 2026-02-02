import { agentColor, levelBadge } from '../lib/utils'

interface Agent {
  name: string
  emoji: string
  role: string
  status: string
  level?: string
}

export default function AgentCard({
  agent,
  selected,
  onClick,
}: {
  agent: Agent
  selected: boolean
  onClick: () => void
}) {
  const badge = levelBadge(agent.level)
  const isActive = agent.status === 'active'

  return (
    <div
      className="flex items-center gap-3 p-3 cursor-pointer transition-colors"
      style={{
        borderRadius: 8,
        background: selected ? '#F5F3EF' : 'transparent',
        borderLeft: selected ? '3px solid #C4943D' : '3px solid transparent',
      }}
      onClick={onClick}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: agentColor(agent.name), fontSize: 18 }}
      >
        {agent.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 14, fontWeight: 600 }}>{agent.name}</span>
          {badge.label && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                background: badge.bg,
                color: badge.text,
                borderRadius: 3,
                padding: '1px 5px',
                letterSpacing: 1,
              }}
            >
              {badge.label}
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: '#8A8578' }}>{agent.role}</div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <div
            className={`w-1.5 h-1.5 rounded-full ${isActive ? 'pulse-dot' : ''}`}
            style={{ background: isActive ? '#22C55E' : '#9E9A90' }}
          />
          <span style={{ fontSize: 11, fontWeight: 500, color: isActive ? '#16A34A' : '#9E9A90' }}>
            {isActive ? 'ACTIVE' : agent.status === 'idle' ? 'IDLE' : 'OFFLINE'}
          </span>
        </div>
      </div>
    </div>
  )
}
