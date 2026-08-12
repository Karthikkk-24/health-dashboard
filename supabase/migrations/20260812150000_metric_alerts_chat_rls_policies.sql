-- Defense-in-depth for PHI tables introduced without policies (#6).
-- API continues to use the service_role key (bypasses RLS by design).
-- Policies + privilege revoke protect accidental anon/authenticated access.

ALTER TABLE public.metric_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_chat_messages ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.metric_alerts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.report_chat_messages FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own metric alerts" ON public.metric_alerts;
CREATE POLICY "Users manage own metric alerts" ON public.metric_alerts
  FOR ALL
  USING (
    user_id IN (
      SELECT id FROM public.users
      WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT id FROM public.users
      WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

DROP POLICY IF EXISTS "Users manage own report chat messages" ON public.report_chat_messages;
CREATE POLICY "Users manage own report chat messages" ON public.report_chat_messages
  FOR ALL
  USING (
    user_id IN (
      SELECT id FROM public.users
      WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT id FROM public.users
      WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

-- Fail closed for PostgREST roles; Nest API uses service_role only.
REVOKE ALL ON TABLE public.metric_alerts FROM anon, authenticated;
REVOKE ALL ON TABLE public.report_chat_messages FROM anon, authenticated;
GRANT ALL ON TABLE public.metric_alerts TO service_role;
GRANT ALL ON TABLE public.report_chat_messages TO service_role;
