# Interim Google Drive And Google Sheets Guidelines

## Decision

As of 28 July 2026, Rosewood College accepts Google Drive and Google Sheets as
interim operational storage for enrolment process records.

This is a deliberate delivery decision. Future deployments must not be blocked
solely because a dedicated student administration platform or database would be
preferable. The interim arrangement must still follow the controls below.

This decision covers Drive and Sheets used for enrolment workflow and application
records. It does not automatically move document uploads currently stored in the
private AWS S3 bucket into Drive. A separate approved migration is required before
changing document storage.

## Required Controls

1. Keep enrolment folders, Sheets and files private. Never enable public or
   link-wide access.
2. Grant access only to named staff who need the information for enrolment work.
3. Use organisation-controlled Google accounts with multi-factor authentication.
4. Give service accounts only the minimum access required for the deployment.
5. Review sharing before launch and after staff or role changes.
6. Do not place invitation tokens, credentials, private keys or passwords in a
   Sheet, Drive document, email template or repository file.
7. Do not commit family information, application exports, active invitation URLs,
   private emails or raw source material to git.
8. Collect only information that has a defined enrolment, safety, legal or
   administrative purpose.
9. Keep engagement tracking separate from sensitive application answers wherever
   practical.
10. Record who can access the enrolment folder and who is responsible for handling
    access requests, corrections, retention and deletion.

## Deployment Checklist

Before each deployment:

1. Confirm the destination folder and Sheet are owned by the intended organisation
   account.
2. Confirm the Sheet is not publicly accessible and is shared only with authorised
   staff and the required service account.
3. Confirm test records and test uploads have been removed.
4. Confirm the current Privacy Collection Notice describes the information being
   collected, its purpose, expected disclosures, storage arrangements and contact
   point.
5. Confirm all new fields have an identified purpose and owner.
6. Confirm support staff know how to correct or delete a record when authorised.
7. Test with synthetic data only before inviting a real family.
8. Record the deployment date, owner and material data-flow changes in the project
   handover documentation.

## Retention And Incident Handling

- Rosewood must approve a retention schedule before real applications are accepted.
- Deletion must include duplicate exports, downloaded files and superseded working
  copies where applicable.
- Suspected unauthorised access or accidental sharing must be escalated immediately
  to the project owner. Access should be restricted first, then the affected records,
  users and time period should be documented.
- Audit information should be retained separately from the application content where
  practical.

## Review And Migration Triggers

Review this interim decision when any of the following occurs:

- Rosewood selects a student administration or enrolment platform.
- Application volume or staffing makes manual access control unreliable.
- A privacy, security, legal or regulatory review requires a different arrangement.
- The process begins collecting materially more sensitive information.
- A sharing or access-control incident occurs.
- The school moves from establishment activity into ongoing operations.

Until a trigger occurs, Google Drive and Google Sheets remain an accepted interim
deployment choice when these guidelines are followed.
