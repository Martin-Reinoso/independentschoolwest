# Third-Party Source Documents

These files are point-in-time reference snapshots of documents linked from the
St Lawrence of Brindisi application, acceptance and public policy-library journey.
They are not Rosewood College policies and must not be adopted or published as
Rosewood policy without approval.

Before operational use, check the source URL for a newer version and confirm that
retaining or redistributing the snapshot remains permitted.

| Local file | Source title | Source URL | Retrieved | Pages | SHA-256 |
| --- | --- | --- | --- | --- | --- |
| `st-lawrence-enrolment-policy.pdf` | Enrolment Policy | https://safesmartsolutions.com.au/smart_dev/doc_media/EnrolmentPolicy/latest/StLawrenceofBrindisiPrimarySchool/1c0c5b5796 | 2026-07-31 | 6 | `0bc078b6b4417719c146054fc1af6e2ac96eb665f508ab0fb7deb8e193e8f146` |
| `macs-enrolment-procedure.pdf` | Enrolment Procedures for MACS Schools | https://safesmartsolutions.com.au/smart_dev/doc_media/EnrolmentProceduresforMACSSchools/latest/StLawrenceofBrindisi-WeirViews/6d7d71c146 | 2026-07-31 | 9 | `aaace258fc4f85cdd2dc69ae83b69744f1ffd8fdc70e6b46a4a71648f70fb57d` |
| `macs-privacy-policy.pdf` | MACS Privacy Policy | https://www.macs.vic.edu.au/MelbourneArchdioceseCatholicSchools/media/About-Us/Policies/Privacy/Privacy-Policy.pdf | 2026-07-31 | 10 | `3f6cc9f316fe55d1e16e6f04a106e83a7feab306f5af8c096a5264a5e2c7e3fa` |
| `macs-privacy-collection-notice-parents-students.pdf` | Privacy Collection Notice - Students and Parents | https://www.macs.vic.edu.au/MelbourneArchdioceseCatholicSchools/media/About-Us/Policies/Privacy/Privacy-Collection-Notice.pdf | 2026-07-31 | 7 | `8f85dade36f46fb5c7cfbc4e1c467699eccd7fa53bf1894caf53285c181b4e7e` |
| `st-lawrence-parent-guardian-carer-code-of-conduct.pdf` | Parent/Guardian/Carer Code of Conduct | https://safesmartsolutions.com.au/smart_dev/doc_media/Parent-Guardian-CarerCodeofConduct/latest/StLawrenceofBrindisiPrimarySchool/1c0c5b5796 | 2026-08-01 | 4 | `eab2211893f0c0b56e81b3e77e6b018d512db47dcabf7bc7c7e023179a6149b5` |
| `st-lawrence-student-code-of-conduct.pdf` | Student Code of Conduct | https://safesmartsolutions.com.au/smart_dev/doc_media/StudentCodeofConduct/latest/StLawrenceofBrindisi-WeirViews/6d7d71c146 | 2026-08-01 | 3 | `451be61cd79e82f04b239966adf78eb4b5fb3b179e7e58abb588c60e5821ebfe` |
| `st-lawrence-ict-acceptable-usage-policy-students.pdf` | ICT Acceptable Usage Policy - Students | https://safesmartsolutions.com.au/smart_dev/doc_media/ICTAcceptableUsagePolicy/latest/StLawrenceofBrindisiPrimarySchool/1c0c5b5796 | 2026-08-01 | 6 | `eedf806040f4fcc215fe710b09abf86be488b6d43592f0a9505b012f8ca822e6` |
| `school-family-occupation-index-parent-occupation-groups.pdf` | School Family Occupational Index: Parent Occupation Groups | https://enquirytracker.net/school/18a45f8256c9456cabddeebd0075caf0/School_Family_Occupation_Index_Parent_Occupation_Groups_2023.pdf | 2026-08-01 | 4 | `e2cdf1e38f94d5191cdc5d04b2c6df402e5c94b06a4b13c0203a89b0f78010b3` |
| `st-lawrence-school-enrolment-agreement.pdf` | School Enrolment Agreement | https://safesmartsolutions.com.au/smart_dev/doc_media/SchoolEnrolmentAgreement/latest/StLawrenceofBrindisi-WeirViews/6d7d71c146 | 2026-08-01 | 8 | `a8655f5ded1db2388abb52bc73b85702acd69bf01e33d4abfedb902fc5e24b6c` |
| `cecv-statement-of-commitment-to-child-safety.pdf` | CECV Statement of Commitment to Child Safety | https://www.macs.vic.edu.au/MelbourneArchdioceseCatholicSchools/media/Documentation/Documents/Commitment-Statement_A4.pdf | 2026-08-01 | 2 | `d912b19e3bdc1d4c22bdccc70393647375d0802cd94fcb7ab4d106bb9d35bb4a` |
| `st-lawrence-enrolment-form.docx` | Enrolment Form - St Lawrence of Brindisi Primary School | https://safesmartsolutions.com.au/smart_dev/doc_media/EnrolmentPolicyEnrolmentForm/latest/StLawrenceofBrindisiPrimarySchool/1c0c5b5796 | 2026-08-01 | 8 rendered | `3aa524abc54d4ffc48ca86eeab9ecac286a8b9aa75de03eccee585971dc7f88c` |

## Integrity Check

From the repository root:

```sh
shasum -a 256 "Rosewood enrolment/st-lawrence-reference/source-documents"/*.pdf \
  "Rosewood enrolment/st-lawrence-reference/source-documents"/*.docx
```

## Coverage Notes

- The ICT policy is archived. It refers to separate age-banded Acceptable Use
  Agreements for Years F-4, 5-8 and 9-12, but no public St Lawrence download link for
  those agreements was observed. The live acceptance form links only the policy.
- The enrolment form is supplied by the policy portal as a native DOCX. Its eight
  pages were rendered and visually checked without changing the source file.
- The 2023 School Enrolment Agreement contains a dead legacy CECV child-safety link.
  The archived statement is the official MACS-hosted document corresponding to that
  reference.
- Birth certificates, reports, medical plans, passport or visa evidence and court
  orders are family-supplied evidence, not downloadable school templates.
- `policy-portal-inventory.md` records the complete Enrolment category and explains
  which wider policy-library files were outside the observed transaction.
