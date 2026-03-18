-- Force PostgREST schema cache refresh after exposing hr schema
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';