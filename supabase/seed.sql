-- Local test-only extension setup. Supabase CLI applies this seed only to the isolated local stack.
-- It is not a database migration and is not pushed to hosted projects by db push.
create schema if not exists extensions;
create extension if not exists pgtap with schema extensions;
