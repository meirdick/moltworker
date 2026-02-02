import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const register = mutation({
  args: {
    name: v.string(),
    role: v.string(),
    emoji: v.string(),
    sessionKey: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Upsert — update if exists, create if not
    const existing = await ctx.db
      .query("agents")
      .withIndex("by_sessionKey", (q) => q.eq("sessionKey", args.sessionKey))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        status: "active",
        lastSeen: Date.now(),
      });
      return existing._id;
    }
    return await ctx.db.insert("agents", {
      ...args,
      status: "active",
      lastSeen: Date.now(),
    });
  },
});

export const heartbeat = mutation({
  args: { sessionKey: v.string() },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_sessionKey", (q) => q.eq("sessionKey", args.sessionKey))
      .first();
    if (agent) {
      await ctx.db.patch(agent._id, {
        status: "active",
        lastSeen: Date.now(),
      });
    }
  },
});

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("agents").collect();
  },
});
