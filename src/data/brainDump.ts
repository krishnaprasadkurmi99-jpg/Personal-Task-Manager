export const brainDumpCategories = [
  "Inbox",
  "Work",
  "Personal",
  "Study",
  "Ideas",
  "Other",
] as const;

export type BrainDumpCategory = (typeof brainDumpCategories)[number];

export type BrainDumpNote = {
  id: string;
  title: string;
  content: string;
  category: BrainDumpCategory;
  tags: string[];
  isPinned: boolean;
  isArchived: boolean;
  convertedTaskId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BrainDumpDraft = Pick<BrainDumpNote, "title" | "content" | "category" | "tags">;

export type BrainDumpNoteUpdate = Partial<
  Pick<BrainDumpNote, "title" | "content" | "category" | "tags" | "isPinned" | "isArchived" | "convertedTaskId">
>;
