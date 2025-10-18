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

// Assistant configuration for OBT Mentor
export const ASSISTANTS = {
  obtMentor: {
    id: 'obtMentor',
    name: 'OBT Mentor Assistant',
    description: 'A friendly and supportive assistant guiding Oral Bible Translation (OBT) facilitators in their journey to become mentors within Youth With A Mission (YWAM).',
    openaiId: 'asst_placeholder' // Will be updated with actual OpenAI assistant ID
  }
} as const;

export type AssistantId = keyof typeof ASSISTANTS;

// OBT Core Competencies
export const CORE_COMPETENCIES = {
  biblical_knowledge: 'Biblical Knowledge and Theology',
  translation_theory: 'Translation Theory and Practice',
  oral_methods: 'Oral Communication Methods',
  facilitation_skills: 'Facilitation and Teaching Skills',
  intercultural_communication: 'Intercultural Communication',
  project_management: 'OBT Project Management',
  mentorship_practice: 'Mentorship and Coaching',
  spiritual_formation: 'Spiritual Formation and Discipleship'
} as const;

export type CompetencyId = keyof typeof CORE_COMPETENCIES;

// Growth status levels
export const GROWTH_STATUSES = {
  not_started: 'Not Yet Started',
  emerging: 'Emerging',
  growing: 'Growing',
  proficient: 'Proficient',
  advanced: 'Advanced'
} as const;

export type GrowthStatus = keyof typeof GROWTH_STATUSES;

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  password: varchar("password").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  isAdmin: boolean("is_admin").notNull().default(false),
  // OpenAI thread for intertwined chats (shared across all user's chats)
  userThreadId: varchar("user_thread_id"),
  // Approval system fields
  approvalStatus: varchar("approval_status", { enum: ["pending", "approved", "rejected"] }).notNull().default("approved"),
  approvedAt: timestamp("approved_at"),
  approvedBy: varchar("approved_by"), // Admin user ID who approved this user
  // Usage tracking fields
  chatCount: integer("chat_count").notNull().default(0),
  messageCount: integer("message_count").notNull().default(0),
  apiUsageCount: integer("api_usage_count").notNull().default(0),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chat chains for linking related conversations
