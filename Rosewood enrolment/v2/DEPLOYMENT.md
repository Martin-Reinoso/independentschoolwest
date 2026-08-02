# V2 Test Deployment

This procedure deploys a **test-only** service. Do not issue real-family invitations
while policy files remain marked `DRAFT PLACEHOLDER - NOT APPROVED FOR PRODUCTION`.

## External Prerequisites

- AWS CLI logged into the approved account and region `ap-southeast-2`
- a private deployment-artifact S3 bucket
- an SES-verified test sender and recipient while the account remains in sandbox
- one restricted Google Drive folder and one private Google Sheet shared only with named
  staff and the selected runtime identity
- either a non-University Shared Drive with a dedicated service account, or a dedicated
  organisation-controlled Google user whose own quota backs the restricted My Drive
  folder
- a Secrets Manager JSON object containing `OTP_HMAC_SECRET`, `IP_HASH_SALT`, an explicit
  `GOOGLE_AUTH_MODE` when both credential sets are retained, and the selected Google
  credentials

`service_account` remains the preferred mode. Service accounts have no My Drive storage
quota, so that mode requires a Shared Drive. `user_oauth` is the approved fallback for a
dedicated organisation-controlled account when Shared Drives are unavailable. It uses
that user's storage quota and must not use a personal family mailbox. The account must
contain no unrelated organisational or personal Drive data. Both modes require the full
Drive API scope because the runtime must discover and manage a pre-existing restricted
folder. In `user_oauth` mode, the dedicated account itself is the credential boundary;
the configured folder is the application's enforced storage target.

## Google Credential Modes

For `service_account`, store:

```text
GOOGLE_AUTH_MODE=service_account
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
```

For `user_oauth`, store:

```text
GOOGLE_AUTH_MODE=user_oauth
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_OAUTH_REFRESH_TOKEN=
GOOGLE_OAUTH_EXPECTED_EMAIL=
```

The user grant must be issued to the dedicated Rosewood organisation account with only
the Drive and Sheets scopes used by this application. Store the refresh token only in
Secrets Manager, keep MFA and account recovery current, keep unrelated data out of that
account, document the OAuth client owner, and test revocation/rotation before real
intake. Every preflight rechecks the refresh token against `GOOGLE_OAUTH_EXPECTED_EMAIL`.
If both credential sets are retained for rollback, `GOOGLE_AUTH_MODE` is mandatory so a
deployment cannot switch identity silently.

The 3 August 2026 synthetic test used organisation-user OAuth successfully and passed the
create/delete, upload, snapshot, signature and Sheet checks. That account contains
unrelated Drive data, so it is a test-only credential. The adapter enforces the configured
folder for writes, but the refresh token's full Drive scope is account-wide. Replace it
with a dedicated, data-empty organisation account or the preferred Shared Drive service
account before any real-family invitation.

### One-Time User OAuth Bootstrap

After creating a Google OAuth **Desktop app** client, download its client JSON to a
temporary local path outside the repository. The bootstrap utility uses a loopback
callback, PKCE and an exact mailbox check. It proves a create/delete in Drive and a Sheet
read before writing the OAuth client and refresh token directly to Secrets Manager. It
does not print the refresh token or place it in Git.

```bash
cd "Rosewood enrolment/v2/lambda"
EXPECTED_AWS_ACCOUNT_ID="$APPROVED_AWS_ACCOUNT_ID" \
ROSEWOOD_CONFIG_SECRET_ARN="$ROSEWOOD_CONFIG_SECRET_ARN" \
GOOGLE_OAUTH_EXPECTED_EMAIL="$ORGANISATION_GOOGLE_EMAIL" \
GOOGLE_OAUTH_CLIENT_CONFIG="/private/path/client_secret.json" \
GOOGLE_DRIVE_FOLDER_ID="$GOOGLE_DRIVE_FOLDER_ID" \
GOOGLE_SHEETS_SPREADSHEET_ID="$GOOGLE_SHEETS_SPREADSHEET_ID" \
ROSEWOOD_OAUTH_URL_FILE="/private/path/rosewood-oauth-url" \
node scripts/authorize-google-user.mjs --apply
```

While the command waits, open the protected URL file in the browser, approve only the
dedicated organisation account, and complete Google consent. Delete the downloaded
client JSON after the secret update and record its OAuth client owner outside Git. If
mailbox verification, Drive creation or Sheet access fails, Secrets Manager is not
changed.

Never place those values, the temporary sender address, folder IDs, Sheet IDs, tokens or
real family details in Git.

## Mandatory Preflight

Set `EXPECTED_AWS_ACCOUNT_ID` to the explicitly approved non-University account. The
preflight fails closed if the active credentials point anywhere else. It also checks the
secret shape and strength, the explicitly selected Google authentication mode, SES
account and sender, an actual Drive create/delete probe and Sheet read access without
printing credentials or external identifiers.

