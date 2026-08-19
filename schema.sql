create type public.app_role as enum ('employee', 'administrator');
create type public.leave_status as enum ('pending', 'approved', 'rejected', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  job_title text not null default 'Employee',
  department text not null default 'General',
  role public.app_role not null default 'employee',
  created_at timestamptz not null default now()
);
create table public.leave_balances (
  id bigint generated always as identity primary key,
  employee_id uuid not null references public.profiles(id) on delete cascade,
  leave_type text not null check (leave_type in ('annual','sick','casual','maternity','paternity','unpaid')),
  allowance numeric(6,2),
  remaining numeric(6,2) not null default 0,
  unique(employee_id, leave_type)
);
create table public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id) on delete cascade,
  leave_type text not null check (leave_type in ('annual','sick','casual','maternity','paternity','unpaid')),
  start_date date not null,
  end_date date not null,
  days numeric(5,2) not null check (days > 0),
  reason text not null check (char_length(reason) >= 10),
  handover text not null,
  time_option text not null check (time_option in ('full','morning','afternoon')),
  status public.leave_status not null default 'pending',
  decision_comment text,
  decided_by uuid references public.profiles(id),
  decided_at timestamptz,
  applied_on timestamptz not null default now(),
  check (end_date >= start_date)
);
create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id), action text not null,
  request_id uuid references public.leave_requests(id), details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'administrator');
$$;
alter table public.profiles enable row level security;
alter table public.leave_balances enable row level security;
alter table public.leave_requests enable row level security;
alter table public.audit_logs enable row level security;
create policy "users view own profile" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "admins manage balances" on public.leave_balances for all using (public.is_admin()) with check (public.is_admin());
create policy "employees view own balance" on public.leave_balances for select using (employee_id = auth.uid());
create policy "employees view own requests" on public.leave_requests for select using (employee_id = auth.uid() or public.is_admin());
create policy "employees view approved team calendar" on public.leave_requests for select using (status = 'approved');
create policy "employees submit own requests" on public.leave_requests for insert with check (employee_id = auth.uid());
drop policy if exists "employees cancel own pending requests" on public.leave_requests;
create policy "employees cancel own pending requests" on public.leave_requests for update using (employee_id = auth.uid() and status = 'pending') with check (employee_id = auth.uid() and status = 'cancelled');
create policy "admins write requests" on public.leave_requests for update using (public.is_admin()) with check (public.is_admin());
create policy "admins view audit" on public.audit_logs for select using (public.is_admin());
create policy "signed in write audit" on public.audit_logs for insert with check (actor_id = auth.uid());

create or replace function public.apply_leave_decision() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status <> 'pending' then raise exception 'Only pending requests can change status'; end if;
  if new.status = 'approved' then
    update public.leave_balances set remaining = remaining - new.days
      where employee_id = new.employee_id and leave_type = new.leave_type and (allowance is null or remaining >= new.days);
    if not found and new.leave_type <> 'unpaid' then raise exception 'Insufficient leave balance'; end if;
  end if;
  return new;
end;
$$;
create trigger apply_leave_decision before update of status on public.leave_requests for each row when (new.status in ('approved','rejected','cancelled')) execute procedure public.apply_leave_decision();

insert into storage.buckets (id, name, public) values ('leave-attachments', 'leave-attachments', false) on conflict (id) do nothing;
create policy "employees upload own attachments" on storage.objects for insert to authenticated with check (bucket_id = 'leave-attachments' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "employees read own attachments" on storage.objects for select to authenticated using (bucket_id = 'leave-attachments' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- Run this trigger after creating a user, then add initial balances through the admin UI or SQL.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))); return new; end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();