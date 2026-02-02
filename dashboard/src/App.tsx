import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../convex/_generated/api'
import Header from './components/Header'
import AgentsSidebar from './components/AgentsSidebar'
import KanbanBoard from './components/KanbanBoard'
import ActivityFeed from './components/ActivityFeed'
import AgentDetail from './components/AgentDetail'

export default function App() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const agents = useQuery(api.agents.list) ?? []
  const tasks = useQuery(api.tasks.list, {}) ?? []

  const agent = selectedAgent ? agents.find(a => a.name === selectedAgent) : null

  return (
    <div className="h-screen flex flex-col" style={{ background: '#FAFAF8' }}>
      <Header agentCount={agents.length} taskCount={tasks.length} />
      <div className="flex flex-1 overflow-hidden">
        <AgentsSidebar
          agents={agents}
          selectedAgent={selectedAgent}
          onSelectAgent={(name) => setSelectedAgent(name === selectedAgent ? null : name)}
        />
        <div className="flex-1 overflow-hidden">
          <KanbanBoard tasks={tasks} agents={agents} />
        </div>
        <div className="w-[400px] border-l flex-shrink-0 overflow-y-auto" style={{ borderColor: '#E8E4DC' }}>
          {agent ? (
            <AgentDetail agent={agent} onClose={() => setSelectedAgent(null)} />
          ) : (
            <ActivityFeed />
          )}
        </div>
      </div>
    </div>
  )
}
