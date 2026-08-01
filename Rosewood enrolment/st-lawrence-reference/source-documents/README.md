# Third-Party Source Documents

These files are point-in-time reference snapshots of documents linked from the
St Lawrence of Brindisi online application gateway. They are not Rosewood College
policies and must not be adopted or published as Rosewood policy without approval.

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

## Integrity Check

From the repository root:

```sh
shasum -a 256 "Rosewood enrolment/st-lawrence-reference/source-documents"/*.pdf
```

## Known Missing Source Document

The live enrolment agreement and Student Code of Conduct reference an ICT Acceptable
Usage Policy and User Agreement. Its download URL has not yet been observed, so it is
not included in this archive. This is a known capture gap rather than an optional file.
