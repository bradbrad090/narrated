-- Fix all RLS policies to explicitly target authenticated role only (not anonymous)

-- ===== auth.users policies =====
DROP POLICY IF EXISTS "Admins can view all users" ON auth.users;
DROP POLICY IF EXISTS "Users can delete their own record" ON auth.users;
DROP POLICY IF EXISTS "Users can update their own record" ON auth.users;
DROP POLICY IF EXISTS "Users can view their own record" ON auth.users;

CREATE POLICY "Admins can view all users" ON auth.users FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view their own record" ON auth.users FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update their own record" ON auth.users FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can delete their own record" ON auth.users FOR DELETE TO authenticated USING (auth.uid() = id);

-- ===== public.ai_chapter_metadata policies =====
DROP POLICY IF EXISTS "Authenticated users can manage their own metadata" ON public.ai_chapter_metadata;
CREATE POLICY "Authenticated users can manage their own metadata" ON public.ai_chapter_metadata FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ===== public.book_profiles policies =====
DROP POLICY IF EXISTS "Authenticated users can manage their own book profiles" ON public.book_profiles;
CREATE POLICY "Authenticated users can manage their own book profiles" ON public.book_profiles FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ===== public.books policies =====
DROP POLICY IF EXISTS "Admins can view all books" ON public.books;
DROP POLICY IF EXISTS "Authenticated users can manage their own books" ON public.books;
CREATE POLICY "Admins can view all books" ON public.books FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated users can manage their own books" ON public.books FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ===== public.chapter_email_logs policies =====
DROP POLICY IF EXISTS "Users can view their own email logs" ON public.chapter_email_logs;
CREATE POLICY "Users can view their own email logs" ON public.chapter_email_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ===== public.chapter_photos policies =====
DROP POLICY IF EXISTS "Users can delete their own chapter photos" ON public.chapter_photos;
DROP POLICY IF EXISTS "Users can view their own chapter photos" ON public.chapter_photos;
DROP POLICY IF EXISTS "Users can insert their own chapter photos" ON public.chapter_photos;
DROP POLICY IF EXISTS "Users can update their own chapter photos" ON public.chapter_photos;
CREATE POLICY "Users can view their own chapter photos" ON public.chapter_photos FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own chapter photos" ON public.chapter_photos FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own chapter photos" ON public.chapter_photos FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own chapter photos" ON public.chapter_photos FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ===== public.chapters policies =====
DROP POLICY IF EXISTS "Admins can view all chapters" ON public.chapters;
DROP POLICY IF EXISTS "Authenticated users can manage their own chapters" ON public.chapters;
CREATE POLICY "Admins can view all chapters" ON public.chapters FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated users can manage their own chapters" ON public.chapters FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ===== public.chat_histories policies =====
DROP POLICY IF EXISTS "Users can delete their own chat histories" ON public.chat_histories;
DROP POLICY IF EXISTS "Users can update their own chat histories" ON public.chat_histories;
DROP POLICY IF EXISTS "Users can view their own chat histories" ON public.chat_histories;
DROP POLICY IF EXISTS "Users can insert their own chat histories" ON public.chat_histories;
CREATE POLICY "Users can view their own chat histories" ON public.chat_histories FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own chat histories" ON public.chat_histories FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own chat histories" ON public.chat_histories FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own chat histories" ON public.chat_histories FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ===== public.conversation_context_cache policies =====
DROP POLICY IF EXISTS "Authenticated users can manage their own context cache" ON public.conversation_context_cache;
CREATE POLICY "Authenticated users can manage their own context cache" ON public.conversation_context_cache FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ===== public.gift_codes policies =====
DROP POLICY IF EXISTS "Purchasers can view own gifts" ON public.gift_codes;
DROP POLICY IF EXISTS "Recipients can view gifts" ON public.gift_codes;
DROP POLICY IF EXISTS "Users can redeem gifts" ON public.gift_codes;
-- Gift codes may need to be viewed by non-logged-in recipients, but updates (redemption) require auth
CREATE POLICY "Purchasers can view own gifts" ON public.gift_codes FOR SELECT TO authenticated USING (purchaser_email = (SELECT email FROM auth.users WHERE id = auth.uid()));
CREATE POLICY "Recipients can view gifts by code" ON public.gift_codes FOR SELECT TO authenticated USING (recipient_email = (SELECT email FROM auth.users WHERE id = auth.uid()));
CREATE POLICY "Users can redeem gifts" ON public.gift_codes FOR UPDATE TO authenticated USING (redeemed = false AND redeemed_by IS NULL);

-- ===== public.orders policies =====
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
CREATE POLICY "Users can view their own orders" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all orders" ON public.orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ===== public.pdf_jobs policies =====
DROP POLICY IF EXISTS "Users can view their own pdf jobs" ON public.pdf_jobs;
DROP POLICY IF EXISTS "Users can manage their own pdf jobs" ON public.pdf_jobs;
CREATE POLICY "Users can manage their own pdf jobs" ON public.pdf_jobs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ===== public.profile_question_responses policies =====
DROP POLICY IF EXISTS "Authenticated users can manage their own responses" ON public.profile_question_responses;
CREATE POLICY "Authenticated users can manage their own responses" ON public.profile_question_responses FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ===== public.user_roles policies =====
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ===== public.users policies =====
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Admins can view all users" ON public.users FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE TO authenticated USING (auth.uid() = id);