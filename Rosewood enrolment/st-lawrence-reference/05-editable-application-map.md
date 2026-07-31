# Editable Application Map

## Scope And Safety

This record describes the editable five-step Enquiry Tracker application observed on
31 July 2026 after a verified contact opened a Not Started student record. The review
used the family's explicitly designated test draft. No file was uploaded, no signature
was drawn, no signature declaration was accepted and Submit was never pressed.

Personal names, contact details, addresses, identifiers, invitation URLs, one-time
codes and uploaded-file names are excluded. The static walkthrough uses synthetic
placeholders and has no backend, persistence or working upload/submission action.

## Application Shell And Navigation

- The header displays a cloud save state: `Saved` or `Unsaved Changes`.
- Five numbered markers remain visible: Student, Parent/Guardian, Documents,
  Conditions and Signature.
- A marker can be clicked directly; completion of the current step is not required.
- Next advances one step and Back returns one step.
- Leaving an incomplete step changes its marker to a red error state and adds
  `Missing required fields.` The warning does not block step navigation.
- Submit sits after the five steps and remained disabled throughout the incomplete
  test application.
- Required status is implemented partly through custom Angular validation. The
  browser's native `required` attribute is therefore not a complete specification.

## Step 1: Student

### Student Details

Names, preferred name, date of birth, gender, religion, current school year, current
early-learning centre/kindergarten/primary school, entry year and year level of entry.
The observed entry-year catalogue ran from 2026 to 2045. Entry levels were Foundation
and Years 1 to 6. Current school year offered Not at School, Early Years/Kinder,
Foundation and Years 1 to 6.

The current-school catalogue was localised: `*Not At School`, Our Lady of Rosary
(displayed with a leading zero in the live list), St Mary's, Aspire Atherstone, Aspire
Cobblebank, Aspire Thornhill Park, Binap Primary School, Botanica Springs Kindergarten,
Bridge Road Kindergarten, Brookfield Kindergarten, Exford Primary School, Eynesbury
Kindergarten, Eynesbury Primary School, Kool Kids Weir Views, Melton South Early
Learning Kinder, Melton South Primary School, Mt Carberry Preschool, St Anthony's
Catholic Primary School, St Catherine of Siena Catholic Primary School, St Dominic's
Catholic Primary School, Strathtulloh Primary School and Other.

Religion offered Catholic; Buddhist; Christian Other; Hindu; Islam / Muslim; Jewish;
Sikh; No Religion; Orthodox; Pentecostal; a duplicated Buddhist option; Booked for
Baptism; Evangelical; Anglican; and Other.

### Residence And Family

- Share this address with other contacts: Yes, share / No, keep private.
- Home care arrangement: Both Parents, Mother Only, Father Only, Shared Custody,
  Carer / Guardian, Out-of-home care, Kinship or Other.
- Other care arrangement and shared-parenting schedule text fields are visible.
- Address, suburb, state, postcode and country.
- Family connection: Current Family, Previous Family or New Family.
- Future siblings, siblings already attending and other relatives are separate
  required Yes/No questions.
- Each Yes branch reveals a repeatable record and Add action. Future-sibling fields
  are first name, last name, year level, starting year, date of birth and current
  school/preschool. Attending-sibling fields are name, status, date of birth,
  year/grade and school/preschool. Other-relative fields are name, relationship and
  year.

### Nationality, Citizenship And Language

Current country of residence, country of birth, country of nationality, ethnicity,
arrival/return date, permanent/temporary residential status, Australian citizenship,
Indigenous status, main language and other languages are collected. Country controls
share an exhaustive 249-country catalogue. The main-language control has a large
catalogue of approximately 395 values, including Australian Indigenous Language.

Australian citizenship No reveals evidence-of-residency options: Permanent Resident,
Eligible for Australian Passport, Temporary Resident and Other/Visitor/Overseas
Student, followed by required visa subclass and expiry plus previous visa subclass
and MACS guidance. Country of Birth = Australia did not hide the arrival fields.

Indigenous status offered Aboriginal; Torres Strait Islander; Aboriginal and Torres
Strait Islander; and Not Applicable.

### Additional Needs, Sacraments And Medical

