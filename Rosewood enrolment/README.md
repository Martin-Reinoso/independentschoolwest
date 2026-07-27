# Rosewood College Enrolment Portal

This folder contains the private invitation and data-capture service for the Rosewood College enrolment form.

The public-site frontend is:

- `pages/rosewood-enrolment-2027-7c91a4.html`
- `pages/rosewood-enrolment.css`
- `pages/rosewood-enrolment.js`

The frontend is deliberately absent from site navigation and the sitemap. It also uses `noindex`, but the page location is not a security boundary. Every live request requires a separate high-entropy invitation token validated by the Lambda.

## Data Flow

1. An authorised staff member creates a one-time family invitation.
2. The family opens the URL containing the invitation token.
3. The Lambda stores non-sensitive progress events in the private `Engagement` tab.
4. Draft answers remain in browser local storage until submission.
5. Supporting documents upload directly to a private, encrypted S3 bucket through five-minute presigned URLs.
6. Final form data is written to the private `Applications` tab.
7. The invitation is marked `submitted`, preventing a second application from the same link.

No Google credentials, AWS credentials, application answers or document files belong in git.

## Google Sheet

Create a private Google Sheet, share it with the existing Google service-account email as an editor, then initialise it:

```bash
GOOGLE_SERVICE_ACCOUNT_JSON=/path/to/service-account.json \
GOOGLE_SHEETS_SPREADSHEET_ID=spreadsheet_id \
node "Rosewood enrolment/scripts/init-google-sheet.mjs"
```

The script creates and formats:

- `Dashboard`
- `Invitations`
- `Applications`
- `Engagement`

The header rows are an API contract. Do not rename or reorder them.

## AWS Components

Use the same personal AWS account documented for the Stripe Lambdas, after confirming the active account ID.

Recommended resources:

- Lambda: `rosewood-enrolment-portal`
- Region: `ap-southeast-2`
- Runtime: `nodejs22.x`
- Handler: `index.handler`
- Function URL: public invocation, with application-level invitation validation
- S3 bucket: a private, dedicated document bucket with all public access blocked

Create the document bucket with:

```bash
aws s3api create-bucket \
  --bucket YOUR_UNIQUE_PRIVATE_BUCKET \
  --region ap-southeast-2 \
  --create-bucket-configuration LocationConstraint=ap-southeast-2

aws s3api put-public-access-block \
  --bucket YOUR_UNIQUE_PRIVATE_BUCKET \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

aws s3api put-bucket-encryption \
  --bucket YOUR_UNIQUE_PRIVATE_BUCKET \
  --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"},"BucketKeyEnabled":true}]}'
```

Apply S3 CORS from a local JSON file containing:

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["https://ffe.org.au", "http://localhost:8000"],
      "AllowedMethods": ["PUT"],
      "AllowedHeaders": ["content-type", "x-amz-server-side-encryption"],
      "ExposeHeaders": ["etag"],
      "MaxAgeSeconds": 300
    }
  ]
}
```

The Lambda execution role needs CloudWatch Logs permission and this S3 permission, scoped to the dedicated bucket:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject"],
      "Resource": "arn:aws:s3:::YOUR_UNIQUE_PRIVATE_BUCKET/applications/*"
    }
  ]
}
```

## Lambda Environment

Required:

```text
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
GOOGLE_SHEETS_SPREADSHEET_ID=
DOCUMENT_BUCKET=
IP_HASH_SALT=
ALLOWED_ORIGINS=https://ffe.org.au,http://localhost:8000
DISPLAY_TIME_ZONE=Australia/Melbourne
LEGAL_VERSION=interim-2026-07-27
```

`IP_HASH_SALT` should be a random secret of at least 32 bytes. The service stores an HMAC fingerprint rather than a raw signing IP address.

Package the Lambda:

```bash
cd "Rosewood enrolment/lambda"
zip -j rosewood-enrolment-portal.zip index.mjs
```

The deployed Function URL is configured as `apiEndpoint` in `pages/rosewood-enrolment-2027-7c91a4.html`. If the Lambda is replaced, update that value to the new Function URL without a trailing slash.

## Create A Family Invitation

```bash
GOOGLE_SERVICE_ACCOUNT_JSON=/path/to/service-account.json \
GOOGLE_SHEETS_SPREADSHEET_ID=spreadsheet_id \
node "Rosewood enrolment/scripts/create-invitation.mjs" \
  --family="Example Family" \
  --email="parent@example.com" \
  --student="Example Student" \
  --expires-days=30
```

The command prints the only copy of the live invitation URL. The Google Sheet stores only its SHA-256 hash.

## Local Preview

Visual preview without a backend:

```text
http://localhost:8000/pages/rosewood-enrolment-2027-7c91a4.html?preview=1
```

Preview mode simulates uploads and submission in the browser. It never writes to AWS or Google Sheets.

## Production Checklist

Before inviting real families:

1. Replace or formally approve the interim enrolment acknowledgement.
2. Publish and link the approved Rosewood privacy collection notice.
3. Confirm the exact required-document list.
4. Confirm the retention and deletion schedule for applications and S3 documents.
5. Restrict Google Sheet sharing to authorised enrolment staff.
6. Enable AWS CloudTrail data events or an equivalent access audit for the document bucket.
7. Test one synthetic family invitation end to end, then remove its rows and files.
8. Verify that no application data or invitation URL appears in git or public logs.