```bash
cd "Rosewood enrolment/v2/lambda"
EXPECTED_AWS_ACCOUNT_ID="$APPROVED_AWS_ACCOUNT_ID" \
ROSEWOOD_CONFIG_SECRET_ARN="$ROSEWOOD_CONFIG_SECRET_ARN" \
OTP_FROM_EMAIL="$OTP_FROM_EMAIL" \
GOOGLE_DRIVE_FOLDER_ID="$GOOGLE_DRIVE_FOLDER_ID" \
GOOGLE_SHEETS_SPREADSHEET_ID="$GOOGLE_SHEETS_SPREADSHEET_ID" \
ALLOW_DRAFT_POLICY_TEST=true \
node scripts/deployment-preflight.mjs
cd ..
```

Do not package or deploy unless every reported check is `true`. SES sandbox status is
reported separately; sandbox testing requires a verified recipient as well as sender.
The Lambda also validates these boundaries at startup and refuses non-test operation
with weak secrets, missing schema/sender settings, non-HTTPS origins or non-HTTPS task
pages. The preflight and runtime gate are intentionally independent.

## Package And Deploy

Run from the repository root, supplying identifiers through the shell or an approved
secret tool:

```bash
cd "Rosewood enrolment/v2/lambda"
pnpm install --frozen-lockfile
pnpm run build:deployment
cd ..
aws cloudformation package \
  --template-file template.yaml \
  --s3-bucket "$DEPLOYMENT_BUCKET" \
  --output-template-file packaged.yaml \
  --region ap-southeast-2
aws cloudformation deploy \
  --template-file packaged.yaml \
  --stack-name rosewood-enrolment-v2-test \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
    ConfigSecretArn="$ROSEWOOD_CONFIG_SECRET_ARN" \
    OtpFromEmail="$OTP_FROM_EMAIL" \
    ReplyToEmail="$REPLY_TO_EMAIL" \
    GoogleDriveFolderId="$GOOGLE_DRIVE_FOLDER_ID" \
    GoogleSheetsSpreadsheetId="$GOOGLE_SHEETS_SPREADSHEET_ID" \
  --region ap-southeast-2
```

`packaged.yaml` is generated deployment output and must not be committed.
`lambda-dist/` is also generated and ignored. The deployment builder creates a minimal
runtime bundle, uses a hoisted dependency layout that survives ZIP packaging, rejects
symbolic links and smoke-imports the Lambda handler before upload.

## Connect The Static Pages

Read the `FunctionUrl` stack output. Set it as `apiEndpoint` in
`pages/rosewood-enrolment-v2-config.js`, then run the full test suite before publishing.
That one runtime file configures the application, independent-signature and receipt
pages. All three pages are `noindex`, but privacy still depends on a private capability
plus mailbox OTP.

The stack also enables `RosewoodOutboxSchedule`, an EventBridge rule that invokes the
same Lambda every minute to retry leased outbox messages. Confirm the rule is enabled
and perform one synthetic failed-send/retry canary before issuing test invitations.

Create only approved synthetic invitations while policies are drafts. The invitation
utility fails closed unless the AWS account, draft-policy flag, explicit synthetic flag
and recipient mailbox all match:

```bash
cd "Rosewood enrolment/v2/lambda"
EXPECTED_AWS_ACCOUNT_ID="$APPROVED_AWS_ACCOUNT_ID" \
ALLOW_DRAFT_POLICY_TEST=true \
SYNTHETIC_RECIPIENT_EMAIL="$TEST_RECIPIENT_EMAIL" \
ROSEWOOD_TABLE_NAME="$ROSEWOOD_TABLE_NAME" \
node scripts/create-invitation.mjs \
  --synthetic true \
  --email "$TEST_RECIPIENT_EMAIL" \
  --student "Synthetic Student" \
  --family "Synthetic test family"
```

The command prints one private capability URL. Do not place that URL in Git, logs,
shared chat or analytics.

## Temporary Sender Swap

The form does not authenticate to a Gmail account and does not store a Gmail password.
SES sends mail using the externally verified identity in `OTP_FROM_EMAIL`. To replace
the temporary test identity:

1. verify the Rosewood-controlled domain in SES, including DKIM and DMARC alignment
2. update the stack parameters `OtpFromEmail` and `ReplyToEmail`
3. update the Lambda role's SES identity resource through the same stack deployment
4. send access-OTP, signature-OTP, invitation and confirmation canaries
5. open the recipient-specific receipt link and verify its separate receipt OTP
6. check delivery, reply handling, bounce and complaint paths
7. remove the temporary identity only after the canary passes

No frontend, challenge, session or signature code changes are required.

The 3 August 2026 canary confirmed that mail sent from the individually verified test
mailbox was shown as arriving via `amazonses.com` and consistently classified as spam by
Gmail. A technically successful SES API call is therefore not a deliverability pass.
Production promotion requires the domain-authenticated sender and a repeated inbox,
spam, bounce, complaint and reply-path canary.

## Rollback

If a canary fails, stop issuing invitations, restore the prior Lambda version/config,
leave DynamoDB and Drive evidence intact, and record the incident. Never delete or edit
submitted signature evidence as part of rollback.
