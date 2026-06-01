-- Grant permissions to service_role (for admin client)
GRANT ALL ON TABLE public.team_management_requests TO service_role;

-- Grant permissions to authenticated users (for regular client)
GRANT SELECT, INSERT ON TABLE public.team_management_requests TO authenticated;

-- Enable RLS
ALTER TABLE public.team_management_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own requests
CREATE POLICY "Users can insert own requests"
  ON public.team_management_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (requester_id = auth.uid());

-- Policy: Users can view their own requests
CREATE POLICY "Users can view own requests"
  ON public.team_management_requests
  FOR SELECT
  TO authenticated
  USING (requester_id = auth.uid());
