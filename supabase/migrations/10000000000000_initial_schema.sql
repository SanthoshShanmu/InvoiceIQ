-- Enable Row Level Security
alter table auth.users enable row level security;

-- Create profiles table
create table public.profiles (
  id uuid references auth.users(id) not null primary key,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Create invoices table
create table public.invoices (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  vendor text not null,
  invoice_number text,
  issue_date date not null,
  due_date date not null,
  amount decimal not null,
  tax decimal,
  currency text default 'USD',
  status text default 'pending' not null,
  category text,
  notes text,
  file_path text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Create account_connections table
create table public.account_connections (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  provider text not null,
  credentials jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Create payment_records table
create table public.payment_records (
  id uuid default uuid_generate_v4() primary key,
  invoice_id uuid references public.invoices(id) not null,
  amount decimal not null,
  payment_date timestamp with time zone not null,
  payment_method text not null,
  stripe_payment_id text,
  created_at timestamp with time zone default now() not null
);

-- Create reminders table
create table public.reminders (
  id uuid default uuid_generate_v4() primary key,
  invoice_id uuid references public.invoices(id) not null,
  reminder_date timestamp with time zone not null,
  status text default 'scheduled' not null,
  message text,
  created_at timestamp with time zone default now() not null
);

-- Set up Row Level Security policies
create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

create policy "Users can view own invoices"
  on invoices for select
  using (auth.uid() = user_id);

create policy "Users can insert own invoices"
  on invoices for insert
  with check (auth.uid() = user_id);

create policy "Users can update own invoices"
  on invoices for update
  using (auth.uid() = user_id);

create policy "Users can delete own invoices"
  on invoices for delete
  using (auth.uid() = user_id);

create policy "Users can view own connections"
  on account_connections for select
  using (auth.uid() = user_id);

create policy "Users can manage own connections"
  on account_connections for all
  using (auth.uid() = user_id);

create policy "Users can view payment records for their invoices"
  on payment_records for select
  using (exists (
    select 1 from invoices
    where invoices.id = payment_records.invoice_id
    and invoices.user_id = auth.uid()
  ));

create policy "Users can view reminders for their invoices"
  on reminders for select
  using (exists (
    select 1 from invoices
    where invoices.id = reminders.invoice_id
    and invoices.user_id = auth.uid()
  ));

-- Create a function to handle updated_at
create or replace function handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create triggers for updated_at
create trigger set_profiles_updated_at
before update on profiles
for each row execute function handle_updated_at();

create trigger set_invoices_updated_at
before update on invoices
for each row execute function handle_updated_at();

create trigger set_account_connections_updated_at
before update on account_connections
for each row execute function handle_updated_at();