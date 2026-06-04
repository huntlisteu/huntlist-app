-- =============================================================================
-- Huntlist — Schema Postgres (beta, fasi 1-3, SENZA pagamenti)
-- Target: Supabase (PostgreSQL 15+). File unico, da eseguire una sola volta su
-- un database vuoto. Include tutti i fix di sicurezza e integrita'.
-- Convenzioni: identificatori in inglese snake_case, tabelle al plurale.
-- Sicurezza: RLS attiva su tutte le tabelle; le verifiche cross-tabella usano
--            funzioni SECURITY DEFINER per evitare ricorsione tra policy.
-- Ordine: estensioni -> enum -> tabelle -> indici -> funzioni helper ->
--         funzioni trigger -> trigger -> RLS -> policy -> grant -> realtime.
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- ENUM
-- -----------------------------------------------------------------------------

-- Giochi supportati. Una hunt appartiene a un solo gioco.
create type public.game_type as enum ('pokemon', 'one_piece', 'yugioh');

-- Stato della hunt.
--   open    -> accetta offerte ed e' nel feed pubblico
--   closed  -> ritirata dall'acquirente, fuori dal feed
--   matched -> l'acquirente ha accettato un'offerta (terminale in beta)
create type public.hunt_status as enum ('open', 'closed', 'matched');

-- Stato dell'offerta.
--   pending   -> in attesa, negoziabile
--   accepted  -> accettata dall'acquirente (terminale)
--   rejected  -> rifiutata dall'acquirente o auto-rifiutata all'accettazione di un'altra
--   withdrawn -> ritirata dal venditore
create type public.offer_status as enum ('pending', 'accepted', 'rejected', 'withdrawn');

-- Condizione carta: scala Cardmarket (standard europeo).
create type public.card_condition as enum (
  'mint',
  'near_mint',
  'excellent',
  'good',
  'light_played',
  'played',
  'poor'
);

-- -----------------------------------------------------------------------------
-- TABELLE
-- -----------------------------------------------------------------------------

-- profiles: estende auth.users con dati pubblici. L'email resta in auth.users
-- e NON viene duplicata qui. Il profilo viene creato automaticamente al signup
-- (trigger handle_new_user); username viene scelto in onboarding.
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  username     text unique
                 constraint profiles_username_len
                 check (username is null or char_length(username) between 3 and 30),
  display_name text not null
                 constraint profiles_display_name_len
                 check (char_length(display_name) between 1 and 60),
  avatar_url   text,
  bio          text
                 constraint profiles_bio_len
                 check (bio is null or char_length(bio) <= 500),
  country      char(2)
                 constraint profiles_country_iso
                 check (country is null or country ~ '^[A-Z]{2}$'),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- hunts: la mancalista pubblicata dall'acquirente. Un solo gioco per hunt.
create table public.hunts (
  id          uuid primary key default gen_random_uuid(),
  buyer_id    uuid not null references public.profiles (id) on delete cascade,
  title       text not null
                constraint hunts_title_len check (char_length(title) between 3 and 120),
  description text
                constraint hunts_description_len
                check (description is null or char_length(description) <= 2000),
  game        public.game_type not null,
  status      public.hunt_status not null default 'open',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index hunts_feed_idx  on public.hunts (status, created_at desc);
create index hunts_buyer_idx on public.hunts (buyer_id);
create index hunts_game_idx  on public.hunts (game);

-- hunt_cards: le singole carte cercate dentro una hunt.
create table public.hunt_cards (
  id                uuid primary key default gen_random_uuid(),
  hunt_id           uuid not null references public.hunts (id) on delete cascade,
  name              text not null
                      constraint hunt_cards_name_len check (char_length(name) between 1 and 200),
  set_name          text
                      constraint hunt_cards_set_len
                      check (set_name is null or char_length(set_name) <= 120),
  collector_number  text
                      constraint hunt_cards_number_len
                      check (collector_number is null or char_length(collector_number) <= 40),
  desired_condition public.card_condition,
  language          text
                      constraint hunt_cards_language_len
                      check (language is null or char_length(language) <= 40),
  quantity          int not null default 1
                      constraint hunt_cards_quantity_range check (quantity between 1 and 99),
  created_at        timestamptz not null default now()
);

create index hunt_cards_hunt_idx on public.hunt_cards (hunt_id);

-- offers: offerta a PREZZO UNICO per l'INTERO bundle della hunt (vincolo offerta
-- totale). Mai un sottoinsieme. Importi in centesimi. Valuta EUR per la beta.
create table public.offers (
  id             uuid primary key default gen_random_uuid(),
  hunt_id        uuid not null references public.hunts (id) on delete cascade,
  seller_id      uuid not null references public.profiles (id) on delete cascade,
  price_cents    int not null
                   constraint offers_price_nonneg check (price_cents >= 0),
  shipping_cents int not null default 0
                   constraint offers_shipping_nonneg check (shipping_cents >= 0),
  currency       char(3) not null default 'EUR'
                   constraint offers_currency_eur check (currency = 'EUR'),
  message        text
                   constraint offers_message_len
                   check (message is null or char_length(message) <= 1000),
  status         public.offer_status not null default 'pending',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index offers_hunt_idx   on public.offers (hunt_id);
create index offers_seller_idx on public.offers (seller_id);

-- Un venditore ha al massimo UNA offerta attiva per hunt. Dopo un ritiro o un
-- rifiuto puo' rifarne una nuova (gli stati terminali non bloccano l'indice).
create unique index offers_one_active_per_seller_idx
  on public.offers (hunt_id, seller_id)
  where status not in ('withdrawn', 'rejected');

