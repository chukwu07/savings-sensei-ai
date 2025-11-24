-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

-- Create a new policy using the has_role function (no recursion)
CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));