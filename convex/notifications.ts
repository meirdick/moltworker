import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get undelivered notifications (for the daemon to poll)
export const getUndelivered = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("notifications")
      .withIndex("by_undelivered", (q) => q.eq("delivered", false))
      .take(args.limit ?? 50);
  },
});

// Get notifications for a specific agent (for heartbeat checks)
export const forAgent = query({
  args: {
    agent: v.string(),
    undeliveredOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (args.undeliveredOnly) {
      return await ctx.db
        .query("notifications")
        .withIndex("by_undelivered", (q) =>
          q.eq("delivered", false).eq("mentionedAgent", args.agent)
        )
        .collect();
    }
    return await ctx.db
      .query("notifications")
      .withIndex("by_mentionedAgent", (q) => q.eq("mentionedAgent", args.agent))
      .order("desc")
      .take(20);
  },
});

// Mark notification as delivered
export const markDelivered = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      delivered: true,
      deliveredAt: Date.now(),
    });
  },
});

// Mark all notifications for an agent as delivered
export const markAllDelivered = mutation({
  args: { agent: v.string() },
  handler: async (ctx, args) => {
    const undelivered = await ctx.db
      .query("notifications")
      .withIndex("by_undelivered", (q) =>
        q.eq("delivered", false).eq("mentionedAgent", args.agent)
      )
      .collect();
    for (const n of undelivered) {
      await ctx.db.patch(n._id, { delivered: true, deliveredAt: Date.now() });
    }
    return undelivered.length;
  },
});

// Create a notification directly (for system notifications)
export const create = mutation({
  args: {
    mentionedAgent: v.string(),
    fromAgent: v.string(),
    content: v.string(),
    taskId: v.optional(v.id("tasks")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("notifications", {
      ...args,
      delivered: false,
      createdAt: Date.now(),
    });
  },
});
