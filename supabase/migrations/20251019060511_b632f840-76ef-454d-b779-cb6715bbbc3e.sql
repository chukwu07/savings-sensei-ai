-- Add length constraints to tables for security

-- Transactions table constraints
ALTER TABLE transactions 
  ADD CONSTRAINT description_length CHECK (length(description) <= 200),
  ADD CONSTRAINT category_length CHECK (length(category) <= 50);

-- Budgets table constraints
ALTER TABLE budgets 
  ADD CONSTRAINT budget_category_length CHECK (length(category) <= 50),
  ADD CONSTRAINT allocated_positive CHECK (allocated > 0),
  ADD CONSTRAINT spent_non_negative CHECK (spent >= 0);

-- Savings goals table constraints
ALTER TABLE savings_goals 
  ADD CONSTRAINT goal_name_length CHECK (length(name) <= 100),
  ADD CONSTRAINT target_amount_positive CHECK (target_amount > 0),
  ADD CONSTRAINT current_amount_non_negative CHECK (current_amount >= 0);

-- Profiles table constraints
ALTER TABLE profiles 
  ADD CONSTRAINT display_name_length CHECK (length(display_name) <= 100);

-- Conversation history table constraints
ALTER TABLE conversation_history 
  ADD CONSTRAINT message_content_length CHECK (length(content) <= 2000);