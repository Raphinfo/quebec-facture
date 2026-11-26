import { escapeHtml } from "./validation";

function siteOrigin() {
  try {
    return process.env.APP_URL ? new URL(process.env.APP_URL).origin : "https://quebecfacture.com";
  } catch {
    return "https://quebecfacture.com";
  }
}

export function brandSignatureHtml(): string {
  const origin = siteOrigin();
  const support = process.env.SUPPORT_EMAIL || "support@quebecfacture.com";
  return `
    <div style="margin-top:28px;padding-top:18px;border-top:1px solid #e2e8f0;font-size:13px;color:#475569;line-height:1.5">
      <strong style="color:#0f172a">L’équipe Québec Facture</strong><br>
      <span>Facturation, soumissions &amp; TPS/TVQ pour le Québec</span><br>
      <a href="${escapeHtml(origin)}" style="color:#1d4ed8;text-decoration:none">${escapeHtml(origin.replace(/^https?:\/\//, ""))}</a>
      · <a href="mailto:${escapeHtml(support)}" style="color:#1d4ed8;text-decoration:none">${escapeHtml(support)}</a>
    </div>
  `;
}

export function buildBrandEmailHtml({
  eyebrow = "QUÉBEC FACTURE",
  title,
  bodyHtml,
  ctaLabel,
  ctaUrl,
}: {
  eyebrow?: string;
  title: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
}): string {
  return `
    <div style="font-family:Inter,Arial,sans-serif;max-width:620px;margin:auto;padding:24px 20px;color:#0f172a;background:#ffffff;line-height:1.6">
      <div style="border-bottom:3px solid #1d4ed8;padding-bottom:14px;margin-bottom:22px">
        <span style="display:block;font-size:11px;font-weight:700;letter-spacing:1.5px;color:#1d4ed8;text-transform:uppercase">${escapeHtml(eyebrow)}</span>
        <h2 style="margin:6px 0 0;font-size:22px;color:#0f172a">${escapeHtml(title)}</h2>
      </div>
      <div style="font-size:14px;color:#1e293b">
        ${bodyHtml}
      </div>
      ${
        ctaLabel && ctaUrl
          ? `<p style="margin:24px 0"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#1d4ed8;color:#ffffff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">${escapeHtml(ctaLabel)}</a></p>`
          : ""
      }
      ${brandSignatureHtml()}
    </div>
  `;
}

export function issuerSignatureHtml({
  companyName,
  companyAddress,
  replyToEmail,
}: {
  companyName: string;
  companyAddress?: string | null;
  replyToEmail?: string | null;
}): string {
  const origin = siteOrigin();
  return `
    <div style="margin-top:26px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:13px;color:#475569;line-height:1.55">
      <p style="margin:0">Merci de votre confiance,</p>
      <p style="margin:6px 0 0">
        <strong style="color:#0f172a">${escapeHtml(companyName)}</strong>
        ${companyAddress ? `<br><span>${escapeHtml(companyAddress)}</span>` : ""}
        ${replyToEmail ? `<br><a href="mailto:${escapeHtml(replyToEmail)}" style="color:#1d4ed8;text-decoration:none">${escapeHtml(replyToEmail)}</a>` : ""}
      </p>
      <p style="margin:14px 0 0;font-size:11px;color:#94a3b8">
        Document transmis via <a href="${escapeHtml(origin)}" style="color:#64748b;text-decoration:none">Québec Facture</a>
      </p>
    </div>
  `;
}
