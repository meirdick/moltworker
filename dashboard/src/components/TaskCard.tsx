import { priorityIndicator, agentColor } from '../lib/utils'

interface Task {
  _id: string
  title: string
  description?: string
  priority: string
  assignedTo?: string[]
  tags?: string[]
}

interface Agent {
  name: string
  emoji: string
}

export default function TaskCard({ task, agents }: { task: Task; agents: Agent[] }) {
  const pri = priorityIndicator(task.priority)

  return (
    <div
      className="p-3 transition-colors hover:border-[#C4BFB3]"
      style={{
        background: '#FFFFFF',
        borderRadius: 8,
        border: '1px solid #E8E4DC',
      }}
    >
      <div className="flex items-start gap-2">
        <span style={{ color: pri.color, fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>
          {pri.symbol}
        </span>
        <div className="flex-1 min-w-0">
          <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>{task.title}</div>
          {task.description && (
            <div
              style={{
                fontSize: 12,
                color: '#8A8578',
                marginTop: 4,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {task.description}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        {task.assignedTo?.map((name) => {
          const ag = agents.find((a) => a.name === name)
          return (
            <div
              key={name}
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: agentColor(name), fontSize: 12 }}
              title={name}
            >
              {ag?.emoji ?? name[0]}
            </div>
          )
        })}
        {task.tags?.map((tag) => (
          <span
            key={tag}
            style={{
              fontSize: 10,
              color: '#8A8578',
              background: '#F5F3EF',
              borderRadius: 3,
              padding: '1px 6px',
              fontWeight: 500,
            }}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  )
}
