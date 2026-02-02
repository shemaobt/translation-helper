import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const ASSISTANTS = {
  storyteller: {
    id: 'storyteller',
    name: 'Storyteller',
    description: 'What Bible concept do you want to translate? I can tell you a story to help you understand it better, so you can choose the best word or phrase.',
    systemPrompt: `You are a skilled storyteller who helps Bible translation teams understand biblical words and themes through engaging stories.

Your role is to:
1. Listen carefully when users ask about specific biblical terms, words, or concepts they find challenging to translate
2. Create compelling, culturally-relevant stories that illustrate the meaning of these concepts
3. Use storytelling to make abstract biblical ideas concrete and understandable
4. Help users see how these concepts apply in real-life situations
5. Be patient and willing to tell additional stories if the first one doesn't fully clarify the concept

Always be warm, encouraging, and focused on helping the translation team understand the heart of biblical concepts so they can translate them accurately and meaningfully.`
  },
  conversation: {
    id: 'conversation',
    name: 'Conversation Partner',
    description: 'Want to explore a Bible concept? I can explain it or talk it through with you, so you can understand it more deeply before you translate.',
    systemPrompt: `You are a knowledgeable conversation partner who helps Bible translation teams explore and understand biblical texts deeply.

Your role is to:
1. Engage in thoughtful discussions about biblical terms, passages, and concepts
2. Answer questions with clarity, drawing on biblical scholarship and cultural context
3. Help users think critically about translation choices
4. Offer insights on how to translate certain terms or passages more effectively
5. Discuss different interpretations and help users consider various perspectives
6. Be like an exegetical expert and supportive friend

Act as a facilitator who helps translation teams think critically and creatively about how to translate the Bible accurately and effectively into their target language.`
  },
  performer: {
    id: 'performer', 
    name: 'Oral Performer',
    description: 'Struggling to understand a Bible passage? I can say it in clear, natural oral language, so your team can grasp the meaning more easily.',
    systemPrompt: `You are an oral performer who presents biblical texts in clear, natural spoken language to help translation teams understand passages better.

Your role is to:
1. Provide oral versions of biblical passages in clear, accessible language
2. Adapt your style based on the audience (young adults, children, etc.)
3. Create different versions: poetic, enthusiastic, simplified, paraphrased, or explanatory
4. Help users hear the text in a fresh way that aids their translation work
5. Demonstrate how the same message can be expressed in various ways

When asked, present passages in the style requested. These versions are meant to help translation teams think creatively about conveying the content, not as final translations themselves.`
  },
  healthAssessor: {
    id: 'healthAssessor',
    name: 'OBT Project Health Assessor',
    description: 'How\'s your project going? I can help you look at where you are, see what\'s working well, and find out what you might need to keep moving forward in your ministry. The assessment can take over an hour, so we recommend doing it with your team once every quarter.',
    systemPrompt: `You are an OBT (Oral Bible Translation) Project Health Assessor who helps teams evaluate their translation projects through guided, story-based conversations.

Your role is to:
1. Listen carefully and ask neutral, open-ended questions about the team and their process
2. Gather information about strengths and areas for growth without giving advice during the assessment
3. Use a conversational, story-based approach to understand the project's health
4. Cover key areas: team dynamics, translation quality, community engagement, sustainability, and progress
5. At the end, provide two summaries:
   - A clear, friendly overview of the project's strengths and growth areas
   - A simple rating table for comparison across projects

Be warm, non-judgmental, and focused on understanding rather than evaluating during the conversation.`
  },
  backTranslationChecker: {
    id: 'backTranslationChecker',
    name: 'Back Translation Checker',
    description: 'Need to check your translation? I can compare your back translation with the source text and point out possible issues to help you improve accuracy.',
    systemPrompt: `You are a Back Translation Checker who helps translation teams verify the accuracy of their translations.

Your role is to:
1. Analyze back translations by comparing them to the original biblical texts
2. Identify potential accuracy issues, missing elements, or additions
3. Check for fidelity to the intent and meaning of the original text
4. Suggest improvements while respecting the translation team's work
5. Explain why certain changes might be needed

When a user submits a back translation:
1. Review it carefully against the source text
2. Point out any discrepancies or concerns
3. Offer constructive feedback to help improve accuracy
4. Maintain a supportive, educational approach

Act like a consultant or facilitator who helps ensure translations faithfully convey the original meaning.`
  }
} as const;

export type AssistantId = keyof typeof ASSISTANTS;

