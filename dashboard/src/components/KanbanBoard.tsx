import TaskColumn from './TaskColumn'

interface Task {
  _id: string
  title: string
  description?: string
  priority: string
  status: string
  assignedTo?: string[]
  tags?: string[]
}

interface Agent {
  name: string
  emoji: string
}

const COLUMNS = ['inbox', 'assigned', 'in_progress', 'review', 'done']

export default function KanbanBoard({ tasks, agents }: { tasks: Task[]; agents: Agent[] }) {
  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full" style={{ background: '#C4943D' }} />
        <span className="label">MISSION QUEUE</span>
      </div>
      <div className="flex gap-3 flex-1 overflow-x-auto overflow-y-hidden">
        {COLUMNS.map((status) => (
          <TaskColumn key={status} status={status} tasks={tasks} agents={agents} />
        ))}
      </div>
    </div>
  )
}
