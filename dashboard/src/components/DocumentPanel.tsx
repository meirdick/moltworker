import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { relativeTime } from '../lib/utils'

const TYPE_ICONS: Record<string, string> = {
  deliverable: '📦',
  research: '🔬',
  protocol: '📋',
  report: '📊',
  draft: '📝',
}

export default function DocumentPanel() {
  const docs = useQuery(api.documents.list, {}) ?? []
  const recent = docs.slice(0, 10)

  if (recent.length === 0) return null

  return (
    <div className="px-4 py-3" style={{ borderTop: '1px solid #E8E4DC' }}>
      <div className="label mb-2">RECENT DOCUMENTS</div>
      <div className="flex flex-col gap-1">
        {recent.map((doc) => (
          <div
            key={doc._id}
            className="flex items-center gap-2 py-1.5"
          >
            <span style={{ fontSize: 14 }}>{TYPE_ICONS[doc.type] ?? '📄'}</span>
            <div className="flex-1 min-w-0">
              <div style={{ fontSize: 12, fontWeight: 600 }} className="truncate">{doc.title}</div>
              <div style={{ fontSize: 10, color: '#9E9A90' }}>
                {doc.createdBy} · {relativeTime(doc.createdAt)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
