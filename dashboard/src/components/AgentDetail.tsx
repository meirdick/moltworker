import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { agentColor, levelBadge, relativeTime } from '../lib/utils'

interface Agent {
  _id: any
  name: string
  emoji: string
  role: string
  status: string
  description?: string
  level?: string
  lastSeen: number
}

export default function AgentDetail({ agent, onClose }: { agent: Agent; onClose: () => void }) {
  const [tab, setTab] = useState<'attention' | 'timeline' | 'messages'>('attention')
  const notifications = useQuery(api.notifications.forAgent, { agent: agent.name }) ?? []
  const activity = useQuery(api.messages.recentActivity, { limit: 50 }) ?? []
  const messages = useQuery(api.messages.recent, { limit: 20 }) ?? []

  const agentActivity = activity.filter((a) => a.agent === agent.name)
  const agentMessages = messages.filter((m) => m.from === agent.name || m.to === agent.name)
  const undelivered = notifications.filter((n: any) => !n.delivered)
  const badge = levelBadge(agent.level)
  const isActive = agent.status === 'active'

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #E8E4DC' }}>
        <span className="label">AGENT DETAIL</span>
        <button
          onClick={onClose}
          style={{ fontSize: 18, color: '#9E9A90', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          ×
        </button>
      </div>

      {/* Agent info */}
      <div className="px-4 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid #E8E4DC' }}>
        <div
          className="w-[60px] h-[60px] rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: agentColor(agent.name), fontSize: 28 }}
        >
          {agent.emoji}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 18, fontWeight: 700 }}>{agent.name}</span>
            {badge.label && (
              <span style={{ fontSize: 10, fontWeight: 700, background: badge.bg, color: badge.text, borderRadius: 3, padding: '2px 6px', letterSpacing: 1 }}>
                {badge.label}
              </span>
            )}
          </div>
          <div style={{ fontSize: 13, color: '#8A8578' }}>{agent.role}</div>
          <div className="flex items-center gap-1.5 mt-1">
            <div className={`w-2 h-2 rounded-full ${isActive ? 'pulse-dot' : ''}`} style={{ background: isActive ? '#22C55E' : '#9E9A90' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: isActive ? '#16A34A' : '#9E9A90' }}>
              {isActive ? 'WORKING' : agent.status === 'idle' ? 'IDLE' : 'OFFLINE'}
            </span>
            <span style={{ fontSize: 10, color: '#9E9A90', marginLeft: 8 }}>
              Last seen {relativeTime(agent.lastSeen)}
            </span>
          </div>
        </div>
      </div>

      {/* Description */}
      {agent.description && (
        <div className="px-4 py-3" style={{ borderBottom: '1px solid #E8E4DC' }}>
          <div className="label mb-1">ABOUT</div>
          <div
            className="p-3"
            style={{ background: '#FBF8F1', borderLeft: '3px solid #C4943D', borderRadius: 4, fontSize: 13, color: '#8A8578', lineHeight: 1.5 }}
          >
            {agent.description}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex px-4 gap-0" style={{ borderBottom: '1px solid #E8E4DC' }}>
        {(['attention', 'timeline', 'messages'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="py-2 px-3"
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 1,
              textTransform: 'uppercase',
              color: tab === t ? '#1A1A1A' : '#9E9A90',
              borderBottom: tab === t ? '2px solid #C4943D' : '2px solid transparent',
              background: 'none',
              border: 'none',
              borderBottomWidth: 2,
              borderBottomStyle: 'solid',
              borderBottomColor: tab === t ? '#C4943D' : 'transparent',
              cursor: 'pointer',
            }}
          >
            {t}
            {t === 'attention' && undelivered.length > 0 && (
              <span style={{ fontSize: 9, fontWeight: 700, background: '#E67E22', color: '#FFF', borderRadius: 9999, padding: '1px 5px', marginLeft: 4 }}>
                {undelivered.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {tab === 'attention' && (
          <div className="flex flex-col gap-2">
            {notifications.length === 0 && (
              <div className="text-center py-6" style={{ color: '#9E9A90', fontSize: 12 }}>No notifications</div>
            )}
            {notifications.map((n: any) => (
              <div key={n._id} className="py-2" style={{ borderBottom: '1px solid #F5F3EF' }}>
                <div style={{ fontSize: 12 }}>
                  <span style={{ fontWeight: 600 }}>{n.fromAgent}</span>{' '}
                  <span style={{ color: '#8A8578' }}>{n.content}</span>
                </div>
                <div style={{ fontSize: 10, color: '#9E9A90', marginTop: 2 }}>{relativeTime(n.createdAt)}</div>
              </div>
            ))}
          </div>
        )}
        {tab === 'timeline' && (
          <div className="flex flex-col gap-2">
            {agentActivity.length === 0 && (
              <div className="text-center py-6" style={{ color: '#9E9A90', fontSize: 12 }}>No activity</div>
            )}
            {agentActivity.map((a) => (
              <div key={a._id} className="py-2" style={{ borderBottom: '1px solid #F5F3EF' }}>
                <div style={{ fontSize: 12, color: '#8A8578' }}>{a.action}</div>
                {a.details && <div style={{ fontSize: 11, color: '#9E9A90' }}>{a.details}</div>}
                <div style={{ fontSize: 10, color: '#9E9A90', marginTop: 2 }}>{relativeTime(a.createdAt)}</div>
              </div>
            ))}
          </div>
        )}
        {tab === 'messages' && (
          <div className="flex flex-col gap-2">
            {agentMessages.length === 0 && (
              <div className="text-center py-6" style={{ color: '#9E9A90', fontSize: 12 }}>No messages</div>
            )}
            {agentMessages.map((m: any) => (
              <div key={m._id} className="py-2" style={{ borderBottom: '1px solid #F5F3EF' }}>
                <div style={{ fontSize: 12 }}>
                  <span style={{ fontWeight: 600 }}>{m.from}</span>
                  {m.to && <span style={{ color: '#9E9A90' }}> → {m.to}</span>}
                </div>
                <div style={{ fontSize: 12, color: '#8A8578', marginTop: 2 }}>{m.content}</div>
                <div style={{ fontSize: 10, color: '#9E9A90', marginTop: 2 }}>{relativeTime(m.createdAt)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
