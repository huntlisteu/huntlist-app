-- =============================================================================
-- Huntlist — Schema Postgres (Beta, Fasi 1-3, SENZA pagamenti)
-- Target: Supabase (Postgres 15+). Eseguire nel SQL editor o via `supabase db push`.
-- Tutte le tabelle hanno RLS attiva. Nessuna tabella senza policy.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Estensioni
-- -----------------------------------------------------------------------------
create extension if not exists "pgcrypto";  -- gen_random_uuid()

-- -----------------------------------------------------------------------------
-- 1. Enum degli stati e tipi controllati
-- -----------------------------------------------------------------------------
create type game_type as enum ('pokemon', 'one_piece', 'yugioh');

create type hunt_status as enum ('open', 'closed', 'cancelled', 'expired');

create type offer_status as enum ('pending', 'accepted', 'rejected', 'withdrawn');

-- Scala di condizione standard TCG (dal migliore al peggiore).
create type card_condition as enum (
  'mint', 'near_mint', 'excellent', 'good', 'light_played', 'played', 'poor'
);

-- -----------------------------------------------------------------------------
-- 2. Trigger generico per updated_at
-- -----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. profiles — profilo pubblico legato a auth.users (1-1)
-- -----------------------------------------------------------------------------
create table profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  username     text unique not null check (char_length(username) between 3 and 30),
  display_name text not null check (char_length(display_name) between 1 and 60),
  avatar_url   text,
  bio          text check (bio is null or char_length(bio) <= 500),
  country      text not null default 'IT' check (char_length(country) = 2), -- ISO 3166-1 alpha-2
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
comment on table profiles is 'Profilo pubblico 1-1 con auth.users. Creato via trigger alla registrazione.';

create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- Crea automaticamente il profilo quando nasce un utente auth.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    -- username provvisorio univoco; l'utente lo personalizza dopo
    'user_' || substr(new.id::text, 1, 8),
    coalesce(new.raw_user_meta_data ->> 'display_name', 'Collezionista')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

alter table profiles enable row level security;

create policy "profiles: select per utenti autenticati"
  on profiles for select
  to authenticated
  using (true);

create policy "profiles: insert solo il proprio"
  on profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy "profiles: update solo il proprio"
  on profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- -----------------------------------------------------------------------------
-- 4. hunts — mancalista pubblicata da un acquirente
-- -----------------------------------------------------------------------------
create table hunts (
  id                uuid primary key default gen_random_uuid(),
  buyer_id          uuid not null references profiles (id) on delete cascade,
  title             text not null check (char_length(title) between 3 and 120),
  description       text check (description is null or char_length(description) <= 2000),
  game              game_type not null,
  status            hunt_status not null default 'open',
  accepted_offer_id uuid,  -- FK aggiunta dopo la creazione di offers (ciclo)
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  closed_at         timestamptz
);
comment on table hunts is 'Una Hunt = lista di carte cercate. Un''Offerta copre SEMPRE tutta la Hunt.';
comment on column hunts.accepted_offer_id is 'Offerta accettata; impostata quando status passa a closed.';

create index hunts_buyer_id_idx on hunts (buyer_id);
create index hunts_status_game_idx on hunts (status, game);
create index hunts_created_at_idx on hunts (created_at desc);

create trigger hunts_set_updated_at
  before update on hunts
  for each row execute function set_updated_at();

alter table hunts enable row level security;

-- Feed pubblico: chiunque (anche anon) vede le Hunt open. Il proprietario vede le proprie in qualsiasi stato.
create policy "hunts: select open a tutti"
  on hunts for select
  to anon, authenticated
  using (status = 'open');

create policy "hunts: select proprie in ogni stato"
  on hunts for select
  to authenticated
  using (buyer_id = auth.uid());

create policy "hunts: insert solo come proprietario"
  on hunts for insert
  to authenticated
  with check (buyer_id = auth.uid());

create policy "hunts: update solo proprietario"
  on hunts for update
  to authenticated
  using (buyer_id = auth.uid())
  with check (buyer_id = auth.uid());

