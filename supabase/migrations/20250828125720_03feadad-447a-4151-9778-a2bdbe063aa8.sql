-- Remove the unique constraint on user_id and category to allow multiple budgets per category
ALTER TABLE public.budgets DROP CONSTRAINT IF EXISTS budgets_user_id_category_key;