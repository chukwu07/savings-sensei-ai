-- Fix security vulnerability in subscribers table
-- The user_id column being nullable creates a potential security hole

-- Step 1: Make user_id NOT NULL to prevent bypassing RLS
ALTER TABLE public.subscribers 
ALTER COLUMN user_id SET NOT NULL;

-- Step 2: Add validation trigger to ensure user_id matches authenticated user
CREATE OR REPLACE FUNCTION public.validate_subscriber_user_ownership()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure the user_id matches the authenticated user
  IF NEW.user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: Cannot create or modify subscription records for other users';
  END IF;
  
  -- Ensure user_id is never null (double protection)
  IF NEW.user_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: user_id cannot be null';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Step 3: Create trigger for INSERT operations
CREATE TRIGGER validate_subscriber_ownership_insert
  BEFORE INSERT ON public.subscribers
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_subscriber_user_ownership();

-- Step 4: Create trigger for UPDATE operations  
CREATE TRIGGER validate_subscriber_ownership_update
  BEFORE UPDATE ON public.subscribers
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_subscriber_user_ownership();

-- Step 5: Add a check constraint as additional protection
ALTER TABLE public.subscribers 
ADD CONSTRAINT subscribers_user_id_not_null 
CHECK (user_id IS NOT NULL);

-- Step 6: Update RLS policies to be more explicit
DROP POLICY IF EXISTS "Users can insert only their own subscription" ON public.subscribers;
DROP POLICY IF EXISTS "Users can update only their own subscription" ON public.subscribers;
DROP POLICY IF EXISTS "Users can view only their own subscription" ON public.subscribers;

-- Create more robust RLS policies
CREATE POLICY "Users can insert only their own subscription" 
ON public.subscribers 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id AND user_id IS NOT NULL);

CREATE POLICY "Users can update only their own subscription" 
ON public.subscribers 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id AND user_id IS NOT NULL)
WITH CHECK (auth.uid() = user_id AND user_id IS NOT NULL);

CREATE POLICY "Users can view only their own subscription" 
ON public.subscribers 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id AND user_id IS NOT NULL);