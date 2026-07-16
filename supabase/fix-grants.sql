-- شغّل هذا مرة واحدة في Supabase SQL Editor لإصلاح صلاحيات service_role
-- (الجداول موجودة لكنها لم تُمنح الصلاحيات تلقائياً)

grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all functions in schema public to service_role;

alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant all on functions to service_role;

-- صلاحيات مخزن الصور (Storage) لنفس السبب
grant usage on schema storage to service_role;
grant all on storage.objects to service_role;
grant all on storage.buckets to service_role;
