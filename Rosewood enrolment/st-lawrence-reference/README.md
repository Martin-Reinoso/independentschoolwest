# St Lawrence Of Brindisi Enrolment Process Reference

## Purpose

This project records how the St Lawrence of Brindisi enrolment process works so
Rosewood can understand an established-school workflow without automatically
replicating every step.

The intended outputs are:

- a sourced Markdown record of the process
- a field and conditional-logic register
- a document, consent and declaration register
- a record of automatic and staff-sent communications
- a navigable static HTML walkthrough with no backend and no data submission
- an explicit decision log showing what Rosewood will adopt, adapt, defer or reject

## Interpretation

"Capture the application" means observe and document the process. It does not mean
delete the existing Rosewood portal, use the St Lawrence production form to submit
real information, or reproduce private family records.

The current Rosewood portal should be preserved until an explicit archive or removal
decision is approved.

## Two-Layer Evidence Model

### Restricted Google Drive

Store raw evidence in a restricted project folder:

- screenshots and screen recordings
- downloaded blank forms and information packs
- sanitised copies of automatic emails
- notes containing active links or temporary access details
- source documents whose redistribution rights are unclear

Do not use real student or family data. Redact names, email addresses, phone numbers,
application references, tokens and other identifiers before sharing evidence.

### Public Repository

Store only sanitised, purpose-written project records:

- process summaries
- field and rule inventories
- paraphrased communication sequences
- Rosewood decisions
- the static non-submitting walkthrough

Do not commit active application links, credentials, personal information, raw email
headers or unreviewed third-party source files. This repository is public.

## Capture Workflow

1. Register each source in `00-capture-register.md`.
2. Observe the live process from the first screen using synthetic information only.
3. Record every screen, field, option, help message, validation rule and conditional
   branch in `02-form-and-rules.md`.
4. Record required documents, declarations, signatures and consent rules in the same
   register with a source reference.
5. Record confirmation screens and each email or follow-up in
   `03-communications.md`.
6. Assemble the end-to-end sequence in `01-process-map.md`.
7. Record Rosewood's response to each material feature in
   `04-rosewood-decisions.md`.
8. Build a static HTML walkthrough only after the captured sequence has been checked.
9. Verify the HTML against the Markdown source record. The HTML must not send,
   persist or upload data.

## Static Walkthrough Requirements

The walkthrough will:

- begin with an index explaining that it is a process reference
- provide persistent Previous, Next and Process Map navigation
- represent each material screen or communication as a separate step
- show conditional branches and validation notes without requiring real data
- include email and document checkpoints in the navigation
- use obviously synthetic sample values where an example is needed
- contain no production form endpoint, analytics, authentication token or upload code
- use `noindex` if it is ever hosted

Before publishing the walkthrough, review whether St Lawrence wording, branding and
screenshots may be redistributed. When that is unclear, use paraphrased text and
neutral Rosewood reference styling.

## Working Files

- `00-capture-register.md`: source and evidence index
- `01-process-map.md`: chronological process and branches
- `02-form-and-rules.md`: screens, fields, validation, documents and consent
- `03-communications.md`: emails, confirmations, reminders and staff actions
- `04-rosewood-decisions.md`: adopt, adapt, defer and reject decisions

The ignored `raw/` directory may be used for temporary local working material, but
restricted Google Drive is the durable location for raw evidence.
