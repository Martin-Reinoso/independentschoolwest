# Personalised principal letter

The letter is rendered by `offer-letter.mjs` from explicitly selected Applications,
with the reviewed emblem, local Noto fonts and the authorised principal signature.
The family greeting includes only guardians authorised across every selected child.
Children, year levels and entry years appear in a wrapping table. A long family letter
continues onto numbered pages; the signature and principal's name remain together.

## Restricted signature configuration

The existing restricted application configuration secret must contain:

- `OFFER_PRINCIPAL_SIGNATURE_PNG_BASE64`: canonical base64 of the authorised PNG crop.
- `OFFER_PRINCIPAL_SIGNATURE_SHA256`: lowercase SHA-256 of the decoded PNG bytes.

Use only the supplied signature appearance. Never use the source PDF as an attachment,
or include its unrelated content. Do not commit the crop, put it on GitHub Pages, embed
it in JavaScript, log it, or add it to the Lambda package. The package contains only
the public emblem and licensed fonts. Missing, malformed or checksum-mismatched
signature configuration blocks staff preview and issue; there is no unsigned fallback.
Configuration updates must preserve other existing secret fields. Tests use generated
fictional signature fixtures; real test delivery still uses the exact approved inbox.

## Review and immutable delivery

- Staff choose whether the family has met with the principal. Without confirmation,
  the letter thanks the family for their interest and does not claim a meeting occurred.
- The optional January gathering paragraph requires an explicit staff selection and
  cannot be used on/after 17 January 2027, including by backdating the letter.
- The current provisional-registration notice is shared with the acceptance contract.
- The preview includes the exact PDF bytes and checksum. The browser verifies that
  checksum before downloading the review copy. Changing the children, names, wording,
  date, signature asset or schedule invalidates the reviewed issue hash.
- Issue regenerates deterministically and requires the same hash, then stores those
  exact bytes in restricted Drive storage. Resends retrieve the stored copy; they do
  not regenerate the letter from later Application, template or signature changes.
- Dispatch checks family ownership, primary-recipient scope, private folder, MIME,
  byte length and checksum. Both reviewed PDF attachment types are limited to 2 MB.
- Test delivery mode puts an explicit fictional-family marker in the PDF. Production
  letters carry page numbers without test/preview wording. The agreement's separate
  exact-content approval gate and disabled-by-default issuance remain in force.

## Local evidence and remaining deployment work

Unit tests cover one/many children, accented/long names, deterministic PDF bytes,
private asset failure, changed-review rejection, dates and both staff surfaces.
Synthetic browser tests exercise the actual embedded staff portal and backend with
fake providers at desktop/mobile sizes, including the download-to-stored-byte match.
Private visual evidence uses the authorised signature crop with fictional family names.

The private configuration still needs provisioning in the isolated test environment,
followed by real delivery to the approved Gmail inbox and production release checks.
Local passing tests do not establish successful AWS, Drive or Gmail integration.
