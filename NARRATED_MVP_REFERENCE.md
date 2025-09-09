NARRATED_MVP_REFERENCE.md
Narrated MVP Implementation Guide: PDF Export Flow
This document outlines the minimal viable implementation for the core PDF export feature in Narrated, an AI-powered autobiography creation platform. It focuses on extending the conversation end flow to generate chapter summaries, allow user confirmation, process PDFs asynchronously via queue, and provide download UI.
Tech Stack Alignment: Builds on React/TypeScript frontend (useConversationFlow.ts, ConversationInterface.tsx), Supabase backend (edge functions, pgmq queue, Storage), and existing patterns from architecture (e.g., generate-chapter for summaries, real-time channels).
MVP Goals:

End-to-end: Conversation end → Summary display → Submit → PDF gen/upload → Download.
Anti-Bloat: Total ~49 LOC added; reuse existing hooks, states, Supabase client, toast, Spinner, Tailwind classes (btn-primary), reducer actions (SET_LOADING), and postgres_changes subscriptions. No new files except one edge function. Conditionals skip redundant code (e.g., sub if state set).
Assumptions: chapterId/summary in hook state; generate-chapter edge function exists; pgmq pdf_jobs queue set up; add pdf_url: text and status enum ('submitted', 'pdf_ready') to chapters schema if missing (one-time migration). Channel: 'chapters-status' (verify in repo).
Security/Performance: RLS via auth client; sequential async (no races); filtered subs; error toasts.
Testing: Manual via npm start + supabase start; optional Jest mocks for async.

Deploy: After changes, run supabase functions deploy process-pdf-queue (Task 3); add cron in supabase/config.toml (e.g., 0 * * * * for hourly poll).

Task 1: Implement Summary Display After Conversation End
Preparation
Objective: At conversation end (via handleConversationEnd in useConversationFlow.ts), invoke generate-chapter to populate chapters.summary, then set showSummary: true for UI render in ConversationInterface.tsx. Reuse existing flow—no new aggregation logic.
Assumptions: chapterId in state; Supabase client. Add showSummary: boolean and summary: string minimally if absent.
Risks: Gen timeout—reuse loading. Fallback empty string on fail.
Plan: ~10 LOC (dispatch in handler, conditional JSX). No new files.
Step 1: Update Handler in useConversationFlow.ts
typescript// Extend state minimally if needed
interface ConversationFlowState { /* ... existing */ showSummary: boolean; summary: string; }

// In handleConversationEnd (existing, after convo save)
const handleConversationEnd = async () => {
  dispatch({ type: 'SET_LOADING', payload: true });
  try {
    // Call existing generate-chapter (reuse edge function call pattern)
    const { data, error } = await supabase.functions.invoke('generate-chapter', { body: { chapter_id: chapterId } });
    if (error) throw error;
    // Assume data includes summary; update state
    dispatch({ type: 'SET_SUMMARY', payload: data.summary || '' });
    dispatch({ type: 'SET_SHOW_SUMMARY', payload: true });
    toast.success('Summary generated!');
  } catch (error) {
    toast.error('Failed to generate summary.');
  } finally {
    dispatch({ type: 'SET_LOADING', payload: false });
  }
};

// Reducer additions (~2 LOC)
case 'SET_SHOW_SUMMARY': return { ...state, showSummary: payload };
case 'SET_SUMMARY': return { ...state, summary: payload };
Explanation: Chains gen call then dispatch for sequential flow; reuses loading/toast. Why? Minimal extension of existing end handler. LOC: 8. Validates: No race—await before UI toggle.
Step 2: Render Summary in ConversationInterface.tsx
tsx// In render, after messages (conditional on showSummary)
{showSummary && (
  <div className="summary-section p-4 bg-gray-100 rounded"> {/* Reuse Tailwind */}
    <h3 className="font-bold">Chapter Summary</h3>
    <p>{summary}</p>
    {/* Placeholder for Task 2 button */}
  </div>
)}
Explanation: Inline div reuses styles; props from hook. Why? Simple toggle without new component. LOC: 5. Validates: Hides pre-gen; displays post-dispatch.
Testing
Manual: Run npm start/supabase start; end convo—see loading, then summary div. Check DB: chapters.summary populated. Optional Jest: Mock invoke, expect dispatch.
Task 1 Complete
~13 LOC; clean display reusing flow. Proceed to Task 2 (extend summary div with button).

