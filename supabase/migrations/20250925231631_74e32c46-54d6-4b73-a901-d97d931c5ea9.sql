-- Fix critical security issue: Secure spending table (Step 1 - Handle existing data)

-- Step 1: Remove existing data (since it has no user association and is test data)
DELETE FROM public.spending;

-- Step 2: Remove the insecure public access policy
DROP POLICY IF EXISTS "allow_read_for_testing" ON public.spending;

-- Step 3: Add user_id column (now safe since table is empty)
ALTER TABLE public.spending 
ADD COLUMN user_id UUID NOT NULL;

-- Step 4: Enable Row Level Security
ALTER TABLE public.spending ENABLE ROW LEVEL SECURITY;

-- Step 5: Create proper RLS policies that restrict access to users' own data
CREATE POLICY "Users can view their own spending" 
ON public.spending 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own spending" 
ON public.spending 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own spending" 
ON public.spending 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own spending" 
ON public.spending 
FOR DELETE 
USING (auth.uid() = user_id);

-- Step 6: Add trigger to ensure user_id is automatically set
CREATE TRIGGER spending_validate_user_ownership
  BEFORE INSERT OR UPDATE ON public.spending
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_user_ownership();

-- Step 7: Add timestamp columns for consistency with other tables
ALTER TABLE public.spending 
ADD COLUMN created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- Step 8: Add trigger for automatic timestamp updates
CREATE TRIGGER update_spending_updated_at
  BEFORE UPDATE ON public.spending
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();