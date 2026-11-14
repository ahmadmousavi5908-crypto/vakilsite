-- Local test-only extension setup. This seed runs only in the isolated local Supabase stack.
-- It is not a database migration and is not pushed to hosted projects by db push.
create schema if not exists extensions;
create extension if not exists pgtap with schema extensions;
