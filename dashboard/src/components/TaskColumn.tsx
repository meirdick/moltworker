import TaskCard from './TaskCard'

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

const STATUS_LABELS: Record<string, string> = {
  inbox: 'INBOX',
  assigned: 'ASSIGNED',
  in_progress: 'IN PROGRESS',
  review: 'REVIEW',
  done: 'DONE',
}

export default function TaskColumn({
  status,
  tasks,
  agents,
}: {
  status: string
  tasks: Task[]
  agents: Agent[]
}) {
  const filtered = tasks.filter((t) => t.status === status)

  return (
    <div className="flex flex-col min-w-[200px] flex-1">
      <div
        className="flex items-center gap-2 px-3 py-2 mb-2"
        style={{ borderBottom: '1px solid #E8E4DC' }}
      >
        <span className="label">{STATUS_LABELS[status] ?? status}</span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            background: '#F5F3EF',
            color: '#8A8578',
            borderRadius: 9999,
            padding: '1px 7px',
          }}
        >
          {filtered.length}
        </span>
      </div>
      <div
        className="flex-1 overflow-y-auto px-1.5 pb-2 flex flex-col gap-2"
        style={{ background: '#F5F3EF', borderRadius: 8, minHeight: 100 }}
      >
        <div className="pt-2" />
        {filtered.map((task) => (
          <TaskCard key={task._id} task={task} agents={agents} />
        ))}
      </div>
    </div>
  )
}
