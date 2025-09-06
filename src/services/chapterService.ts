import { supabase } from "@/integrations/supabase/client";

export const updateChapterOrder = async (reorderedChapters: Array<{id: string, chapter_number: number}>, userId: string) => {
  try {
    const updates = reorderedChapters.map(chapter => 
      supabase
        .from('chapters')
        .update({ chapter_number: chapter.chapter_number })
        .eq('id', chapter.id)
        .eq('user_id', userId)
    );

    await Promise.all(updates);
    return { success: true };
  } catch (error) {
    console.error('Failed to update chapter order:', error);
    return { success: false, error };
  }
};