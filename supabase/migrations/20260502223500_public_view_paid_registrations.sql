-- Allow everyone to view registrations that are marked as PAID or APPROVED
-- This enables the public "Registered Teams" list in the sidebar
DROP POLICY IF EXISTS "Public can view confirmed registrations" ON public.registrations;

CREATE POLICY "Public can view confirmed registrations"
ON public.registrations FOR SELECT
TO public
USING (payment_status IN ('PAID', 'APPROVED'));
