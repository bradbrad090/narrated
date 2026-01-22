-- Revoke direct execute permission on delete_user_and_related_data function
-- Only delete_my_account() should be accessible to authenticated users
REVOKE EXECUTE ON FUNCTION public.delete_user_and_related_data(UUID) FROM authenticated;

-- Ensure delete_my_account remains accessible (it enforces auth.uid() internally)
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;