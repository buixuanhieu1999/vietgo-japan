INSERT INTO public.user_roles (user_id, role)
VALUES ('2e9f0502-08c3-4a4b-9083-025e9bc12a0c', 'super_admin')
ON CONFLICT (user_id, role) DO UPDATE SET revoked_at = NULL;
INSERT INTO public.user_roles (user_id, role)
VALUES ('2e9f0502-08c3-4a4b-9083-025e9bc12a0c', 'admin')
ON CONFLICT (user_id, role) DO UPDATE SET revoked_at = NULL;
SELECT role FROM public.user_roles WHERE user_id = '2e9f0502-08c3-4a4b-9083-025e9bc12a0c' AND revoked_at IS NULL;