Additional Needs Yes reveals a required multi-select with Autism (ASD), Acquired Brain
Injury, ADD/ADHD, Anxiety, Behavioural Concerns, Giftedness, Global Development Delay,
oral-language/communication difficulties, intellectual disability/developmental
delay, physical impairment, mental-health issues, vision impairment, hearing
impairment and Other. Until one is selected the form shows
`Please select a minimum of 1 items.` Other reveals a required free-entry item.

The step also records health-professional categories, whether reports are attached,
NDIS support, court or parenting orders and other relevant information.

Sacramental information records parish and independent Baptism, Reconciliation,
Eucharist and Confirmation checkboxes, each with date and location controls.

Medical details include a minimum-one checkbox group for no condition, anaphylaxis,
asthma, diabetes, epilepsy, migraines and Other; condition and allergy text; anaphylaxis
risk and EpiPen/Anapen; a separate minimum-one immunisation Yes/No group; humanitarian
health check; doctor name/address/phone; Medicare number/reference/expiry; private
insurance; ambulance cover; and health-care-card status/details.

## Step 2: Parent/Guardian

The existing primary contact is prefilled from the matched record. Direct inspection
confirmed that Given Name, Surname, Email and Mobile are enabled and editable, not
read-only, disabled or hardcoded. Mobile is a required telephone field.

Each repeatable contact contains:

- share-details privacy choice; title; given and family names; email; mobile, home and
  work phones; relationship; Primary/Secondary contact type; marital status; religion;
  SMS choice; and health-care-card details
- residential address and a postal-address-same Yes/No choice; No reveals required
  postal address fields
- alumni Yes/No; Yes reveals graduation year and name while at school
- occupational group, occupation, employer, school education and further education
- birth country, nationality, ethnicity, Aboriginal/Torres Strait Islander response,
  languages, residency status, visa subclass and visa expiry

Titles were Mr, Mrs, Ms, Dr and Miss. Relationships were Father, Mother, Stepfather,
Stepmother, Guardian, Uncle, Aunt, Grandparent, Friend, Unknown and Brother. Marital
status offered Married, De-Facto, Divorced, Single, Separated, Widowed, Engaged and
Other. Residency was Citizen, Permanent Resident or Temporary Resident.

Occupational groups A to D use the standard parent occupation categories; N means no
paid employment in the previous 12 months. The fixed occupation catalogue contained:
Academic; Accountant; Acting/Theatre; Advertising; Agriculture/Farming; Agronomist; Analyst; Animal Worker; Antique/Art Dealer; Architecture/Drafting; Armed Services; Artist/Painter; Author/Writer; Aviation/Pilot/Hostess; Banking; Bookmaker; Builder; Business Admin/Manager; Butcher; Caterer; Chemist / Pharmacy; Cleaner; Clerk; Communications; Composing; Computers; Construction/Building; Consultant; Consulting Services; Contractor; Cook; Counselling; Deli Owner; Dental Technician; Dentistry; Detective; Development Officer; Diplomatic Corps; Director; Doctor (Medicine); Driver; Economist; Editor; Education; Electrician; Engineering; Entertainment; Fashion; Financial Services; Fire Officer; Food/Catering; Foreman; Garden/Plants; General Administration; Geology; Germany; Government Departments; Grazier; Hair Dresser; Health Services; Home Duties; Homemaker/Houseperson; Hospitality; Hotel; Insurance; Interior Design; Interpreter; Investor; Jewellery Services; Laundry Proprietor; Lawyer; Legal Services; Library Services; Manager; Manufacturer; Manufacturing Industry; Marketing; Mechanic; Media/TV/Radio/Newspapers; Medical Records Admin; Merchant; Minister; Motel Proprietor; Nurse; Optometrist; Panel Shop Prop; Personnel; Phamacist; Photography; Physiotherapist; Plumber; Postman; Professional Polo Player; Programmer; Psychologist; Public Servant; Publishing; Radiographer; Real Estate; Recreation; Religion; Removalist; Retailer; Retired; Sales Manager; Salesman; Scientist; Secretarial/Clerical; Self Employed; Social Work; Sport/Athletics; Storeman; Student; Surveyor; Technician; Tradespeople; Transport; Transport Operator; Travel Industry; Veterinarian; Viticulture; Volunteer Worker; Welder; and Winemaker.

"Germany" and "Phamacist" are preserved as observed source-list anomalies, not
corrections. School education offered Year 12, Year 11, Year 10 and Year 9 or below.
Further education offered Bachelor degree or above, Advanced Diploma/Diploma,
Certificate I-IV and no post-school qualification.

