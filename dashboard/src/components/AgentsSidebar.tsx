import AgentCard from './AgentCard'

interface Agent {
  name: string
  emoji: string
  role: string
  status: string
  level?: string
}

export default function AgentsSidebar({
  agents,
  selectedAgent,
  onSelectAgent,
}: {
  agents: Agent[]
  selectedAgent: string | null
  onSelectAgent: (name: string) => void
}) {
  return (
    <div
      className="w-60 flex-shrink-0 flex flex-col overflow-hidden"
      style={{ borderRight: '1px solid #E8E4DC', background: '#FFFFFF' }}
    >
      <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid #E8E4DC' }}>
        <div className="w-2 h-2 rounded-full pulse-dot" style={{ background: '#22C55E' }} />
        <span className="label">AGENTS</span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            background: '#F5F3EF',
            color: '#8A8578',
            borderRadius: 9999,
            padding: '1px 7px',
            marginLeft: 'auto',
          }}
        >
          {agents.length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-0.5">
        {agents.map((agent) => (
          <AgentCard
            key={agent.name}
            agent={agent}
            selected={selectedAgent === agent.name}
            onClick={() => onSelectAgent(agent.name)}
          />
        ))}
        {agents.length === 0 && (
          <div className="text-center py-8" style={{ color: '#9E9A90', fontSize: 12 }}>
            No agents registered
          </div>
        )}
      </div>
    </div>
  )
}