-- offer_items: snapshot read-only di conferma carta-per-carta. NON e' una
-- selezione parziale: e' la conferma di cosa il venditore fornisce e in quale
-- condizione. Immutabile (nessuna policy update/delete). card_name e'
-- denormalizzato cosi' l'offerta resta leggibile anche se la hunt_card cambia.
create table public.offer_items (
  id           uuid primary key default gen_random_uuid(),
  offer_id     uuid not null references public.offers (id) on delete cascade,
  hunt_card_id uuid references public.hunt_cards (id) on delete set null,
  card_name    text not null
                 constraint offer_items_card_name_len check (char_length(card_name) between 1 and 200),
  condition    public.card_condition not null,
  note         text
                 constraint offer_items_note_len check (note is null or char_length(note) <= 500),
  created_at   timestamptz not null default now()
);

create index offer_items_offer_idx on public.offer_items (offer_id);

-- messages: chat 1:1 legata all'offerta (un thread per offerta). Immutabile.
create table public.messages (
  id         uuid primary key default gen_random_uuid(),
  offer_id   uuid not null references public.offers (id) on delete cascade,
  sender_id  uuid not null references public.profiles (id) on delete cascade,
  body       text not null
               constraint messages_body_len check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index messages_thread_idx on public.messages (offer_id, created_at);

-- -----------------------------------------------------------------------------
-- FUNZIONI HELPER (SECURITY DEFINER)
-- Owner = postgres (superuser) => bypassano la RLS al loro interno, quindi
-- spezzano la ricorsione tra policy. search_path = '' + nomi qualificati.
-- auth.uid() resta l'utente chiamante anche dentro SECURITY DEFINER.
-- -----------------------------------------------------------------------------

-- Visibilita' di una hunt: pubblica se 'open', sempre per l'acquirente, e per
-- i venditori che hanno gia' un'offerta su di essa (per la loro dashboard).
create or replace function public.can_view_hunt(_hunt_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.hunts h
    where h.id = _hunt_id
      and (
        h.status = 'open'
        or h.buyer_id = (select auth.uid())
        or exists (
          select 1 from public.offers o
          where o.hunt_id = h.id
            and o.seller_id = (select auth.uid())
        )
      )
  );
$$;

create or replace function public.is_hunt_owner(_hunt_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.hunts h
    where h.id = _hunt_id
      and h.buyer_id = (select auth.uid())
  );
$$;

create or replace function public.is_hunt_open(_hunt_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.hunts h
    where h.id = _hunt_id
      and h.status = 'open'
  );
$$;

-- Partecipante a un'offerta = il venditore dell'offerta o l'acquirente della hunt.
create or replace function public.is_offer_participant(_offer_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.offers o
    join public.hunts h on h.id = o.hunt_id
    where o.id = _offer_id
      and (
        o.seller_id = (select auth.uid())
        or h.buyer_id = (select auth.uid())
      )
  );
$$;

create or replace function public.is_offer_seller(_offer_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.offers o
    where o.id = _offer_id
      and o.seller_id = (select auth.uid())
  );
$$;

-- Offerta ancora viva (chat consentita): pending o accepted.
create or replace function public.is_offer_open(_offer_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.offers o
    where o.id = _offer_id
      and o.status in ('pending', 'accepted')
  );
$$;

-- Offerta ancora in trattativa (snapshot/termini modificabili): solo pending.
create or replace function public.is_offer_pending(_offer_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.offers o
    where o.id = _offer_id
      and o.status = 'pending'
  );
$$;

-- -----------------------------------------------------------------------------
-- FUNZIONI TRIGGER
-- -----------------------------------------------------------------------------

-- Aggiorna updated_at a ogni UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Crea il profilo alla registrazione. display_name = parte locale dell'email,
-- con fallback 'Hunter' se l'email e' null (OTP/social) o vuota; username resta
-- null e viene scelto in onboarding. Pattern canonico Supabase.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'Hunter')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Guardia sulle transizioni e modifiche delle offerte (difesa in profondita',
-- oltre alla RLS). Le transizioni partono sempre da 'pending'.
create or replace function public.offers_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  _uid      uuid := (select auth.uid());
  _buyer_id uuid;
