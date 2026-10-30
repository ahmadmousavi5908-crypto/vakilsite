-- Public office location settings with admin-only management.
-- The public website can read this record; only users with the admin role can change it.

create table if not exists public.site_settings (
  setting_key text primary key,
  office_name text not null default '',
  address text not null default '',
  city text not null default '',
  province text not null default '',
  postal_code text not null default '',
  latitude double precision,
  longitude double precision,
  map_url text not null default '',
  phone text not null default '',
  is_location_public boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint site_settings_key_length check (char_length(setting_key) between 2 and 60),
  constraint office_name_length check (char_length(office_name) <= 120),
  constraint office_address_length check (char_length(address) <= 500),
  constraint office_city_length check (char_length(city) <= 80),
  constraint office_province_length check (char_length(province) <= 80),
  constraint office_postal_code_length check (char_length(postal_code) <= 20),
  constraint office_phone_length check (char_length(phone) <= 30),
  constraint office_map_url_length check (char_length(map_url) <= 1000),
  constraint office_latitude_range check (latitude is null or latitude between -90 and 90),
  constraint office_longitude_range check (longitude is null or longitude between -180 and 180),
  constraint office_coordinates_pair check ((latitude is null) = (longitude is null))
);

insert into public.site_settings (setting_key)
values ('office_location')
on conflict (setting_key) do nothing;

alter table public.site_settings enable row level security;

drop policy if exists "Public can read published office location" on public.site_settings;
create policy "Public can read published office location"
  on public.site_settings for select
  to anon, authenticated
  using (setting_key = 'office_location' and is_location_public = true);

drop policy if exists "Admins can read all site settings" on public.site_settings;
create policy "Admins can read all site settings"
  on public.site_settings for select
  to authenticated
  using (public.is_site_admin());

drop policy if exists "Admins can insert site settings" on public.site_settings;
create policy "Admins can insert site settings"
  on public.site_settings for insert
  to authenticated
  with check (public.is_site_admin());

drop policy if exists "Admins can update site settings" on public.site_settings;
create policy "Admins can update site settings"
  on public.site_settings for update
  to authenticated
  using (public.is_site_admin())
  with check (public.is_site_admin());

grant select on public.site_settings to anon, authenticated;
grant insert, update on public.site_settings to authenticated;
