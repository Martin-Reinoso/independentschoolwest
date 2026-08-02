# V2 Test Deployment

This procedure deploys a **test-only** service. Do not issue real-family invitations
while policy files remain marked `DRAFT PLACEHOLDER - NOT APPROVED FOR PRODUCTION`.

## External Prerequisites

- AWS CLI logged into the approved account and region `ap-southeast-2`
- a private deployment-artifact S3 bucket
- an SES-verified test sender and recipient while the account remains in sandbox
- one restricted Google Drive folder shared only with named staff and the service account
- one private Google Sheet shared only with named staff and the service account
- a Secrets Manager JSON object containing `OTP_HMAC_SECRET`, `IP_HASH_SALT`,
  `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_PRIVATE_KEY`

Never place those values, the temporary sender address, folder IDs, Sheet IDs, tokens or
real family details in Git.

## Package And Deploy

Run from the repository root, supplying identifiers through the shell or an approved
secret tool:

```bash
cd "Rosewood enrolment/v2/lambda"
pnpm install --prod --frozen-lockfile
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

## Connect The Static Pages

Read the `FunctionUrl` stack output. Set it as `apiEndpoint` in the V2 runtime config in
both static pages, then run the full test suite before publishing. The pages are
`noindex`, but privacy still depends on the invitation token plus mailbox OTP.

## Temporary Sender Swap

The form does not authenticate to a Gmail account and does not store a Gmail password.
SES sends mail using the externally verified identity in `OTP_FROM_EMAIL`. To replace
the temporary test identity:

1. verify the Rosewood-controlled domain in SES, including DKIM and DMARC alignment
2. update the stack parameters `OtpFromEmail` and `ReplyToEmail`
3. update the Lambda role's SES identity resource through the same stack deployment
4. send access-OTP, signature-OTP, invitation and confirmation canaries
5. check delivery, reply handling, bounce and complaint paths
6. remove the temporary identity only after the canary passes

No frontend, challenge, session or signature code changes are required.

## Rollback

If a canary fails, stop issuing invitations, restore the prior Lambda version/config,
leave DynamoDB and Drive evidence intact, and record the incident. Never delete or edit
submitted signature evidence as part of rollback.