Add Contact creates a complete additional guardian panel and Remove action. The new
contact asks whether the school may contact that person about this student. `No, do
not contact them` also means the system will not send that person an email requesting
a signature. A spouse selector is populated from recorded contacts. The family must
also confirm that no more legal guardians need to be added.

Two emergency contacts are requested, with first and last names, relationship,
mobile, home/work phone and email. The first includes a share-details privacy choice.

## Step 3: Documents

| Category | Required count | Observed guidance |
| --- | ---: | --- |
| Birth Certificate | 1 | Copy of the student's birth certificate |
| Immunisation Statement / Medical Management Plan(s) / Health Professional Report(s) | 0 | Combined evidence category |
| SchooL Reports / NAPLAN Results | 0 | Two most recent school reports and available NAPLAN results; source preserves the unusual capital L |
| Sacramental Certificates | 0 | Relevant sacramental evidence |
| Proof of Address | 1 | Gas, electricity or water bill |
| Passport / Visa Documentation | 0 | Relevant residency and visa evidence with MACS guidance |

Each category accepts multiple files by drag-and-drop or Browse. Maximum file size is
10.0 MB. Accepted extensions are `.doc`, `.docx`, `.pdf`, `.odt`, `.png`, `.gif`,
`.bmp`, `.jpg`, `.jpeg`, `.heic`, `.heif`, `.mp4`, `.avi`, `.mov`, `.webm`, `.mkv`,
`.mpeg`, `.3gp`, `.flv` and `.ogg`.

## Step 4: Conditions

Previous-school permission is a required checkbox followed by previous school name,
address and an interstate No/Yes/Not Applicable choice.

Fee responsibility is displayed as three checkbox cards: both guardians, one guardian
or a percentage split requiring a custodial court order. Each branch contains nominee,
percentage and date fields. Although the copy implies one choice, all three cards
could be selected simultaneously and no exclusivity error appeared.

The required discovery-source list contains Advertising, Current School Family, Early
Learning Centre/Kindergarten, Friends, Internet Search, Live in Area, Local
Parish/Church, Past Student/Family, School Website, Social Media, Word of Mouth and
Another Primary School.

The influence checklist contains Reputation; Environment & Atmosphere;
Mission/Values/Culture; Faith Based; Location; Facilities; Fees; Class Sizes; Size of
school; Pastoral Care; Catering to Individual Needs; Learning Support; Quality of
Teaching; Curriculum Range & Choice; Sports; Arts; Co-curriculum; Coeducation; Family
History/Connection; Friends Attending; Referral from Friends/Family; and Tour. The
instruction asks for the three most important, but the observed validator only
enforced a minimum of one and allowed four selections.

## Step 5: Signature

The page states that completing, signing and lodging the application is required for
consideration but does not guarantee enrolment; enrolment is formalised only after an
offer and Enrolment Agreement.

It reproduces Victorian admission guidance covering a parent under the Family Law Act
1975, equal parental responsibility absent a court order, separated parents or court
orders, informal carers with a statutory declaration, carer responsibilities,
12-month statutory declarations, parent priority in a dispute, secondary-student
participation and the school privacy disclaimer. The submitted read-only record also
showed the mature independent student line; the editable snapshot did not render that
line, so the difference is retained as an observed-version discrepancy.

The active signer must accept an IP-address recording/storage acknowledgement and a
read/understood/consent declaration, draw on one signature canvas, enter a date and,
when only one guardian is available in the form, explain why there is only one
signature. Additional Information is optional.

Adding a second contactable guardian did not add a second local canvas. Instead, the
single-signature explanation disappeared. Together with the `do not contact` help,
the Pending Signatures submitted view and the all-signatures-complete email, this
supports the following workflow: the first guardian signs locally; each additional
contactable guardian receives a separate signature request; the application remains
pending until the required signature set is complete. This is an evidence-based
inference, not a captured second-guardian email screen.

## Replica Fidelity Boundary

The walkthrough reproduces section order, field types, principal option catalogues,
conditional branches, step navigation, missing-field markers, minimum-one messages,
add-contact behavior, upload constraints and signature canvas interaction. It does
not reproduce third-party source code, private values, active URLs, network calls,
autosave, uploads, email dispatch or submission.
