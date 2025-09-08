# Narrated MVP Reference: Tasks 1-4 Implementation Guide

## Overview

This plan consolidates Tasks 1-4 for a hands-off MVP focusing on automatic summary display, simple submission, and unified async PDF processing. **Total effort: 10-13 hours** (Task 1: 2h, Task 2: 1.5h, Unified 3-4: 6.5h). Anti-bloat measures include embedding UI in existing components, shared logic in one PDF function (~100-150 LOC total), reusing real-time channels, and inline templates. Prerequisites require one-time Supabase setup (0.5-1 hour) and verification of existing infrastructure.

**Key constraints:** Use TypeScript, async/await everywhere, RLS for all queries, deploy via Git, test incrementally with <50 LOC net add per task. Focus on seamless MVP without unnecessary abstractions.

---

## Prerequisites (One-Time: 0.5-1 hour)

1. **Enable Supabase Queues:** Dashboard > Extensions > pgmq
   ```sql
   SELECT pgmq.create('pdf_jobs');
   ```

2. **Add PDF URL Column:**
   ```sql
   ALTER TABLE books ADD COLUMN full_pdf_url TEXT;
   ```

3. **Verify Global Toast Utility:** Confirm `utils.ts` has simple wrapper (5-10 LOC)
   ```typescript
   export const toast = {
     error: (msg: string) => // existing toast implementation
   }
   ```

4. **Test Chapter Generation:** Manual test that `generate-chapter` populates summary/content eagerly

---

## Task 1: Integrate Summary Display Post-Conversation

**Objective:** Automate fetch and inline display of existing summary right after conversation end, embedded in ConversationInterface.tsx.

### Steps

1. **Update Flow Logic** (1 hour)
   ```typescript
   // In useConversationFlow.ts - extend handleConversationEnd()
   const handleConversationEnd = async () => {
     // After generate-chapter call
     const { data } = await supabase
       .from('chapters')
       .select('summary')
       .eq('id', chapterId)
       .single();
     
     setSummary(data.summary);
     setShowSummary(true);
   };
   ```

2. **Embed UI** (0.5 hour)
   ```tsx
   // In ConversationInterface.tsx - below message list
   {showSummary && (
     <div className="p-4 bg-white rounded shadow mt-4">
       <h2 className="text-lg font-bold">Chapter Summary</h2>
       <p className="mt-2">{summary.slice(0, 300)}...</p>
       <p className="text-sm text-gray-500 mt-2">
         The AI has crafted your full chapter behind the scenes.
       </p>
     </div>
   )}
   ```

3. **Error Handling** (0.5 hour)
   ```typescript
   try {
     // fetch logic above
   } catch (error) {
     toast.error("Failed to load summary—retry?");
     setShowRetry(true);
   }
   ```

### Anti-Bloat Notes
- ~20-30 LOC total (inline JSX, no new files)
- Truncate summary at 300 words
- Reuse existing styles/state—no new CSS/vars
- Remove any manual "Generate Summary" buttons

### Testing
- 2-3 Jest mocks in existing hook tests (success fetch shows div; error shows toast)
- Manual: Record → Auto-display; verify no content leak

### AI Prompts

1. **AI Prompt 1:** "Senior React dev: CoT for embedding summary fetch in existing handleConversationEnd(): 1. Await generation. 2. Fetch summary only via Supabase. 3. Set state/toggle flag. Minimal TS code (~20 LOC); reuse client/effects. Constraints: No new components; error toast via global util only."

2. **AI Prompt 2:** "UI expert: Few-shot inline summary in convo interface: Example {end && <div>Text</div>}. Now: Conditional div post-messages with summary + note. Tailwind responsive, no props/state vars."

3. **AI Prompt 3:** "Error pro: Add try-catch to fetch in hook. Structured: Risks (network/RLS), minimal code, 2 test mocks. Reuse global toast; no retry logic."

---

## Task 2: Implement Submission Confirmation

**Objective:** Add one-click button in summary section to update status and enqueue PDF job. Reuse real-time for status if convo channel exists.

### Steps

1. **Add Handler** (0.75 hour)
   ```typescript
   const handleSubmit = async () => {
     await supabase
       .from('chapters')
       .update({ status: 'submitted' })
       .eq('id', chapterId);
     
     await supabase.queue.send({
       queue_name: 'pdf_jobs',
       message: { type: 'chapter', chapter_id: chapterId }
     });
     
     setSubmitted(true);
   };
   ```

2. **Embed UI** (0.5 hour)
   ```tsx
   // Below summary div
   {!submitted && (
     <button 
       onClick={handleSubmit} 
       className="bg-blue-500 text-white px-4 py-2 rounded mt-2" 
       disabled={loading}
     >
       Confirm & Submit
     </button>
   )}
   
   {submitted && (
     <div className="mt-2 text-green-600">
       Submitted! PDF generating...
     </div>
   )}
   ```

3. **Error Handling** (0.25 hour)
   ```typescript
   try {
     // handler logic above
   } catch (error) {
     toast.error("Submission failed—try again?");
   }
   ```

### Anti-Bloat Notes
- ~15-20 LOC (inline button, no new state)
- Simple enqueue payload
- Reuse existing channel—add one subscription if needed (~5 LOC)
- No auto-retry—user can click again

### Testing
- 2 mocks in hook tests (update + enqueue calls)
- Manual: Submit → verify DB/queue update

### AI Prompts

1. **AI Prompt 1:** "Fullstack: Submit handler in existing hook—update status, enqueue {type:'chapter', id}. Reuse convo real-time for status. Minimal async code (~15 LOC); fallback direct call commented. Constraints: No new channels if possible."

2. **AI Prompt 2:** "UI: CoT for button in summary section: 1. Conditional on !submitted. 2. Click → handler. Few-shot: Simple disabled button. Tailwind only."