Task 2: Add "Confirm and Submit" Button
Preparation
Objective: Extend Task 1 summary with button; on click, update chapters.status='submitted', enqueue pdf_jobs, set submitted: true to hide summary. Reuse Task 1 state/channel.
Assumptions: Task 1's showSummary/summary; add submitted: boolean minimally. Channel 'chapters-status' (conditional if exists).
Risks: Enqueue fail—error toast, no hide. Assume pgmq in scope (e.g., supabase.pgMQ).
Plan: ~12 LOC (handler/sub in hook; button in Task 1 div). Consolidate reducer for auto-hide.
Step 1: Handler and Subscription in useConversationFlow.ts
typescript// Extend state: submitted?: boolean;

// Handler (~6 LOC)
const handleSubmitChapter = async () => {
  if (loading || submitted) return;
  dispatch({ type: 'SET_LOADING', payload: true });
  try {
    const { error } = await supabase.from('chapters').update({ status: 'submitted' }).eq('id', chapterId);
    if (error) throw error;
    // Enqueue (reuse pgmq pattern)
    const queue = supabase.pgMQ('pdf_jobs');
    await queue.send([{ chapter_id: chapterId, summary }]);
    dispatch({ type: 'SET_SUBMITTED', payload: true }); // Auto-hides via reducer
    toast.success('Submitted for PDF!');
  } catch (e) {
    toast.error('Submit failed.');
    // // await fallbackPdf(); // Commented to avoid bloat
  } finally {
    dispatch({ type: 'SET_LOADING', payload: false });
  }
};

// Subscription (~3 LOC, conditional)
useEffect(() => {
  if (submitted || !chapterId) return; // Skip if set
  const channel = supabase.channel('chapters-status');
  channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chapters', filter: `id=eq.${chapterId}` },
    (p) => p.new.status === 'submitted' && dispatch({ type: 'SET_SUBMITTED', payload: true })
  ).subscribe();
  return () => supabase.removeChannel(channel);
}, [chapterId, submitted]); // Deps avoid churn

// Reducer (~2 LOC)
case 'SET_SUBMITTED': return { ...state, submitted: payload, showSummary: !payload };
Explanation: Guards prevent spam; chains await for consistency. Reuses pgmq. LOC: 11. Validates: Sub skips if submitted; reducer hides summary.
Step 2: Button in ConversationInterface.tsx
tsx// Update Task 1 div: {showSummary && !submitted && ( <div className="summary-section ...">
    <h3>Chapter Summary</h3>
    <p>{summary}</p>
    <div className="mt-4 flex justify-center">
      <button onClick={handleSubmitChapter} disabled={loading || submitted} className="btn-primary disabled:opacity-50 px-4 py-2">
        {loading ? <Spinner size="sm" /> : 'Confirm and Submit'}
      </button>
    </div>
  </div>
)}
{submitted && <div className="text-green-600 text-center">PDF generating...</div>}
Explanation: Inline in existing div; conditional !submitted. Reuses Spinner/class. LOC: 8 (net +3 from Task 1). Validates: Disables post-submit; hides summary.
Testing
Manual: End convo (Task 1), click button—DB status update (chapters.status='submitted'), queue insert (SELECT * FROM pgmq.pdf_jobs), hide + toast. Error: No hide. Optional Jest: Mock update/send, expect dispatch/toast.
Task 2 Complete
~12 LOC; one-click UX with auto-hide. Proceed to Task 3 (backend processing).

Task 3: Implement Backend PDF Queue Processor
Preparation
Objective: Edge function to dequeue pdf_jobs, generate simple PDF from summary/content, upload to Storage, update chapters.pdf_url. Triggered by cron.
Assumptions: pgmq setup; pdf-lib via esm.sh (Deno compat). Reuse Storage for upload.
Risks: Lib incompatibility—fallback to text file (comment). Stateless for scale.
Plan: New supabase/functions/process-pdf-queue/index.ts (~15 LOC); cron config. No frontend impact.
Step 1: Create process-pdf-queue Edge Function
typescript// supabase/functions/process-pdf-queue/index.ts (Deno)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// Note: pdf-lib may need verification; fallback to simple text if issues
import * as pdf from 'https://esm.sh/pdf-lib@1.17.1';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