begin
  -- Colonne chiave immutabili dopo la creazione.
  if new.hunt_id is distinct from old.hunt_id then
    raise exception 'hunt_id non e'' modificabile';
  end if;
  if new.seller_id is distinct from old.seller_id then
    raise exception 'seller_id non e'' modificabile';
  end if;

  select h.buyer_id into _buyer_id
  from public.hunts h
  where h.id = new.hunt_id;

  -- Cambio di stato
  if old.status is distinct from new.status then
    if old.status <> 'pending' then
      raise exception 'Transizione non valida: un''offerta % e'' terminale', old.status;
    end if;

    if new.status in ('accepted', 'rejected') then
      -- Solo l'acquirente (proprietario della hunt) accetta o rifiuta.
      if _uid is distinct from _buyer_id then
        raise exception 'Solo l''acquirente puo'' accettare o rifiutare un''offerta';
      end if;
    elsif new.status = 'withdrawn' then
      -- Solo il venditore ritira la propria offerta.
      if _uid is distinct from old.seller_id then
        raise exception 'Solo il venditore puo'' ritirare la propria offerta';
      end if;
    else
      raise exception 'Stato offerta non gestito: %', new.status;
    end if;
  end if;

  -- Modifica dei termini: solo il venditore e solo finche' e' 'pending'.
  if (new.price_cents       is distinct from old.price_cents)
     or (new.shipping_cents is distinct from old.shipping_cents)
     or (new.currency       is distinct from old.currency)
     or (new.message        is distinct from old.message) then
    if _uid is distinct from old.seller_id then
      raise exception 'Solo il venditore puo'' modificare i termini dell''offerta';
    end if;
    if old.status <> 'pending' then
      raise exception 'I termini sono modificabili solo finche'' l''offerta e'' in attesa';
    end if;
  end if;

  return new;
end;
$$;

-- Effetti collaterali all'accettazione: la hunt passa a 'matched' e le altre
-- offerte ancora 'pending' vengono rifiutate. Non ricorre: i fratelli vanno a
-- 'rejected', quindi il ramo accept di questo trigger non riparte su di loro.
create or replace function public.offers_on_accept()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'accepted' and old.status = 'pending' then
    update public.hunts
      set status = 'matched'
      where id = new.hunt_id
        and status <> 'matched';

    update public.offers
      set status = 'rejected'
      where hunt_id = new.hunt_id
        and id <> new.id
        and status = 'pending';
  end if;
  return new;
end;
$$;

-- Guardia sulla hunt: 'matched' solo con un'offerta accettata; 'matched' terminale.
create or replace function public.hunts_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'matched' and old.status is distinct from 'matched' then
    if not exists (
      select 1 from public.offers o
      where o.hunt_id = new.id
        and o.status = 'accepted'
    ) then
      raise exception 'Una hunt diventa matched solo con un''offerta accettata';
    end if;
  end if;

  if old.status = 'matched' and new.status is distinct from 'matched' then
    raise exception 'Una hunt matched non puo'' cambiare stato';
  end if;

  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- TRIGGER
-- (i trigger BEFORE eseguono in ordine alfabetico: guard prima di set_updated_at)
-- -----------------------------------------------------------------------------

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger hunts_guard_trg
  before update on public.hunts
  for each row execute function public.hunts_guard();

create trigger hunts_set_updated_at
  before update on public.hunts
  for each row execute function public.set_updated_at();

create trigger offers_guard_trg
  before update on public.offers
  for each row execute function public.offers_guard();

create trigger offers_set_updated_at
  before update on public.offers
  for each row execute function public.set_updated_at();

create trigger offers_on_accept_trg
  after update on public.offers
  for each row execute function public.offers_on_accept();

-- Profilo automatico alla registrazione (trigger sulla tabella auth di Supabase).
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- -----------------------------------------------------------------------------

alter table public.profiles    enable row level security;
alter table public.hunts       enable row level security;
alter table public.hunt_cards  enable row level security;
alter table public.offers      enable row level security;
alter table public.offer_items enable row level security;
alter table public.messages    enable row level security;

-- profiles: dati pubblici leggibili da tutti; ognuno gestisce solo il proprio.
create policy profiles_select_all
  on public.profiles for select
  to anon, authenticated
  using (true);

create policy profiles_insert_self
  on public.profiles for insert
  to authenticated
  with check (id = (select auth.uid()));

create policy profiles_update_self
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- hunts: visibili secondo can_view_hunt; modificabili solo dal proprietario.
create policy hunts_select_visible
  on public.hunts for select
  to anon, authenticated
  using (public.can_view_hunt(id));

