import { useCallback, useEffect, useState } from "react";
import {
  timeBlockTypes,
  type TimeBlock,
  type TimeBlockDraft,
  type TimeBlockType,
} from "../data/calendar";

const STORAGE_KEY = "mindspace.time-blocks.v1";

type LoadResult = {
  blocks: TimeBlock[];
  error: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseBlock(value: unknown): TimeBlock | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.title !== "string" ||
    !value.title.trim() ||
    typeof value.startAt !== "string" ||
    typeof value.endAt !== "string" ||
    Number.isNaN(Date.parse(value.startAt)) ||
    Number.isNaN(Date.parse(value.endAt)) ||
    Date.parse(value.endAt) <= Date.parse(value.startAt) ||
    typeof value.type !== "string" ||
    !timeBlockTypes.some((type) => type === value.type)
  ) return null;

  const now = new Date().toISOString();
  return {
    id: value.id,
    title: value.title.trim(),
    type: value.type as TimeBlockType,
    startAt: value.startAt,
    endAt: value.endAt,
    notes: typeof value.notes === "string" ? value.notes : "",
    createdAt: typeof value.createdAt === "string" ? value.createdAt : now,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : now,
  };
}

function loadBlocks(): LoadResult {
  if (typeof window === "undefined") return { blocks: [], error: null };
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === null) return { blocks: [], error: null };
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return { blocks: [], error: "Saved time blocks could not be read." };
    }
    const blocks: TimeBlock[] = [];
    for (const item of parsed) {
      const block = parseBlock(item);
      if (!block) return { blocks: [], error: "Saved time blocks were incomplete." };
      blocks.push(block);
    }
    return { blocks, error: null };
  } catch {
    return { blocks: [], error: "Time-block storage is unavailable. Check your browser storage permissions." };
  }
}

function createId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useTimeBlocks() {
  const [loaded] = useState(loadBlocks);
  const [blocks, setBlocks] = useState(loaded.blocks);
  const [storageError, setStorageError] = useState<string | null>(loaded.error);

  useEffect(() => {
    if (loaded.error !== null && blocks === loaded.blocks) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(blocks));
      setStorageError(null);
    } catch {
      setStorageError("Time blocks could not be saved in this browser. Check storage permissions and available space.");
    }
  }, [blocks, loaded]);

  useEffect(() => {
    function syncFromAnotherTab(event: StorageEvent) {
      if (event.key !== STORAGE_KEY || event.newValue === null) return;
      try {
        const parsed: unknown = JSON.parse(event.newValue);
        if (!Array.isArray(parsed)) throw new Error("Saved time blocks are not a list.");
        const restored: TimeBlock[] = [];
        for (const value of parsed) {
          const block = parseBlock(value);
          if (!block) throw new Error("A saved time block is incomplete.");
          restored.push(block);
        }
        setBlocks(restored);
        setStorageError(null);
      } catch {
        setStorageError("Updates to time blocks from another tab could not be loaded.");
      }
    }

    window.addEventListener("storage", syncFromAnotherTab);
    return () => window.removeEventListener("storage", syncFromAnotherTab);
  }, []);

  const createBlock = useCallback((draft: TimeBlockDraft) => {
    const now = new Date().toISOString();
    const block: TimeBlock = { ...draft, id: createId(), createdAt: now, updatedAt: now };
    setBlocks((current) => [...current, block]);
    return block;
  }, []);

  const updateBlock = useCallback((id: string, patch: Partial<TimeBlockDraft>) => {
    setBlocks((current) =>
      current.map((block) => block.id === id
        ? { ...block, ...patch, updatedAt: new Date().toISOString() }
        : block),
    );
  }, []);

  const deleteBlock = useCallback((id: string) => {
    setBlocks((current) => current.filter((block) => block.id !== id));
  }, []);

  return { blocks, storageError, createBlock, updateBlock, deleteBlock };
}