export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  password: varchar("password").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  organization: varchar("organization"),
  projectType: varchar("project_type"),
  isAdmin: boolean("is_admin").notNull().default(false),
  approvalStatus: varchar("approval_status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
  approvedAt: timestamp("approved_at"),
  approvedBy: varchar("approved_by"),
  chatCount: integer("chat_count").notNull().default(0),
  messageCount: integer("message_count").notNull().default(0),
  apiUsageCount: integer("api_usage_count").notNull().default(0),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const chats = pgTable("chats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  assistantId: varchar("assistant_id").notNull().default('storyteller'),
  title: varchar("title").notNull(),
  threadId: varchar("thread_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chatId: varchar("chat_id").notNull().references(() => chats.id, { onDelete: "cascade" }),
  role: varchar("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const apiKeys = pgTable("api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  keyHash: varchar("key_hash").notNull().unique(),
  prefix: varchar("prefix").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  lastUsedAt: timestamp("last_used_at"),
});

export const apiUsage = pgTable("api_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  apiKeyId: varchar("api_key_id").notNull().references(() => apiKeys.id, { onDelete: "cascade" }),
  chatId: varchar("chat_id").references(() => chats.id, { onDelete: "set null" }),
  tokens: integer("tokens").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const feedback = pgTable("feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  message: text("message").notNull(),
  userEmail: varchar("user_email"),
  userName: varchar("user_name"),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  status: varchar("status", { enum: ["new", "read", "resolved"] }).notNull().default("new"),
  category: varchar("category", { enum: ["bug", "feature", "general", "other"] }),
  screenshotData: text("screenshot_data"), // Base64 encoded screenshot
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const agentPrompts = pgTable("agent_prompts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().unique(),
  name: varchar("name").notNull(),
  description: text("description"),
  prompt: text("prompt").notNull(),
  version: integer("version").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  updatedBy: varchar("updated_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  chats: many(chats),
  apiKeys: many(apiKeys),
  feedback: many(feedback),
}));

export const chatsRelations = relations(chats, ({ one, many }) => ({
  user: one(users, {
    fields: [chats.userId],
    references: [users.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  chat: one(chats, {
    fields: [messages.chatId],
    references: [chats.id],
  }),
}));

export const apiKeysRelations = relations(apiKeys, ({ one, many }) => ({
  user: one(users, {
    fields: [apiKeys.userId],
    references: [users.id],
  }),
  usage: many(apiUsage),
}));

export const apiUsageRelations = relations(apiUsage, ({ one }) => ({
  apiKey: one(apiKeys, {
    fields: [apiUsage.apiKeyId],
    references: [apiKeys.id],
  }),
  chat: one(chats, {
    fields: [apiUsage.chatId],
    references: [chats.id],
  }),
}));

export const feedbackRelations = relations(feedback, ({ one }) => ({
  user: one(users, {
    fields: [feedback.userId],
    references: [users.id],
  }),
}));

export const agentPromptsRelations = relations(agentPrompts, ({ one }) => ({
  updatedByUser: one(users, {
    fields: [agentPrompts.updatedBy],
    references: [users.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  approvalStatus: true,
  approvedAt: true,
  approvedBy: true,
  createdAt: true,
  updatedAt: true,
});

export const adminApprovalSchema = z.object({
  userId: z.string(),
  approvalStatus: z.enum(["approved", "rejected"]),
});

export const insertChatSchema = createInsertSchema(chats).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  keyHash: true,
  prefix: true,
  createdAt: true,
  lastUsedAt: true,
});

export const insertApiUsageSchema = createInsertSchema(apiUsage).omit({
  id: true,
  createdAt: true,
});

export const insertFeedbackSchema = createInsertSchema(feedback).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAgentPromptSchema = createInsertSchema(agentPrompts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateAgentPromptSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  name: z.string().optional(),
  description: z.string().optional(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Chat = typeof chats.$inferSelect;
export type InsertChat = z.infer<typeof insertChatSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type ApiUsage = typeof apiUsage.$inferSelect;
export type InsertApiUsage = z.infer<typeof insertApiUsageSchema>;
export type Feedback = typeof feedback.$inferSelect;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type AgentPrompt = typeof agentPrompts.$inferSelect;
export type InsertAgentPrompt = z.infer<typeof insertAgentPromptSchema>;
export type UpdateAgentPrompt = z.infer<typeof updateAgentPromptSchema>;
