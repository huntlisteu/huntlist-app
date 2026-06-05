import { Resend } from "resend";

/**
 * Client Resend lazy-initialized. Lancia se RESEND_API_KEY non è configurata.
 * Usato solo server-side (Server Actions, Route Handlers).
 */
function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error("RESEND_API_KEY non configurata in .env.local");
  }
  return new Resend(key);
}

function getFromEmail(): string {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) {
    throw new Error("RESEND_FROM_EMAIL non configurata in .env.local");
  }
  return from;
}

/** Escapes HTML special chars per prevenire injection nel template. */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function newOfferHtml(params: {
  buyerName: string;
  sellerName: string;
  huntTitle: string;
  offerUrl: string;
}): string {
  const { buyerName, sellerName, huntTitle, offerUrl } = params;

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Nuova offerta · Huntlist</title>
</head>
<body style="margin:0;padding:0;background-color:#FAFAF7;font-family:system-ui,-apple-system,sans-serif;color:#1A1A18;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
         style="padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
               style="max-width:560px;">

          <!-- Logotipo -->
          <tr>
            <td style="padding-bottom:24px;">
              <span style="font-size:22px;font-weight:700;color:#2D5A3D;
                           letter-spacing:-0.5px;">
                Huntlist
              </span>
            </td>
          </tr>

          <!-- Card principale -->
          <tr>
            <td style="background:#ffffff;border-radius:12px;
                       border:1px solid #E0DFD6;padding:32px;">

              <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;
                          color:#1A1A18;line-height:1.3;">
                Nuova offerta ricevuta!
              </h1>

              <p style="margin:0 0 20px;font-size:15px;line-height:1.7;
                         color:#5A5C56;">
                Ciao <strong style="color:#1A1A18;">${esc(buyerName)}</strong>,
              </p>

              <p style="margin:0 0 20px;font-size:15px;line-height:1.7;
                         color:#5A5C56;">
                <strong style="color:#1A1A18;">${esc(sellerName)}</strong>
                ha fatto un&rsquo;offerta sulla tua Hunt
                <strong style="color:#1A1A18;">&ldquo;${esc(huntTitle)}&rdquo;</strong>.
              </p>

              <p style="margin:0 0 28px;font-size:15px;line-height:1.7;
                         color:#5A5C56;">
                Vai alla chat per vedere i dettagli — prezzo, condizione delle
                carte e snapshot completo — e per rispondere o accettare.
              </p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="background:#2D5A3D;border-radius:8px;">
                    <a href="${esc(offerUrl)}"
                       style="display:inline-block;padding:13px 26px;
                              color:#FAFAF7;font-size:15px;font-weight:600;
                              text-decoration:none;letter-spacing:0.1px;">
                      Vedi l&rsquo;offerta &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Link di fallback -->
              <p style="margin:24px 0 0;font-size:12px;color:#5A5C56;">
                Link non funziona? Copia e incolla nel browser:<br />
                <a href="${esc(offerUrl)}"
                   style="color:#2D5A3D;word-break:break-all;">
                  ${esc(offerUrl)}
                </a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;text-align:center;
                       font-size:12px;line-height:1.7;color:#5A5C56;">
              Huntlist &mdash; Marketplace C2C per mancaliste TCG<br />
              Ricevi questa email perch&eacute; sei registrato su Huntlist.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Funzioni esportate
// ---------------------------------------------------------------------------

/**
 * Notifica all'acquirente che ha ricevuto una nuova offerta sulla sua Hunt.
 * Lancia in caso di errore: il chiamante deve wrappare in try/catch.
 *
 * @param buyerEmail  Email dell'acquirente (da auth.users via admin API).
 * @param buyerName   display_name del profilo acquirente.
 * @param huntTitle   Titolo della Hunt.
 * @param sellerName  display_name del profilo venditore.
 * @param offerUrl    URL assoluto della pagina chat dell'offerta.
 */
export async function sendNewOfferEmail(
  buyerEmail: string,
  buyerName: string,
  huntTitle: string,
  sellerName: string,
  offerUrl: string,
): Promise<void> {
  const resend = getResend();

  // RESEND_TEST_EMAIL: se presente, redirige tutte le email a quell'indirizzo.
  // Utile in locale per testare senza dominio verificato su Resend.
  const to = process.env.RESEND_TEST_EMAIL ?? buyerEmail;

  const { error } = await resend.emails.send({
    from: getFromEmail(),
    to,
    subject: `Nuova offerta per "${huntTitle}" · Huntlist`,
    html: newOfferHtml({ buyerName, sellerName, huntTitle, offerUrl }),
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
}
