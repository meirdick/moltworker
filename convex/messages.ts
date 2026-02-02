import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const send = mutation({
  args: {
    from: v.string(),
    to: v.optional(v.string()),
    content: v.string(),
    channel: v.union(v.literal("general"), v.literal("alerts"), v.literal("reports"), v.literal("requests")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("messages", {
      ...args,
      createdAt: Date.now(),
      read: [args.from],
    });
  },
});

export const recent = query({
  args: {
    channel: v.optional(v.union(v.literal("general"), v.literal("alerts"), v.literal("reports"), v.literal("requests"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    if (args.channel) {
      return await ctx.db
        .query("messages")
        .withIndex("by_channel", (q) => q.eq("channel", args.channel!))
        .order("desc")
        .take(limit);
    }
    return await ctx.db.query("messages").order("desc").take(limit);
  },
});

export const logActivity = mutation({
  args: {
    agent: v.string(),
    action: v.string(),
    details: v.optional(v.string()),
    relatedTaskId: v.optional(v.id("tasks")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("activity", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const recentActivity = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("activity")
      .withIndex("by_createdAt")
      .order("desc")
      .take(args.limit ?? 50);
  },
});