export const chatChains = pgTable("chat_chains", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title").notNull(),
  summary: text("summary"), // Brief description of this chain's theme
  activeChatId: varchar("active_chat_id"), // Current active chat in this chain
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const chats = pgTable("chats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  assistantId: varchar("assistant_id").notNull().default('obtMentor'),
  title: varchar("title").notNull(),
  threadId: varchar("thread_id"), // OpenAI thread ID for conversation context
  chainId: varchar("chain_id").references(() => chatChains.id, { onDelete: "set null" }), // Optional: part of a chain
  sequenceIndex: integer("sequence_index"), // Position in chain (0-based, NULL if not in chain)
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

export const messageAttachments = pgTable("message_attachments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  messageId: varchar("message_id").notNull().references(() => messages.id, { onDelete: "cascade" }),
  filename: varchar("filename").notNull(), // Stored filename
  originalName: varchar("original_name").notNull(), // User's original filename
  mimeType: varchar("mime_type").notNull(),
  fileSize: integer("file_size").notNull(), // In bytes
  fileType: varchar("file_type", { enum: ["image", "audio"] }).notNull(),
  storagePath: varchar("storage_path").notNull(), // Relative path to file
  transcription: text("transcription"), // For audio files (from Whisper)
  createdAt: timestamp("created_at").defaultNow(),
});

export const apiKeys = pgTable("api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  keyHash: varchar("key_hash").notNull().unique(),
  prefix: varchar("prefix").notNull(), // First 8 chars for display
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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Facilitator profiles (extends user with OBT-specific data)
export const facilitators = pgTable("facilitators", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  region: varchar("region"), // Geographic region where facilitator works
  mentorSupervisor: varchar("mentor_supervisor"), // Name of their supervisor
  totalLanguagesMentored: integer("total_languages_mentored").notNull().default(0),
  totalChaptersMentored: integer("total_chapters_mentored").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Facilitator competencies tracking
export const facilitatorCompetencies = pgTable("facilitator_competencies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  facilitatorId: varchar("facilitator_id").notNull().references(() => facilitators.id, { onDelete: "cascade" }),
  competencyId: varchar("competency_id").notNull(), // References CORE_COMPETENCIES keys
  status: varchar("status", { 
    enum: ["not_started", "emerging", "growing", "proficient", "advanced"] 
  }).notNull().default("not_started"),
  notes: text("notes"), // Comments on progress
  // Auto-competency fields
  autoScore: integer("auto_score").default(0), // Calculated score based on qualifications (0-10)
  statusSource: varchar("status_source", { enum: ["auto", "manual"] }).notNull().default("auto"), // How status was set
  suggestedStatus: varchar("suggested_status", { 
    enum: ["not_started", "emerging", "growing", "proficient", "advanced"] 
  }), // System-suggested status (shown when manual)
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Formal qualifications tracking
export const facilitatorQualifications = pgTable("facilitator_qualifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  facilitatorId: varchar("facilitator_id").notNull().references(() => facilitators.id, { onDelete: "cascade" }),
  courseTitle: varchar("course_title").notNull(),
  institution: varchar("institution").notNull(),
  completionDate: timestamp("completion_date"),
  credential: varchar("credential"), // Certificate, diploma, etc.
  description: text("description"), // Brief description of content
  createdAt: timestamp("created_at").defaultNow(),
});

// Mentorship activities tracking
export const mentorshipActivities = pgTable("mentorship_activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  facilitatorId: varchar("facilitator_id").notNull().references(() => facilitators.id, { onDelete: "cascade" }),
  languageName: varchar("language_name").notNull(),
  chaptersCount: integer("chapters_count").notNull().default(1),
  activityDate: timestamp("activity_date").defaultNow(),
  notes: text("notes"), // Additional context about the activity
  createdAt: timestamp("created_at").defaultNow(),
});

// Quarterly reports
export const quarterlyReports = pgTable("quarterly_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  facilitatorId: varchar("facilitator_id").notNull().references(() => facilitators.id, { onDelete: "cascade" }),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  reportData: jsonb("report_data").notNull(), // Full report JSON structure
  generatedAt: timestamp("generated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  chats: many(chats),
  apiKeys: many(apiKeys),
  feedback: many(feedback),
  facilitator: one(facilitators, {
    fields: [users.id],
    references: [facilitators.userId],
  }),
}));

export const chatChainsRelations = relations(chatChains, ({ one, many }) => ({
  user: one(users, {
    fields: [chatChains.userId],
    references: [users.id],
  }),
  chats: many(chats),
}));

export const chatsRelations = relations(chats, ({ one, many }) => ({
  user: one(users, {
    fields: [chats.userId],
    references: [users.id],
  }),
  chain: one(chatChains, {
    fields: [chats.chainId],
    references: [chatChains.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  chat: one(chats, {
    fields: [messages.chatId],
    references: [chats.id],
  }),
  attachments: many(messageAttachments),
}));

export const messageAttachmentsRelations = relations(messageAttachments, ({ one }) => ({
  message: one(messages, {
    fields: [messageAttachments.messageId],
    references: [messages.id],
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

export const facilitatorsRelations = relations(facilitators, ({ one, many }) => ({
  user: one(users, {
    fields: [facilitators.userId],
    references: [users.id],
  }),
  competencies: many(facilitatorCompetencies),
  qualifications: many(facilitatorQualifications),
  activities: many(mentorshipActivities),
  reports: many(quarterlyReports),
}));

export const facilitatorCompetenciesRelations = relations(facilitatorCompetencies, ({ one }) => ({
  facilitator: one(facilitators, {
    fields: [facilitatorCompetencies.facilitatorId],
    references: [facilitators.id],
  }),
}));

export const facilitatorQualificationsRelations = relations(facilitatorQualifications, ({ one }) => ({
  facilitator: one(facilitators, {
    fields: [facilitatorQualifications.facilitatorId],
    references: [facilitators.id],
  }),
}));

export const mentorshipActivitiesRelations = relations(mentorshipActivities, ({ one }) => ({
  facilitator: one(facilitators, {
    fields: [mentorshipActivities.facilitatorId],
    references: [facilitators.id],
  }),
}));

export const quarterlyReportsRelations = relations(quarterlyReports, ({ one }) => ({
  facilitator: one(facilitators, {
    fields: [quarterlyReports.facilitatorId],
    references: [facilitators.id],
  }),
}));

// Insert schemas
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

export const insertChatChainSchema = createInsertSchema(chatChains).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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

export const insertFacilitatorSchema = createInsertSchema(facilitators).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFacilitatorCompetencySchema = createInsertSchema(facilitatorCompetencies).omit({
  id: true,
  createdAt: true,
  lastUpdated: true,
});

export const insertFacilitatorQualificationSchema = createInsertSchema(facilitatorQualifications).omit({
  id: true,
  createdAt: true,
});

export const insertMentorshipActivitySchema = createInsertSchema(mentorshipActivities).omit({
  id: true,
  createdAt: true,
});

export const insertQuarterlyReportSchema = createInsertSchema(quarterlyReports).omit({
  id: true,
  createdAt: true,
  generatedAt: true,
});

export const insertMessageAttachmentSchema = createInsertSchema(messageAttachments).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type ChatChain = typeof chatChains.$inferSelect;
export type InsertChatChain = z.infer<typeof insertChatChainSchema>;
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
export type Facilitator = typeof facilitators.$inferSelect;
export type InsertFacilitator = z.infer<typeof insertFacilitatorSchema>;
export type FacilitatorCompetency = typeof facilitatorCompetencies.$inferSelect;
export type InsertFacilitatorCompetency = z.infer<typeof insertFacilitatorCompetencySchema>;
export type FacilitatorQualification = typeof facilitatorQualifications.$inferSelect;
export type InsertFacilitatorQualification = z.infer<typeof insertFacilitatorQualificationSchema>;
export type MentorshipActivity = typeof mentorshipActivities.$inferSelect;
export type InsertMentorshipActivity = z.infer<typeof insertMentorshipActivitySchema>;
export type QuarterlyReport = typeof quarterlyReports.$inferSelect;
export type InsertQuarterlyReport = z.infer<typeof insertQuarterlyReportSchema>;
export type MessageAttachment = typeof messageAttachments.$inferSelect;
export type InsertMessageAttachment = z.infer<typeof insertMessageAttachmentSchema>;
