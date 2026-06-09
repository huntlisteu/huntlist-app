# Handoff — Bug sessione OAuth Google

> Scritto il 2026-06-09. Da leggere prima di riaprire il debugger.

---

## Obiettivo finale

L'utente clicca "Continua con Google", si autentica su Google, viene redirectato al feed (`/feed`) **già autenticato** — navbar con profilo, niente bisogno di navigare su altre pagine per far "riconoscere" la sessione.

---

## Stato corrente del codice

Il bug **non è stato confermato come risolto** dall'utente. I fix sono stati applicati ma non testati con un vero round-trip Google↔Supabase in produzione o su `localhost`.

### File modificati in questa sessione

| File | Cosa fa oggi |
|---|---|
| `app/auth/callback/route.ts` | Callback OAuth/PKCE. Flusso `code` (Google OAuth): crea `NextResponse.redirect` **prima**, lega il `createServerClient` direttamente a quella response (`setAll` scrive su `response.cookies`), chiama `exchangeCodeForSession`, ritorna la stessa response. Flusso `token_hash` (magic link, email OTP, recovery): invariato, usa `createClient()` da `lib/supabase/server`. |
| `proxy.ts` | Middleware. Aggiunto bypass in cima: se il path è `/auth/callback` o `/callback`, ritorna `NextResponse.next()` immediatamente senza creare nessun client Supabase. Aggiunta anche la gestione del caso "utente cancellato con JWT residuo" (PGRST116 → `signOut()` + redirect `/login`). |

### File **non** modificati (corretti, lasciati invariati)

- `lib/supabase/client.ts` — `createBrowserClient` standard, ok.
- `lib/supabase/server.ts` — usa `next/headers` cookies, corretto per Server Components/Actions/Route Handlers non-callback.
- `components/auth/GoogleAuthButton.tsx` — `signInWithOAuth` con `redirectTo: ${NEXT_PUBLIC_SITE_URL}/auth/callback?next=/feed`, corretto.
- `app/(auth)/callback/route.ts` — route separata su path `/callback` (magic link/email), **NON** è quella che gestisce Google OAuth. Ha lo stesso problema potenziale di propagazione cookie per il flusso PKCE, ma non è il focus di questa sessione.

---

## Tutto quello che è stato provato e perché è fallito

### Tentativo 1 — `pendingCookies` collector applicato a tutti i branch
`route.ts` raccoglieva tutti i cookie scritti da `exchangeCodeForSession`/`verifyOtp` in un array `pendingCookies` e li copiava su qualunque `NextResponse.redirect()` venisse ritornata (successo o errore).

**Sostituito con** il pattern prescritto dall'utente (response creata prima, client legato a essa) perché il pattern "collector" era una variante non standard — l'utente ha correttamente indicato l'approccio canonico `@supabase/ssr`.

### Tentativo 2 — Solo il fix al `route.ts` (senza toccare `proxy.ts`)
Anche con il pattern corretto in `route.ts`, il bug persisteva.

**Ipotesi**: il middleware (`proxy.ts`) intercetta anche la richiesta a `/auth/callback?code=...` (il matcher copre tutto tranne `_next/static`, immagini, etc.), crea un proprio `createServerClient`, chiama `getUser()` — se nei cookie era presente una sessione vecchia/scaduta (login precedente, switch account), Supabase tentava un refresh/clear, scriveva `Set-Cookie` sulla `NextResponse.next()` del proxy. Next.js fonde gli header del middleware con quelli del route handler. Il `Set-Cookie` del proxy (sessione vecchia/vuota) **sovrascriveva** il `Set-Cookie` scritto da `exchangeCodeForSession` → browser riceveva la sessione sbagliata o nessuna sessione.

**Fix applicato**: bypass in cima a `proxy()` per `CALLBACK_PATHS`.

### Quello che NON abbiamo ancora escluso

- **`NEXT_PUBLIC_SITE_URL` non configurato o sbagliato**: se questa env var è vuota o punta a un'origine diversa da quella su cui gira il dev server, il `redirectTo` passato a Google sarà errato e Google potrebbe redirectare a un URL non autorizzato (errore visibile) oppure la richiesta arriverebbe su un host diverso e i cookie non verrebbero inviati (silent fail). Da verificare per primo se il bug persiste.
- **Cookie `secure` su `http://localhost`**: se Supabase scrive i cookie con `Secure: true` (lo fa automaticamente se rileva HTTPS), su `http://localhost` Chrome non li accetta. Da verificare aprendo DevTools → Application → Cookies → vedere se i cookie `sb-*` compaiono dopo il redirect.
- **Supabase dashboard — Redirect URLs**: il progetto Supabase deve avere `http://localhost:3000/auth/callback` (o l'URL di produzione) nella lista dei redirect URL autorizzati. Se manca, Google OAuth funziona ma il code exchange restituisce errore 400 (visibile in console), e `exchangeCodeForSession` ritorna `error != null` → il codice va sul branch errore → redirect a `/login?error=auth`.
- **`app/(auth)/callback/route.ts`**: questo file gestisce magic link/email confirmation/password recovery ma ha ancora il vecchio pattern (`createClient()` da `next/headers`). Ha lo stesso identico bug potenziale per il flusso `code` PKCE. Non è il focus della sessione corrente, ma va fixato con lo stesso pattern della route OAuth.

---

## Prossimo step

**Prima di toccare altro codice**, fare questo test diagnostico:

1. `npm run dev`
2. Aprire DevTools → Network → filtro su "callback"
3. Cliccare "Continua con Google", completare il login
4. Guardare la richiesta `GET /auth/callback?code=...`:
   - **Response headers**: ci sono `Set-Cookie: sb-*-auth-token*`? Se no → i cookie non vengono scritti (debug in `route.ts`).
   - **Se sì**: aprire Application → Cookies → `http://localhost:3000` → i cookie `sb-*` ci sono? Se no → problema `Secure` flag su http.
5. Guardare la richiesta successiva `GET /feed`:
   - **Request headers**: i cookie `sb-*` vengono inviati? Se no → i cookie non sono stati salvati. Se sì → il problema è lato server nel leggere/validare la sessione.

Se i cookie appaiono correttamente nel browser e vengono inviati su `/feed` ma l'utente risulta ancora non autenticato, il problema è **server-side** su `/feed` — probabilmente `getUser()` in `(app)/layout.tsx` fallisce silenziosamente (JWT scaduto, progetto Supabase in pausa, chiave sbagliata).

Se i cookie non appaiono affatto dopo il callback → il fix al `route.ts` non funziona ancora: aggiungere `console.log` dentro `setAll` del `createServerClient` nel callback per verificare se `exchangeCodeForSession` chiama `setAll` almeno una volta.
