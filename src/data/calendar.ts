export const timeBlockTypes = ["Deep Work", "Study", "Meeting", "Personal", "Break"] as const;

export type TimeBlockType = (typeof timeBlockTypes)[number];

export type TimeBlock = {
  id: string;
  title: string;
  type: TimeBlockType;
  startAt: string;
  endAt: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type TimeBlockDraft = Omit<TimeBlock, "id" | "createdAt" | "updatedAt">;

