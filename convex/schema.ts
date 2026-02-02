import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Agent registry — who's on the squad
  agents: defineTable({
    name: v.string(),
    role: v.string(),
    emoji: v.string(),
    sessionKey: v.string(),
    status: v.union(v.literal("active"), v.literal("idle"), v.literal("offline")),
    lastSeen: v.number(),
    description: v.optional(v.string()),
    level: v.optional(v.union(v.literal("lead"), v.literal("specialist"), v.literal("intern"))),
  }).index("by_sessionKey", ["sessionKey"])
    .index("by_name", ["name"]),

  // Tasks — the work queue
  tasks: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("inbox"),
      v.literal("assigned"),
      v.literal("in_progress"),
      v.literal("review"),
      v.literal("done"),
      v.literal("blocked")
    ),
    priority: v.union(
      v.literal("critical"),
      v.literal("high"),
      v.literal("medium"),
      v.literal("low")
    ),
    assignedTo: v.optional(v.array(v.string())), // agent names (supports multiple)
    subscribers: v.optional(v.array(v.string())), // agents subscribed to updates
    createdBy: v.string(), // agent name
    createdAt: v.number(),
    updatedAt: v.number(),
    dueAt: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
    parentTaskId: v.optional(v.id("tasks")),
  })
    .index("by_status", ["status"])
    .index("by_priority", ["priority"]),

  // Comments on tasks — the discussion thread
  comments: defineTable({
    taskId: v.id("tasks"),
    author: v.string(), // agent name
    content: v.string(),
    createdAt: v.number(),
  }).index("by_taskId", ["taskId"]),

  // Messages — agent-to-agent broadcast channel
  messages: defineTable({
    from: v.string(),
    to: v.optional(v.string()), // null = broadcast to all
    content: v.string(),
    channel: v.union(
      v.literal("general"),
      v.literal("alerts"),
      v.literal("reports"),
      v.literal("requests")
    ),
    createdAt: v.number(),
    read: v.optional(v.array(v.string())), // agents who read it
  })
    .index("by_channel", ["channel"])
    .index("by_createdAt", ["createdAt"]),

  // Activity feed — what's happening across the squad
  activity: defineTable({
    agent: v.string(),
    action: v.string(),
    details: v.optional(v.string()),
    relatedTaskId: v.optional(v.id("tasks")),
    createdAt: v.number(),
  }).index("by_createdAt", ["createdAt"]),

  // Documents — deliverables, research, protocols
  documents: defineTable({
    title: v.string(),
    content: v.string(), // markdown
    type: v.union(
      v.literal("deliverable"),
      v.literal("research"),
      v.literal("protocol"),
      v.literal("report"),
      v.literal("draft")
    ),
    taskId: v.optional(v.id("tasks")),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_taskId", ["taskId"])
    .index("by_type", ["type"]),

  // Notifications — @mention delivery queue
  notifications: defineTable({
    mentionedAgent: v.string(), // agent name
    fromAgent: v.string(),
    content: v.string(),
    taskId: v.optional(v.id("tasks")),
    delivered: v.boolean(),
    createdAt: v.number(),
    deliveredAt: v.optional(v.number()),
  })
    .index("by_undelivered", ["delivered", "mentionedAgent"])
    .index("by_mentionedAgent", ["mentionedAgent"]),
});
