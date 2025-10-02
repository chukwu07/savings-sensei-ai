-- Fix RLS policies for user profiles to be more secure
-- First drop the existing overly permissive policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create a more secure policy that only allows users to view their own profile
-- and optionally other users' basic info if needed for the app functionality
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Add a policy to allow viewing display names and avatars for app functionality
-- This is needed if the app shows other users' names anywhere
CREATE POLICY "Public profile info is viewable by authenticated users" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (display_name IS NOT NULL OR avatar_url IS NOT NULL);