---

## Unified Task 3-4: Develop PDF Queue Consumer

**Objective:** Single edge function processes queue for both chapter (single PDF) and book (compiled PDF). Frontend trigger for book via Dashboard.

### Steps

1. **Function Setup** (1 hour)
   ```typescript
   // supabase/functions/pdf-processor/index.ts
   import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
   
   serve(async () => {
     while (true) {
       const { data: msg } = await supabase.queue.consume({
         queue_name: 'pdf_jobs'
       });
       
       if (!msg) continue;
       
       await processJob(msg.message);
       await supabase.queue.ack({ msg_id: msg.msg_id });
     }
   });
   ```

2. **Shared Processing Logic** (2.5 hours)
   ```typescript
   async function processJob(job: any) {
     let html: string;
     let filename: string;
     
     if (job.type === 'chapter') {
       const { data } = await supabase
         .from('chapters')
         .select('content, title')
         .eq('id', job.chapter_id)
         .single();
       
       html = `<html><head><style>
         body{font-family:serif;margin:1in;}
         h1{font-size:24pt;}
       </style></head><body>
         <h1>${data.title}</h1>
         <div class="content">${data.content}</div>
       </body></html>`;
       
       filename = `chapter-${job.chapter_id}.pdf`;
     }
     
     if (job.type === 'book') {
       const { data: chapters } = await supabase
         .from('chapters')
         .select('content, title, chapter_number')
         .eq('book_id', job.book_id)
         .eq('status', 'submitted')
         .order('chapter_number')
         .limit(10);
       
       html = `<html><head><style>
         body{font-family:serif;margin:1in;}
         h1{font-size:24pt;}
       </style></head><body>
         <h1>${bookTitle}</h1>
         <ol class="toc">
           ${chapters.map(c => 
             `<li>Chapter ${c.chapter_number}: ${c.title}</li>`
           ).join('')}
         </ol>
         ${chapters.map(c => 
           `<h2>${c.title}</h2>${c.content}`
         ).join('')}
       </body></html>`;
       
       filename = `book-${job.book_id}-full.pdf`;
     }
     
     // Generate PDF
     const browser = await puppeteer.launch({
       executablePath: await chromium.executablePath(),
       args: chromium.args
     });
     
     const page = await browser.newPage();
     await page.setContent(html);
     const pdfBuffer = await page.pdf({
       format: 'A4',
       printBackground: true
     });
     await browser.close();
     
     // Upload & Update DB
     const { data: { publicUrl } } = await supabase.storage
       .from('pdfs')
       .upload(filename, pdfBuffer);
     
     if (job.type === 'chapter') {
       await supabase.from('chapters')
         .update({ pdf_url: publicUrl })
         .eq('id', job.chapter_id);
     } else {
       await supabase.from('books')
         .update({ full_pdf_url: publicUrl })
         .eq('id', job.book_id);
     }
   }
   ```

3. **Book Trigger** (0.5 hour)
   ```typescript
   // In dashboard hook
   const { count } = await supabase
     .from('chapters')
     .select('id', { count: 'exact', head: true })
     .eq('book_id', bookId)
     .eq('status', 'submitted');
   
   if (count >= 3) {
     await supabase.queue.send({
       queue_name: 'pdf_jobs',
       message: { type: 'book', book_id: bookId }
     });
   }
   ```

4. **Error Handling** (0.5 hour)
   ```typescript
   try {
     await processJob(job);
   } catch (error) {
     await supabase.queue.move_to_dead_letter({ msg_id });
     await supabase.from('chapters')
       .update({ status: 'pdf_failed' })
       .eq('id', job.chapter_id || job.book_id);
   }
   ```

### Anti-Bloat Notes
- ~100-150 LOC total (shared fetch/HTML/Puppeteer functions)
- Slice chapters to 10 max
- No TOC pages (simple list only)
- Use Storage bucket 'pdfs' (create if needed)
- Dead-letter queue auto-configured

### Testing
- CLI serve local function
- Manual enqueue via SQL insert mock message
- Verify PDFs (1 chapter, 1 book with 3 dummy chapters)
- 4 Jest mocks for function flows

### AI Prompts

1. **AI Prompt 1:** "Edge dev: CoT for unified pdf-processor: 1. Consume/ack loop. 2. Branch on type (chapter: single select; book: multi order/limit 10). 3. Shared HTML (simple chapter; book prepends TOC list). 4. Puppeteer gen/upload/DB update. Minimal Deno code (~100 LOC); service role. Constraints: Inline style/strings; no extras like pages."

2. **AI Prompt 2:** "Templating: Few-shot shared HTML func: Input {type, data}. Example chapter: <h1>title</h1>content. Book: Add <ol>${map li title}</ol> before sections. Minimal inline CSS (serif, margins)."

3. **AI Prompt 3:** "Dashboard trigger + tests: React query for count >=3, enqueue book. 4 manual/CLI tests (chapter/book success/error). Concise code."

---

## Appendix: Cross-Task Tips

| Area | Guideline | Notes |
|------|-----------|--------|
| **Deployment** | Git push auto-deploys functions | No manual deployment needed |
| **Testing** | Test incrementally after each task | Full flow: record → submit → download |
| **Performance** | Reuse existing channels/clients | Avoid new WebSocket connections |
| **Storage** | Create 'pdfs' bucket if missing | Set appropriate RLS policies |
| **Error Recovery** | User can retry failed operations | No complex retry logic needed |
| **Scaling** | Queue handles concurrency naturally | Dead letter for failed jobs |

### Common Pitfalls
- Don't create new components for UI changes
- Verify RLS policies on new columns
- Test PDF generation with real chapter content
- Ensure service role permissions for queue operations