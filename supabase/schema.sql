-- Daivik Doorstep Car Care — Supabase schema
-- Run this entire file once in Supabase SQL Editor.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.bookings (
  id text primary key,
  booking_token uuid not null default extensions.gen_random_uuid(),
  name text not null,
  phone text not null check (phone ~ '^[0-9]{10}$'),
  vehicle text not null check (vehicle in ('hatchback','sedan','compact-suv','mid-suv','full-suv','luxury-suv')),
  model text,
  wash text not null check (wash in ('basic','medium','premium')),
  date date not null,
  time text not null,
  address text not null,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  distance_km numeric(8,3) not null default 0,
  location_charge integer not null default 0,
  addon integer not null default 0 check (addon in (0,199,299,349,399,499)),
  base_price integer not null,
  total integer not null,
  status text not null default 'Pending Confirmation' check (status in ('Pending Confirmation','Accepted','Cancelled','Completed')),
  accepted_date date,
  accepted_time text,
  scheduled_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cancelled_at timestamptz
);

create index if not exists bookings_created_at_idx on public.bookings(created_at desc);
create index if not exists bookings_scheduled_at_idx on public.bookings(scheduled_at);
create index if not exists bookings_phone_idx on public.bookings(phone);

alter table public.bookings enable row level security;

drop policy if exists "Admins can read bookings" on public.bookings;
create policy "Admins can read bookings"
on public.bookings for select to authenticated
using ((auth.jwt() ->> 'email') = 'anirudhpratapsingh.mba@gmail.com');

drop policy if exists "Admins can update bookings" on public.bookings;
create policy "Admins can update bookings"
on public.bookings for update to authenticated
using ((auth.jwt() ->> 'email') = 'anirudhpratapsingh.mba@gmail.com')
with check ((auth.jwt() ->> 'email') = 'anirudhpratapsingh.mba@gmail.com');

drop policy if exists "Admins can delete bookings" on public.bookings;
create policy "Admins can delete bookings"
on public.bookings for delete to authenticated
using ((auth.jwt() ->> 'email') = 'anirudhpratapsingh.mba@gmail.com');

create or replace function public.create_booking(
  p_name text,
  p_phone text,
  p_vehicle text,
  p_model text,
  p_wash text,
  p_date date,
  p_time text,
  p_address text,
  p_lat double precision,
  p_lng double precision,
  p_addon integer,
  p_scheduled_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id text;
  v_distance numeric(8,3);
  v_location_charge integer;
  v_base_price integer;
  v_total integer;
  v_row public.bookings;
begin
  if trim(coalesce(p_name,'')) = '' or p_phone !~ '^[0-9]{10}$' then
    raise exception 'Invalid customer details';
  end if;

  if p_vehicle not in ('hatchback','sedan','compact-suv','mid-suv','full-suv','luxury-suv') then
    raise exception 'Invalid vehicle category';
  end if;

  if p_wash not in ('basic','medium','premium') then
    raise exception 'Invalid wash type';
  end if;

  if p_addon not in (0,199,299,349,399,499) then
    raise exception 'Invalid add-on';
  end if;

  if trim(coalesce(p_address,'')) = '' then
    raise exception 'Service address is required';
  end if;

  -- Daivik base: 29.972586, 78.062215
  v_distance := round((
    6371 * 2 * asin(
      sqrt(
        power(sin(radians(p_lat - 29.972586) / 2), 2) +
        cos(radians(29.972586)) * cos(radians(p_lat)) *
        power(sin(radians(p_lng - 78.062215) / 2), 2)
      )
    )
  )::numeric, 3);

  v_location_charge := case
    when v_distance > 10 then round((v_distance - 10) * 8)
    else 0
  end;

  v_base_price := case p_vehicle
    when 'hatchback' then case p_wash when 'basic' then 399 when 'medium' then 599 else 899 end
    when 'sedan' then case p_wash when 'basic' then 499 when 'medium' then 699 else 999 end
    when 'compact-suv' then case p_wash when 'basic' then 599 when 'medium' then 799 else 1099 end
    when 'mid-suv' then case p_wash when 'basic' then 699 when 'medium' then 899 else 1199 end
    when 'full-suv' then case p_wash when 'basic' then 799 when 'medium' then 999 else 1299 end
    when 'luxury-suv' then case p_wash when 'basic' then 999 when 'medium' then 1199 else 1499 end
  end;

  v_total := v_base_price + p_addon + v_location_charge;
  v_id := 'DVK-' || upper(substr(md5(extensions.gen_random_uuid()::text),1,8));

  insert into public.bookings (
    id,name,phone,vehicle,model,wash,date,time,address,lat,lng,
    distance_km,location_charge,addon,base_price,total,status,scheduled_at
  )
  values (
    v_id,trim(p_name),p_phone,p_vehicle,nullif(trim(coalesce(p_model,'')),''),p_wash,
    p_date,p_time,trim(p_address),p_lat,p_lng,v_distance,v_location_charge,p_addon,
    v_base_price,v_total,'Pending Confirmation',p_scheduled_at
  )
  returning * into v_row;

  return jsonb_build_object(
    'id',v_row.id,
    'booking_token',v_row.booking_token,
    'name',v_row.name,
    'phone',v_row.phone,
    'vehicle',v_row.vehicle,
    'model',v_row.model,
    'wash',v_row.wash,
    'date',v_row.date,
    'time',v_row.time,
    'address',v_row.address,
    'lat',v_row.lat,
    'lng',v_row.lng,
    'distanceKm',v_row.distance_km,
    'locationCharge',v_row.location_charge,
    'addon',v_row.addon,
    'total',v_row.total,
    'status',v_row.status
  );
end;
$$;

create or replace function public.track_booking(p_booking_id text)
returns table(status text, accepted_date date, accepted_time text)
language sql
security definer
set search_path = ''
as $$
  select b.status, b.accepted_date, b.accepted_time
  from public.bookings b
  where upper(b.id) = upper(trim(p_booking_id))
  limit 1;
$$;

create or replace function public.cancel_booking(p_booking_id text, p_booking_token uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.bookings
  set status='Cancelled', cancelled_at=now(), updated_at=now()
  where upper(id)=upper(trim(p_booking_id))
    and booking_token=p_booking_token
    and status in ('Pending Confirmation','Accepted')
    and scheduled_at > now() + interval '2 hours';

  return found;
end;
$$;

revoke all on table public.bookings from anon, authenticated;
grant select, update, delete on public.bookings to authenticated;

revoke all on function public.create_booking(text,text,text,text,text,date,text,text,double precision,double precision,integer,timestamptz) from public;
grant execute on function public.create_booking(text,text,text,text,text,date,text,text,double precision,double precision,integer,timestamptz) to anon, authenticated;

revoke all on function public.track_booking(text) from public;
grant execute on function public.track_booking(text) to anon, authenticated;

revoke all on function public.cancel_booking(text,uuid) from public;
grant execute on function public.cancel_booking(text,uuid) to anon, authenticated;
