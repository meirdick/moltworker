import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    priority: v.union(v.literal("critical"), v.literal("high"), v.literal("medium"), v.literal("low")),
    assignedTo: v.optional(v.array(v.string())),
    createdBy: v.string(),
    tags: v.optional(v.array(v.string())),
    parentTaskId: v.optional(v.id("tasks")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const status = args.assignedTo && args.assignedTo.length > 0 ? "assigned" : "inbox";
    // Creator + assignees are auto-subscribed
    const subscribers = new Set<string>([args.createdBy, ...(args.assignedTo ?? [])]);
    return await ctx.db.insert("tasks", {
      ...args,
      status: status as any,
      subscribers: [...subscribers],
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("tasks"),
    status: v.optional(v.union(
      v.literal("inbox"), v.literal("assigned"), v.literal("in_progress"),
      v.literal("review"), v.literal("done"), v.literal("blocked")
    )),
    assignedTo: v.optional(v.array(v.string())),
    priority: v.optional(v.union(v.literal("critical"), v.literal("high"), v.literal("medium"), v.literal("low"))),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const task = await ctx.db.get(id);
    if (!task) throw new Error("Task not found");

    const updates: any = { updatedAt: Date.now() };
    for (const [k, val] of Object.entries(fields)) {
      if (val !== undefined) updates[k] = val;
    }
    // If assigning agents, auto-subscribe them and set status to assigned if inbox
    if (args.assignedTo) {
      const subs = new Set<string>([...(task.subscribers ?? []), ...args.assignedTo]);
      updates.subscribers = [...subs];
      if (task.status === "inbox") {
        updates.status = "assigned";
      }
    }
    await ctx.db.patch(id, updates);
  },
});

export const subscribe = mutation({
  args: {
    taskId: v.id("tasks"),
    agent: v.string(),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");
    const subs = new Set<string>([...(task.subscribers ?? []), args.agent]);
    await ctx.db.patch(args.taskId, { subscribers: [...subs] });
  },
});

export const list = query({
  args: {
    status: v.optional(v.string()),
    assignedTo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let tasks;
    if (args.status) {
      tasks = await ctx.db.query("tasks").withIndex("by_status", (q) => q.eq("status", args.status as any)).collect();
    } else {
      tasks = await ctx.db.query("tasks").collect();
    }
    // Filter by assignedTo in memory (it's an array now)
    if (args.assignedTo) {
      tasks = tasks.filter((t) => t.assignedTo?.includes(args.assignedTo!));
    }
    return tasks;
  },
});

export const get = query({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const addComment = mutation({
  args: {
    taskId: v.id("tasks"),
    author: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    // Auto-subscribe the commenter
    const subs = new Set<string>([...(task.subscribers ?? []), args.author]);
    await ctx.db.patch(args.taskId, {
      subscribers: [...subs],
      updatedAt: Date.now(),
    });

    // Parse @mentions from content
    const mentionRegex = /@(\w+)/g;
    let match;
    const mentioned = new Set<string>();
    while ((match = mentionRegex.exec(args.content)) !== null) {
      const name = match[1];
      if (name.toLowerCase() === "all") {
        // @all — notify all subscribers except author
        for (const sub of subs) {
          if (sub !== args.author) mentioned.add(sub);
        }
      } else {
        mentioned.add(name);
        // Also subscribe mentioned agents
        subs.add(name);
      }
    }

    // Notify all subscribers (except author) — thread subscription
    const notifySet = new Set<string>();
    for (const sub of subs) {
      if (sub !== args.author) notifySet.add(sub);
    }
    // Mentioned agents get priority notification
    for (const agent of mentioned) {
      if (agent !== args.author) notifySet.add(agent);
    }

    // Create notifications for all subscribers
    for (const agent of notifySet) {
      const isMentioned = mentioned.has(agent);
      const prefix = isMentioned ? `@${agent} mentioned` : `Thread update`;
      await ctx.db.insert("notifications", {
        mentionedAgent: agent,
        fromAgent: args.author,
        content: `${prefix} on "${task.title}": ${args.content}`,
        taskId: args.taskId,
        delivered: false,
        createdAt: Date.now(),
      });
    }

    // Update subscribers list (may have added mentioned agents)
    await ctx.db.patch(args.taskId, { subscribers: [...subs] });

    return await ctx.db.insert("comments", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const getComments = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    return await ctx.db.query("comments").withIndex("by_taskId", (q) => q.eq("taskId", args.taskId)).collect();
  },
});
