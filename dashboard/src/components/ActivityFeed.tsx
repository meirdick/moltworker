import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { relativeTime } from '../lib/utils'
import DocumentPanel from './DocumentPanel'

export default function ActivityFeed() {
  const activity = useQuery(api.messages.recentActivity, { limit: 30 }) ?? []

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3" style={{ borderBottom: '1px solid #E8E4DC' }}>
        <span className="label">ACTIVITY FEED</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-2 flex flex-col gap-0">
          {activity.map((item) => (
            <div
              key={item._id}
              className="flex gap-3 py-3"
              style={{ borderBottom: '1px solid #F5F3EF' }}
            >
              <div
                className="w-2 flex-shrink-0 mt-1 rounded-full"
                style={{ background: '#E8E4DC', minHeight: 2, maxHeight: 2, marginTop: 8 }}
              />
              <div className="flex-1 min-w-0">
                <div style={{ fontSize: 13 }}>
                  <span style={{ fontWeight: 600 }}>{item.agent}</span>{' '}
                  <span style={{ color: '#8A8578' }}>{item.action}</span>
                </div>
                {item.details && (
                  <div style={{ fontSize: 12, color: '#9E9A90', marginTop: 2 }}>
                    {item.details}
                  </div>
                )}
                <div style={{ fontSize: 11, color: '#9E9A90', marginTop: 2 }}>
                  {relativeTime(item.createdAt)}
                </div>
              </div>
            </div>
          ))}
          {activity.length === 0 && (
            <div className="text-center py-8" style={{ color: '#9E9A90', fontSize: 12 }}>
              No activity yet
            </div>
          )}
        </div>
        <DocumentPanel />
      </div>
    </div>
  )
}