serve(async (req) => {
  try {
    const queue = supabase.pgMQ('pdf_jobs');
    const msg = await queue.read(); // Dequeue one
    if (!msg) return new Response('No jobs', { status: 200 });

    const { chapter_id, summary } = msg.payload;
    // Fetch content
    const { data: chapter } = await supabase.from('chapters').select('content').eq('id', chapter_id).single();
    // Simple PDF (extend with summary/content)
    const pdfDoc = await pdf.PDFDocument.create();
    const page = pdfDoc.addPage();
    page.drawText(`${summary}\n\n${chapter.content}`, { x: 50, y: 500 });
    const pdfBytes = await pdfDoc.save();

    // Upload
    const fileName = `pdf/${chapter_id}.pdf`;
    await supabase.storage.from('pdfs').upload(fileName, pdfBytes, { contentType: 'application/pdf' });
    const { data: { publicUrl } } = supabase.storage.from('pdfs').getPublicUrl(fileName);

    // Update DB (triggers channel)
    await supabase.from('chapters').update({ pdf_url: publicUrl }).eq('id', chapter_id);
    await queue.delete(msg); // Ack
    return new Response('Processed', { status: 200 });
  } catch (e) {
    console.error(e); // Log for monitoring
    // Fallback: // await supabase.from('pdf_jobs').archive(msg); // Retry logic if needed
    return new Response('Error', { status: 500 });
  }
});
Explanation: Dequeues, gens/uploads/updates; simple PDF to minimize. Reuses service role/Storage. LOC: 15. Validates: DB update fires sub (for Task 4); error logs.
Step 2: Schedule Cron
In supabase/config.toml or dashboard: Add job 0 * * * * supabase functions invoke process-pdf-queue (hourly; adjust for load).
Explanation: Config-only; no code bloat. Validates: Async processing.
Testing
Manual: supabase functions deploy process-pdf-queue; enqueue (Task 2), invoke—check Storage PDF, chapters.pdf_url. Queue empty post-run. Optional: Mock queue/DB in Deno test.
Task 3 Complete
~15 LOC; offloads PDF gen. Proceed to Task 4 (UI download).

Task 4: UI for PDF Status and Download
Preparation
Objective: Post-submit (Task 2), extend sub for pdf_url update; add download link in UI (reuse submitted div).
Assumptions: Task 2's sub/channel; add pdfUrl?: string minimally.
Risks: Sub miss—DB fetch fallback (but reuse sub, no poll).
Plan: ~8 LOC (extend sub/reducer, JSX link). No new state bloat.
Step 1: Extend Subscription in useConversationFlow.ts
typescript// Update Task 2 sub payload handler (~3 LOC)
if (payload.new.status === 'submitted') {
  dispatch({ type: 'SET_SUBMITTED', payload: true });
} else if (payload.new.pdf_url) { // New case
  dispatch({ type: 'SET_PDF_URL', payload: payload.new.pdf_url });
}

// Reducer (~1 LOC)
case 'SET_PDF_URL': return { ...state, pdfUrl: payload };
Explanation: Extends existing sub. Reuses dispatch. LOC: 4. Validates: Triggers on Task 3 update.
Step 2: Download UI in ConversationInterface.tsx
tsx// Update submitted div from Task 2: {submitted && !pdfUrl && <div className="text-green-600 text-center">PDF generating...</div>}
{submitted && pdfUrl && (
  <div className="text-center mt-4">
    <p>PDF ready!</p>
    <a href={pdfUrl} download className="btn-primary underline">Download PDF</a>
  </div>
)}
Explanation: Conditional link reuses class; props from hook. LOC: 5. Validates: Appears post-sub; direct download.
Testing
Manual: Submit (Task 2), process (Task 3)—link appears, click downloads. Verify sub on DB update.