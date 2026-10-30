import type { SupabaseClient } from "@supabase/supabase-js";
import { brainDumpCategories, type BrainDumpDraft, type BrainDumpNote, type BrainDumpNoteUpdate } from "../data/brainDump";
import type { BrainDumpRow, Database } from "../data/database.types";
import { getBrainDumpUserId, getSupabaseClient } from "./supabase";

const NOTES_PAGE_SIZE = 500;

function toNote(row: BrainDumpRow): BrainDumpNote {
  const category = brainDumpCategories.find((option) => option === row.category);
  if (!category) throw new Error("A saved note has an unsupported category. Update the note category and try again.");
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    category,
    tags: row.tags,
    isPinned: row.is_pinned,
    isArchived: row.is_archived,
    convertedTaskId: row.converted_task_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getOwner(client: SupabaseClient<Database>): Promise<string> {
  return getBrainDumpUserId(client);
}

export async function listBrainDumpNotes(): Promise<BrainDumpNote[]> {
  const client = getSupabaseClient();
  const userId = await getOwner(client);
  const rows: BrainDumpRow[] = [];
  for (let offset = 0; ; offset += NOTES_PAGE_SIZE) {
    const { data, error } = await client
      .from("brain_dumps")
      .select("*")
      .order("is_pinned", { ascending: false })
      .order("updated_at", { ascending: false })
      .order("id", { ascending: true })
      .eq("user_id", userId)
      .range(offset, offset + NOTES_PAGE_SIZE - 1);
    if (error) throw new Error(`Could not load your notes. ${error.message}`);
    rows.push(...data);
    if (data.length < NOTES_PAGE_SIZE) break;
  }
  return rows.map(toNote);
}

export async function createBrainDumpNote(draft: BrainDumpDraft): Promise<BrainDumpNote> {
  const client = getSupabaseClient();
  const userId = await getOwner(client);
  const { data, error } = await client
    .from("brain_dumps")
    .insert({
      user_id: userId,
      title: draft.title,
      content: draft.content,
      category: draft.category,
      tags: draft.tags,
      is_pinned: false,
      is_archived: false,
      converted_task_id: null,
    })
    .select("*")
    .single();
  if (error) throw new Error(`Could not save your note. ${error.message}`);
  return toNote(data);
}

function toDatabaseUpdate(patch: BrainDumpNoteUpdate): Database["public"]["Tables"]["brain_dumps"]["Update"] {
  return {
    ...(patch.title !== undefined ? { title: patch.title } : {}),
    ...(patch.content !== undefined ? { content: patch.content } : {}),
    ...(patch.category !== undefined ? { category: patch.category } : {}),
    ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
    ...(patch.isPinned !== undefined ? { is_pinned: patch.isPinned } : {}),
    ...(patch.isArchived !== undefined ? { is_archived: patch.isArchived } : {}),
    ...(patch.convertedTaskId !== undefined ? { converted_task_id: patch.convertedTaskId } : {}),
  };
}

export async function updateBrainDumpNote(
  id: string,
  patch: BrainDumpNoteUpdate,
): Promise<BrainDumpNote> {
  const client = getSupabaseClient();
  const userId = await getOwner(client);
  const { data, error } = await client
    .from("brain_dumps")
    .update(toDatabaseUpdate(patch))
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(`Could not update your note. ${error.message}`);
  if (!data) throw new Error("This note could not be found or is no longer available.");
  return toNote(data);
}

export async function deleteBrainDumpNote(id: string): Promise<void> {
  const client = getSupabaseClient();
  const userId = await getOwner(client);
  const { data, error } = await client
    .from("brain_dumps")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`Could not delete your note. ${error.message}`);
  if (!data) throw new Error("This note could not be found or is no longer available.");
}
