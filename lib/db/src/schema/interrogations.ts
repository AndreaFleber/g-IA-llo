import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const interrogationsTable = pgTable("interrogations", {
  id: serial("id").primaryKey(),
  characterId: text("character_id").notNull(),
  characterName: text("character_name").notNull(),
  conversationId: integer("conversation_id").notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
});

export const insertInterrogationSchema = createInsertSchema(interrogationsTable).omit({ id: true, startedAt: true });
export type InsertInterrogation = z.infer<typeof insertInterrogationSchema>;
export type Interrogation = typeof interrogationsTable.$inferSelect;
