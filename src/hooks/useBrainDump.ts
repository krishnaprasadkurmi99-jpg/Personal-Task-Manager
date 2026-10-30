import { useCallback, useEffect, useState } from "react";
import type { BrainDumpDraft, BrainDumpNote, BrainDumpNoteUpdate } from "../data/brainDump";
import {
  createBrainDumpNote,
  deleteBrainDumpNote,
  listBrainDumpNotes,
  updateBrainDumpNote,
} from "../services/brainDumpService";
import { getSupabaseConfigurationError, isSupabaseConfigured } from "../services/supabase";

export function useBrainDump() {
  const [notes, setNotes] = useState<BrainDumpNote[]>([]);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [storageError, setStorageError] = useState<string | null>(
    isSupabaseConfigured
      ? null
      : getSupabaseConfigurationError(),
  );

  const reload = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setStorageError(getSupabaseConfigurationError());
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      setNotes(await listBrainDumpNotes());
      setStorageError(null);
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : "Your notes could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const create = useCallback(async (draft: BrainDumpDraft) => {
    try {
      const note = await createBrainDumpNote(draft);
      setNotes((current) => [note, ...current]);
      setStorageError(null);
      return note;
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : "Your note could not be saved.");
      throw error;
    }
  }, []);

  const update = useCallback(async (id: string, patch: BrainDumpNoteUpdate) => {
    try {
      const note = await updateBrainDumpNote(id, patch);
      setNotes((current) => current.map((item) => item.id === id ? note : item));
      setStorageError(null);
      return note;
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : "Your note could not be updated.");
      throw error;
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    try {
      await deleteBrainDumpNote(id);
      setNotes((current) => current.filter((item) => item.id !== id));
      setStorageError(null);
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : "Your note could not be deleted.");
      throw error;
    }
  }, []);

  return {
    notes,
    isLoading,
    storageError,
    isConfigured: isSupabaseConfigured,
    reload,
    create,
    update,
    remove,
  };
}