create policy hunts_insert_own
  on public.hunts for insert
  to authenticated
  with check (buyer_id = (select auth.uid()));

create policy hunts_update_own
  on public.hunts for update
  to authenticated
  using (buyer_id = (select auth.uid()))
  with check (buyer_id = (select auth.uid()));

create policy hunts_delete_own
  on public.hunts for delete
  to authenticated
  using (buyer_id = (select auth.uid()));

-- hunt_cards: stessa visibilita' della hunt; modificabili solo dal proprietario.
create policy hunt_cards_select_visible
  on public.hunt_cards for select
  to anon, authenticated
  using (public.can_view_hunt(hunt_id));

create policy hunt_cards_insert_owner
  on public.hunt_cards for insert
  to authenticated
  with check (public.is_hunt_owner(hunt_id));

create policy hunt_cards_update_owner
  on public.hunt_cards for update
  to authenticated
  using (public.is_hunt_owner(hunt_id))
  with check (public.is_hunt_owner(hunt_id));

create policy hunt_cards_delete_owner
  on public.hunt_cards for delete
  to authenticated
  using (public.is_hunt_owner(hunt_id));

-- offers: visibili SOLO ai due partecipanti (venditore + acquirente). I venditori
-- NON vedono le offerte concorrenti sulla stessa hunt.
create policy offers_select_participant
  on public.offers for select
  to authenticated
  using (
    seller_id = (select auth.uid())
    or public.is_hunt_owner(hunt_id)
  );

-- Si offre solo su hunt aperte e non proprie.
create policy offers_insert_seller
  on public.offers for insert
  to authenticated
  with check (
    seller_id = (select auth.uid())
    and not public.is_hunt_owner(hunt_id)
    and public.is_hunt_open(hunt_id)
  );

-- Entrambi i partecipanti possono aggiornare la riga; COSA possono cambiare
-- (termini vs stato) e' deciso dal trigger offers_guard.
create policy offers_update_participant
  on public.offers for update
  to authenticated
  using (
    seller_id = (select auth.uid())
    or public.is_hunt_owner(hunt_id)
  )
  with check (
    seller_id = (select auth.uid())
    or public.is_hunt_owner(hunt_id)
  );

-- offer_items: visibili ai partecipanti; inseribili dal venditore solo finche'
-- l'offerta e' 'pending' (snapshot scritto alla creazione). Immutabili.
create policy offer_items_select_participant
  on public.offer_items for select
  to authenticated
  using (public.is_offer_participant(offer_id));

create policy offer_items_insert_seller
  on public.offer_items for insert
  to authenticated
  with check (
    public.is_offer_seller(offer_id)
    and public.is_offer_pending(offer_id)
  );

-- messages: visibili ai partecipanti; ognuno invia solo a proprio nome e solo
-- finche' l'offerta e' viva (pending/accepted). Immutabili.
create policy messages_select_participant
  on public.messages for select
  to authenticated
  using (public.is_offer_participant(offer_id));

create policy messages_insert_participant
  on public.messages for insert
  to authenticated
  with check (
    sender_id = (select auth.uid())
    and public.is_offer_participant(offer_id)
    and public.is_offer_open(offer_id)
  );

-- -----------------------------------------------------------------------------
-- GRANT
-- La RLS filtra le righe; i GRANT abilitano i verbi a livello di tabella.
-- -----------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;

grant select                         on public.profiles    to anon, authenticated;
grant insert, update                 on public.profiles    to authenticated;

grant select                         on public.hunts       to anon, authenticated;
grant insert, update, delete         on public.hunts       to authenticated;

grant select                         on public.hunt_cards  to anon, authenticated;
grant insert, update, delete         on public.hunt_cards  to authenticated;

grant select, insert, update         on public.offers      to authenticated;
grant select, insert                 on public.offer_items to authenticated;
grant select, insert                 on public.messages    to authenticated;

grant execute on function public.can_view_hunt(uuid)        to anon, authenticated;
grant execute on function public.is_hunt_owner(uuid)        to authenticated;
grant execute on function public.is_hunt_open(uuid)         to authenticated;
grant execute on function public.is_offer_participant(uuid) to authenticated;
grant execute on function public.is_offer_seller(uuid)      to authenticated;
grant execute on function public.is_offer_open(uuid)        to authenticated;
grant execute on function public.is_offer_pending(uuid)     to authenticated;

-- -----------------------------------------------------------------------------
-- REALTIME
-- La RLS si applica anche alle sottoscrizioni: ognuno riceve solo cio' che puo'
-- vedere. messages -> chat dal vivo; offers -> aggiornamenti di stato/prezzo.
-- -----------------------------------------------------------------------------

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.offers;
