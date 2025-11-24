-- Assign admin role to chukwudube@gmail.com
INSERT INTO public.user_roles (user_id, role) 
VALUES ('1a2a8a58-cb6a-4312-963d-4e0dfa804caf', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;