create policy "hunts: delete solo proprietario"
  on hunts for delete
  to authenticated
  using (buyer_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 5. hunt_cards — singole carte cercate dentro una Hunt
-- -----------------------------------------------------------------------------
create table hunt_cards (
  id                uuid primary key default gen_random_uuid(),
  hunt_id           uuid not null references hunts (id) on delete cascade,
  name              text not null check (char_length(name) between 1 and 200),
  set_name          text,
  card_number       text,
  quantity          integer not null default 1 check (quantity between 1 and 999),
  desired_condition card_condition not null default 'near_mint',
  notes             text check (notes is null or char_length(notes) <= 500),
  image_url         text,
  created_at        timestamptz not null default now()
);
comment on table hunt_cards is 'Carte richieste in una Hunt. L''Offerta le copre tutte insieme.';

create index hunt_cards_hunt_id_idx on hunt_cards (hunt_id);

alter table hunt_cards enable row level security;

-- Helper: una Hunt è visibile a chi la legge (open per tutti, o propria).
create or replace function can_read_hunt(p_hunt_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from hunts h
    where h.id = p_hunt_id
      and (h.status = 'open' or h.buyer_id = auth.uid())
  );
$$;

create or replace function is_hunt_owner(p_hunt_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from hunts h where h.id = p_hunt_id and h.buyer_id = auth.uid()
  );
$$;

create policy "hunt_cards: select se hunt visibile"
  on hunt_cards for select
  to anon, authenticated
  using (can_read_hunt(hunt_id));

create policy "hunt_cards: insert se proprietario hunt"
  on hunt_cards for insert
  to authenticated
  with check (is_hunt_owner(hunt_id));

create policy "hunt_cards: update se proprietario hunt"
  on hunt_cards for update
  to authenticated
  using (is_hunt_owner(hunt_id))
  with check (is_hunt_owner(hunt_id));

create policy "hunt_cards: delete se proprietario hunt"
  on hunt_cards for delete
  to authenticated
  using (is_hunt_owner(hunt_id));

-- -----------------------------------------------------------------------------
-- 6. offers — offerta TOTALE (prezzo unico per l'intera Hunt)
-- -----------------------------------------------------------------------------
create table offers (
  id            uuid primary key default gen_random_uuid(),
  hunt_id       uuid not null references hunts (id) on delete cascade,
  seller_id     uuid not null references profiles (id) on delete cascade,
  total_price   numeric(10, 2) not null check (total_price >= 0),
  shipping_cost numeric(10, 2) not null default 0 check (shipping_cost >= 0),
  currency      text not null default 'EUR' check (char_length(currency) = 3),
  message       text check (message is null or char_length(message) <= 1000),
  status        offer_status not null default 'pending',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- Un solo "thread" attivo per venditore per Hunt: niente offerte duplicate.
  unique (hunt_id, seller_id)
);
comment on table offers is 'Offerta totale: un prezzo unico per TUTTA la Hunt. Mai sottoinsiemi.';

create index offers_hunt_id_idx on offers (hunt_id);
create index offers_seller_id_idx on offers (seller_id);

create trigger offers_set_updated_at
  before update on offers
  for each row execute function set_updated_at();

-- Ora possiamo chiudere il ciclo hunts.accepted_offer_id -> offers.id
alter table hunts
  add constraint hunts_accepted_offer_fk
  foreign key (accepted_offer_id) references offers (id) on delete set null;

alter table offers enable row level security;

create or replace function is_offer_participant(p_offer_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1
    from offers o
    join hunts h on h.id = o.hunt_id
    where o.id = p_offer_id
      and (o.seller_id = auth.uid() or h.buyer_id = auth.uid())
  );
$$;

-- Select: venditore dell'offerta o acquirente della Hunt.
create policy "offers: select partecipanti"
  on offers for select
  to authenticated
  using (
    seller_id = auth.uid()
    or exists (select 1 from hunts h where h.id = hunt_id and h.buyer_id = auth.uid())
  );

-- Insert: solo come venditore, Hunt open, non sulla propria Hunt.
create policy "offers: insert venditore su hunt open altrui"
  on offers for insert
  to authenticated
  with check (
    seller_id = auth.uid()
    and exists (
      select 1 from hunts h
      where h.id = hunt_id
        and h.status = 'open'
        and h.buyer_id <> auth.uid()
    )
  );

-- Update: il venditore (ritiro) o l'acquirente della Hunt (accetta/rifiuta).
-- NB: quali transizioni di status siano lecite è imposto dalla Server Action (Zod + logica).
create policy "offers: update partecipanti"
  on offers for update
  to authenticated
  using (
    seller_id = auth.uid()
    or exists (select 1 from hunts h where h.id = hunt_id and h.buyer_id = auth.uid())
  )
  with check (
    seller_id = auth.uid()
    or exists (select 1 from hunts h where h.id = hunt_id and h.buyer_id = auth.uid())
  );

-- -----------------------------------------------------------------------------
-- 7. offer_items — SNAPSHOT read-only di conferma (NON selezione parziale)
-- -----------------------------------------------------------------------------
create table offer_items (
  id                  uuid primary key default gen_random_uuid(),
  offer_id            uuid not null references offers (id) on delete cascade,
  hunt_card_id        uuid not null references hunt_cards (id) on delete cascade,
  confirmed_condition card_condition not null,
  confirmed_quantity  integer not null check (confirmed_quantity >= 1),
  note                text check (note is null or char_length(note) <= 300),
  created_at          timestamptz not null default now(),
  unique (offer_id, hunt_card_id)
);
comment on table offer_items is
  'Snapshot read-only: cosa il venditore conferma di avere per ogni carta. NON una selezione parziale; l''offerta copre comunque tutta la Hunt.';

create index offer_items_offer_id_idx on offer_items (offer_id);

alter table offer_items enable row level security;

-- Select: chi può vedere l'offerta padre.
create policy "offer_items: select se partecipante offerta"
  on offer_items for select
  to authenticated
  using (is_offer_participant(offer_id));

-- Insert: solo il venditore dell'offerta (alla creazione).
create policy "offer_items: insert solo venditore offerta"
  on offer_items for insert
  to authenticated
  with check (
    exists (select 1 from offers o where o.id = offer_id and o.seller_id = auth.uid())
  );

-- Nessuna policy di UPDATE/DELETE: snapshot immutabile (cascata via offer delete).

-- -----------------------------------------------------------------------------
-- 8. messages — chat acquirente <-> venditore sul thread di un'offerta
-- -----------------------------------------------------------------------------
create table messages (
  id         uuid primary key default gen_random_uuid(),
  offer_id   uuid not null references offers (id) on delete cascade,
  sender_id  uuid not null references profiles (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at    timestamptz
);
comment on table messages is 'Messaggi chat sul thread di un''offerta. Solo i due partecipanti.';

create index messages_offer_id_created_idx on messages (offer_id, created_at);

alter table messages enable row level security;

-- Select: solo i partecipanti del thread.
create policy "messages: select partecipanti"
  on messages for select
  to authenticated
  using (is_offer_participant(offer_id));

-- Insert: partecipante e sender = se stesso.
create policy "messages: insert partecipante come se stesso"
  on messages for insert
  to authenticated
  with check (sender_id = auth.uid() and is_offer_participant(offer_id));

-- Update consentito solo per marcare read_at (es. il destinatario); limitato ai partecipanti.
create policy "messages: update partecipanti"
  on messages for update
  to authenticated
  using (is_offer_participant(offer_id))
  with check (is_offer_participant(offer_id));

-- -----------------------------------------------------------------------------
-- 9. Realtime — abilita la pubblicazione sui messaggi (chat Fase 3)
-- -----------------------------------------------------------------------------
alter publication supabase_realtime add table messages;

-- =============================================================================
-- Fine schema beta. Tabelle pagamenti NON incluse (Fase 4+).
-- =============================================================================