-- Create public view for v2.user_preferences
CREATE OR REPLACE VIEW public.v2_user_preferences AS SELECT * FROM v2.user_preferences;
GRANT ALL ON public.v2_user_preferences TO authenticated, anon, service_role;

-- Enable security_invoker for the view (inherits RLS from underlying table)
ALTER VIEW public.v2_user_preferences SET (security_invoker = on);

-- Add comment
COMMENT ON VIEW public.v2_user_preferences IS 'Public view for v2.user_preferences table';
