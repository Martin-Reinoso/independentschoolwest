function present(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "boolean" || typeof value === "number") return true;
  return String(value ?? "").trim().length > 0;
}

function display(value) {
  if (!present(value)) return "Not provided";
  if (Array.isArray(value)) return value.map(display).join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function date(value) {
  if (!present(value)) return "Not provided";
  const text = String(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${text}T00:00:00.000Z`));
}

function timestamp(value) {
  if (!present(value)) return "Not provided";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Australia/Melbourne",
    timeZoneName: "short"
  }).format(parsed);
}

function confirmed(value) {
  return present(value) ? "Confirmed" : "Not confirmed";
}

function answer(label, value, format = display) {
  return { label, value: format(value) };
}

function field(values, key, label, options = {}) {
  if (options.when && !options.when(values)) return null;
  return answer(label, values[key], options.format || display);
}

function group(title, items, options = {}) {
  return {
    title,
    ...(options.badge ? { badge: options.badge } : {}),
    items: items.filter(Boolean)
  };
}

function section(id, title, groups, options = {}) {
  return {
    id,
    title,
    ...(options.note ? { note: options.note } : {}),
    groups
  };
}

function includes(values, key, expected) {
  const value = values[key];
  return (Array.isArray(value) ? value : [value]).includes(expected);
}

function formReleaseAtLeast(formVersion, minimum) {
  const match = String(formVersion || "").match(/\.(\d+)$/);
  return Boolean(match) && Number(match[1]) >= minimum;
}

function studentSections(values, options = {}) {
  const v8 = formReleaseAtLeast(options.formVersion, 8);
  return [
    section("student", "Student", [
      group("Student details", [
        field(values, "student_first", "First name"),
        field(values, "student_middle", "Middle name"),
        field(values, "student_last", "Last name"),
        field(values, "student_preferred", "Preferred name"),
        field(values, "student_dob", "Date of birth", { format: date }),
        field(values, "student_gender", "Gender"),
        field(values, "student_religion", "Religion"),
        field(values, "student_religion_other", "Other religion", { when: value => value.student_religion === "Other" || present(value.student_religion_other) }),
        field(values, "current_level", "Current school year"),
        field(values, "entry_year", "Year the student will commence at Rosewood College"),
        field(values, "entry_level", "Year level of entry at Rosewood College"),
        field(values, "current_school", "Current Early Learning Centre / Kindergarten / Primary School"),
        field(values, "current_school_other", "Other Early Learning Centre / Kindergarten / Primary School", { when: value => value.current_school === "Other" || present(value.current_school_other) }),
        ...(v8 ? [
          field(values, "interrupted_schooling", "Has the student experienced an extended absence or interruption to schooling?"),
          field(values, "interrupted_schooling_details", "Approximate dates and details", { when: value => value.interrupted_schooling === "Yes" || present(value.interrupted_schooling_details) })
        ] : [])
      ]),
      ...(!v8 ? [group("Previous education", [
        field(values, "previous_school_attended", "Has the student previously attended an early learning centre, kindergarten or school?"),
        field(values, "previous_school_name", "Institution", { when: value => value.previous_school_attended === "Yes" || present(value.previous_school_name) }),
        field(values, "previous_school_year_level", "Year level", { when: value => value.previous_school_attended === "Yes" || present(value.previous_school_year_level) }),
        field(values, "interrupted_schooling", "Has the student experienced an extended absence or interruption to schooling?"),
        field(values, "interrupted_schooling_details", "Approximate dates and details", { when: value => value.interrupted_schooling === "Yes" || present(value.interrupted_schooling_details) })
      ])] : []),
      ...(!v8 ? [group("Student residence", [
        field(values, "student_address_share", "Share this address with other Parent/Guardian?"),
        field(values, "care_arrangement", "Home care arrangement"),
        field(values, "care_other", "Other care arrangement", { when: value => includes(value, "care_arrangement", "Other") || present(value.care_other) }),
        field(values, "shared_parenting", "Shared parenting schedule", { when: value => includes(value, "care_arrangement", "Shared Custody") || present(value.shared_parenting) })
      ])] : []),
      group("Student primary address", [
        ...(v8 ? [
          field(values, "student_address_share", "Share this address with other Parent/Guardian?"),
          field(values, "care_arrangement", "Home care arrangement"),
          field(values, "care_other", "Other care arrangement", { when: value => includes(value, "care_arrangement", "Other") || present(value.care_other) }),
          field(values, "shared_parenting", "Shared parenting schedule", { when: value => includes(value, "care_arrangement", "Shared Custody") || present(value.shared_parenting) })
        ] : []),
        field(values, "student_address", "Address"),
        field(values, "student_suburb", "Suburb"),
        field(values, "student_state", "State"),
        field(values, "student_postcode", "Postcode"),
        field(values, "student_country", "Country")
      ]),
      group("Family", [
        field(values, "future_siblings", "Do you have any other children that may attend our school?"),
        field(values, "future_sibling_count", "How many children?", { when: value => value.future_siblings === "Yes" || present(value.future_sibling_count) })
      ])
    ]),
    section("nationality", "Nationality and Citizenship", [
      group("Government requirement", [
        field(values, "residence_country", "Student's current country of residence"),
        field(values, "birth_country", "Student's country of birth"),
        field(values, "nationality", "Student's country of nationality"),
        field(values, "ethnicity", "Student's ethnicity"),
        field(values, "arrival_date", "When did the student arrive in or return to live in Australia?", { format: date }),
        field(values, "residency_status", "What is the residential status of the student?"),
        field(values, "australian_citizen", "Is the student an Australian citizen?"),
        field(values, "residency_evidence", "Evidence of Australian residency", { when: value => value.australian_citizen === "No" || present(value.residency_evidence) }),
        field(values, "visa_subclass", "Visa subclass", { when: value => (present(value.residency_evidence) && value.residency_evidence !== "Eligible for Australian Passport") || present(value.visa_subclass) }),
        field(values, "visa_expiry", "Visa expiry", { format: date, when: value => (present(value.residency_evidence) && value.residency_evidence !== "Eligible for Australian Passport") || present(value.visa_expiry) }),
        field(values, "previous_visa", "Previous visa subclass", { when: value => (present(value.residency_evidence) && value.residency_evidence !== "Eligible for Australian Passport") || present(value.previous_visa) }),
        field(values, "indigenous_status", "Aboriginal / Torres Strait Islander"),
        field(values, "main_language", "Main language"),
        field(values, "other_languages", "Other languages")
      ])
    ], { note: "This information was collected to meet government reporting requirements." }),
    section("additional-needs", "General / Additional Needs", [
      group("Needs and support", [
        field(values, "formal_assessment", "Formal assessment relating to learning, development, wellbeing or giftedness"),
        field(values, "formal_assessment_details", "Assessment details", { when: value => value.formal_assessment === "Yes" || present(value.formal_assessment_details) }),
        field(values, "formal_assessment_report", "Assessment report available", { when: value => value.formal_assessment === "Yes" || present(value.formal_assessment_report) }),
        field(values, "additional_needs", "General / Additional Needs"),
        field(values, "need_categories", "Please specify", { when: value => value.additional_needs === "Yes" || present(value.need_categories) }),
        field(values, "need_other", "Other additional need", { when: value => includes(value, "need_categories", "Other") || present(value.need_other) }),
        field(values, "current_adjustments", "Adjustments or support currently provided"),
        field(values, "rosewood_adjustments", "Adjustments or support that may assist at Rosewood College"),
        field(values, "professional_categories", "Health professionals"),
        field(values, "professional_other", "Other health professional", { when: value => includes(value, "professional_categories", "Other") || present(value.professional_other) }),
        field(values, "reports_attached", "Reports attached"),
        field(values, "ndis_support", "NDIS support"),
        field(values, "court_orders", "Court or parenting orders"),
        field(values, "other_relevant_information", "Other relevant information")
      ])
    ], { note: "The submitted information assists the College to plan appropriate adjustments, support and transition arrangements." }),
    section("sacraments", "Sacraments", [
      group("Parish and sacraments", [
        field(values, "parish", "Parish where student lives"),
        ...["Baptism", "Reconciliation", "Eucharist", "Confirmation"].flatMap(name => {
          const key = `sacrament_${name}`;
          const selected = present(values[key]);
          return [
            answer(name, selected ? "Yes" : "No"),
            field(values, `${key}_date`, `${name} date`, { format: date, when: value => selected || present(value[`${key}_date`]) }),
            field(values, `${key}_location`, `${name} location`, { when: value => selected || present(value[`${key}_location`]) })
          ];
        })
      ])
    ]),
    section("medical", "Medical Details", [
      group("Medical information", [
        field(values, "medical_conditions", "Medical conditions"),
        field(values, "other_medical_condition", "Other medical condition", { when: value => includes(value, "medical_conditions", "Other") || present(value.other_medical_condition) }),
        field(values, "condition_details", "Condition details"),
        field(values, "allergy_details", "Allergy details"),
        field(values, "anaphylaxis_risk", "Anaphylaxis risk"),
        field(values, "anaphylaxis_device", "EpiPen / Anapen"),
        field(values, "immunisation", "Immunisation History Statement held and to be uploaded"),
        field(values, "humanitarian_health", "Refugee health check for a student who entered on a humanitarian visa"),
        field(values, "doctor_name", "Doctor name"),
        field(values, "doctor_address", "Doctor's practice/Address"),
        field(values, "doctor_phone", "Doctor phone"),
        field(values, "medicare_number", "Medicare number"),
        field(values, "medicare_reference", "Medicare reference number"),
        field(values, "medicare_expiry", "Medicare expiry", { format: date }),
        field(values, "private_insurance", "Private insurance", { when: value => present(value.private_insurance) }),
        field(values, "private_insurance_provider", "Private health insurance provider"),
        field(values, "private_insurance_policy", "Private health insurance policy number"),
        field(values, "ambulance_cover", "Ambulance cover"),
        field(values, "healthcare_card", "Health Care Card"),
        field(values, "student_healthcare_number", "Health Care Card No.", { when: value => value.healthcare_card === "Yes" || present(value.student_healthcare_number) }),
        field(values, "student_healthcare_expiry", "Health Care Card expiry", { format: date, when: value => value.healthcare_card === "Yes" || present(value.student_healthcare_expiry) })
      ])
    ])
  ];
}

const GUARDIAN_FIELDS = [
  ["share", "Share your contact details with other parents or guardians on this application?"],
  ["title", "Title"],
  ["first", "Given name"],
  ["last", "Surname"],
  ["email", "Email"],
  ["mobile", "Mobile phone"],
  ["home", "Home phone"],
  ["work", "Work phone"],
  ["relationship", "Relationship"],
  ["contact_type", "Contact type"],
  ["marital", "Marital status"],
  ["religion", "Religion"],
  ["sms", "SMS messaging"],
  ["healthcare", "Health Care Card"],
  ["address", "Residential address"],
  ["suburb", "Suburb"],
  ["state", "State"],
  ["postcode", "Postcode"],
  ["country", "Country"],
  ["postal_same", "Postal address same as residential?"],
  ["occupation_group", "Occupational group"],
  ["occupation", "Occupation"],
  ["employer", "Employer"],
  ["school_education", "School level education"],
  ["further_education", "University / further education"],
  ["birth_country", "Country of birth"],
  ["nationality", "Nationality"],
  ["ethnicity", "Ethnicity"],
  ["languages", "Record all languages spoken"],
  ["residency", "Residency status"],
  ["indigenous", "Aboriginal / Torres Strait Islander"]
];

function guardianSection(app, values, guardianCount, signerGuardianIndex) {
  const groups = [];
  for (let index = 0; index < guardianCount; index += 1) {
    const prefix = `app_guardian_${index}_`;
    const items = GUARDIAN_FIELDS.map(([suffix, label]) => field(values, `${prefix}${suffix}`, label));
    if (values[`${prefix}healthcare`] === "Yes" || present(values[`${prefix}healthcare_number`]) || present(values[`${prefix}healthcare_expiry`])) {
      items.splice(14, 0,
        field(values, `${prefix}healthcare_number`, "Health Care Card No."),
        field(values, `${prefix}healthcare_expiry`, "Health Care Card expiry", { format: date })
      );
    }
    if (values[`${prefix}postal_same`] === "No" || present(values[`${prefix}postal_address`])) {
      const indexAfterPostalAnswer = items.findIndex(item => item?.label === "Postal address same as residential?") + 1;
      items.splice(indexAfterPostalAnswer, 0,
        field(values, `${prefix}postal_address`, "Postal address"),
        field(values, `${prefix}postal_suburb`, "Postal suburb"),
        field(values, `${prefix}postal_state`, "Postal state"),
        field(values, `${prefix}postal_postcode`, "Postal postcode"),
        field(values, `${prefix}postal_country`, "Postal country")
      );
    }
    if (values[`${prefix}residency`] === "Temporary Resident" || present(values[`${prefix}visa_subclass`]) || present(values[`${prefix}visa_expiry`])) {
      const indexAfterResidency = items.findIndex(item => item?.label === "Residency status") + 1;
      items.splice(indexAfterResidency, 0,
        field(values, `${prefix}visa_subclass`, "Visa subclass"),
        field(values, `${prefix}visa_expiry`, "Visa expiry", { format: date })
      );
    }
    if (index > 0) {
      const control = (app.signerControls || []).find(item => Number(item.guardianIndex) === index);
      items.push(field(values, `${prefix}permission`, "Can the school contact this person?"));
      if (control) {
        items.push(answer("Contact permission", control.contactPermission ? "Contact permitted" : "Do not contact"));
        items.push(answer("Separate signature request", control.contactPermission ? "Separate signature request required" : "Signature request suppressed"));
        if (!control.contactPermission) items.push(answer("Application review", "Staff review required"));
      }
    }
    const name = [values[`${prefix}first`], values[`${prefix}last`]].filter(present).join(" ");
    groups.push(group(name || `Parent / Guardian ${index + 1}`, items, { badge: index === signerGuardianIndex ? "You" : "" }));
  }
  groups.push(group("Guardian confirmation", [
    field(values, "application_gateway_email", "Email used to access the application"),
    field(values, "app_guardians_complete", "All legal parents or guardians have been entered", { format: confirmed })
  ]));
  return section("guardians", "Parent / Guardian", groups);
}

function emergencySection(values, emergencyCount) {
  const groups = [];
  for (let index = 0; index < emergencyCount; index += 1) {
    const prefix = `emergency_${index}_`;
    const name = [values[`${prefix}first`], values[`${prefix}last`]].filter(present).join(" ");
    groups.push(group(name || `Emergency contact ${index + 1}`, [
      field(values, `${prefix}first`, "First name"),
      field(values, `${prefix}last`, "Last name"),
      field(values, `${prefix}relationship`, "Relationship"),
      field(values, `${prefix}mobile`, "Mobile phone"),
      field(values, `${prefix}home`, "Home phone"),
      field(values, `${prefix}work`, "Work phone"),
      field(values, `${prefix}email`, "Email")
    ]));
  }
  return section("emergency-contacts", "Emergency Contacts", groups);
}

const DOCUMENT_LABELS = [
  ["birth_certificate", "Birth Certificate"],
  ["health_and_immunisation", "Immunisation Statement / Medical Management Plan(s) / Health Professional Report(s)"],
  ["school_report", "School Reports / NAPLAN Results"],
  ["sacramental", "Sacramental Certificates"],
  ["residency", "Passport / Visa Documentation"]
];

function documentsSection(documents = {}) {
  return section("documents", "Documents", [
    group("Supporting documents", DOCUMENT_LABELS.map(([category, label]) => {
      const files = Array.isArray(documents[category]) ? documents[category] : [];
      const names = files.map(file => file?.fileName).filter(present);
      return answer(label, names.length ? names.join(", ") : "Not uploaded");
    }))
  ], { note: "Uploaded documents are listed by their original file names. The files remain private." });
}

function surveyGroup(values) {
  return group("Student and family survey", [
    field(values, "application_special_aptitudes", "In which subjects does your child have special aptitude?"),
    field(values, "application_preferred_subjects", "What are your child's preferred school subjects?"),
    field(values, "application_subjects_needing_help", "In which subjects may your child be in need of special help?"),
    field(values, "application_hobbies_cultural_pursuits", "What are your child's main hobbies or cultural pursuits (apart from sporting interests)?"),
    field(values, "application_sport_participation", "Does your child participate in any sports organised through the school or independent of the school?"),
    field(values, "application_extracurricular_activities", "Does your child attend any extra-curricular school activity?"),
    field(values, "application_local_library", "Does your child belong to a local library?"),
    field(values, "application_school_attractions", "What attracts you most to the school?"),
    field(values, "application_desired_personal_qualities", "What personal qualities would you most like to see developed in your child at the school?"),
    field(values, "application_mentoring_value", "What value do you think the mentoring system would have for you as parents?"),
    field(values, "application_intended_years", "How many years do you intend your child to study at our school?")
  ]);
}

function conditionsSection(values, options = {}) {
  if (present(values.application_student_agreement) || present(values.application_parent_agreement) || present(values.application_agreement_acknowledgement)) {
    return section("conditions", "Conditions", [
      group("Student commitments", [field(values, "application_student_agreement", "Student commitments accepted", { format: confirmed })]),
      group("Parent / Carer commitments", [field(values, "application_parent_agreement", "Parent / Carer commitments accepted", { format: confirmed })]),
      group("Acknowledgement", [field(values, "application_agreement_acknowledgement", "Parent / Carer Agreement acknowledged", { format: confirmed })]),
      ...(options.includeSurvey ? [surveyGroup(values)] : [])
    ]);
  }
  const feeItems = [field(values, "fee_option", "Who will be responsible for payment of school fees?")];
  if (values.fee_option === "Both Parents / Guardian") {
    feeItems.push(field(values, "fee_both_nominee", "Fee account recipient"), field(values, "fee_both_date", "Date", { format: date }));
  } else if (values.fee_option === "One Parent / Guardian") {
    feeItems.push(field(values, "fee_one_nominee", "Fee account recipient"), field(values, "fee_one_date", "Date", { format: date }));
  } else if (values.fee_option === "Percentage split with custodial court order") {
    feeItems.push(
      field(values, "fee_guardian_a", "Guardian A name"),
      field(values, "fee_guardian_a_percent", "Guardian A percentage"),
      field(values, "fee_guardian_b", "Guardian B name"),
      field(values, "fee_guardian_b_percent", "Guardian B percentage"),
      field(values, "fee_split_date", "Date", { format: date })
    );
  }
  return section("conditions", "Conditions", [
    group("Previous School / Preschool Permission", [
      field(values, "previous_school_permission", "Permission to contact previous school or preschool", { format: confirmed }),
      field(values, "previous_school_name", "Name of previous school / preschool / kindergarten"),
      field(values, "previous_school_address", "Address"),
      field(values, "previous_school_interstate", "Interstate?")
    ]),
    group("School Fee Responsibility", feeItems),
    group("Survey", [
      field(values, "application_discovery", "How did you hear about us?"),
      field(values, "application_influences", "Three most important influences")
    ])
  ]);
}

function signatureSection(app, values, guardianCount) {
  const recorded = (Array.isArray(app.signatures) ? app.signatures : []).map((signature, index) => group(
    signature.signerName || `Parent / Guardian ${index + 1}`,
    [
      answer("Signature", "Recorded securely"),
      answer("Signed", signature.signedAt, timestamp)
    ],
    { badge: index === 0 ? "Primary signature" : "Recorded" }
  ));
  return section("signature", "Signature", [
    group("Application declarations", [
      field(values, "application_signature_ip", "IP address recording acknowledged", { format: confirmed }),
      field(values, "application_signature_terms", "Application declaration accepted", { format: confirmed }),
      field(values, "application_signature_date", "Signature date", { format: date }),
      field(values, "application_one_signature_reason", "Explanation for only one signature", { when: value => guardianCount <= 1 || present(value.application_one_signature_reason) }),
      field(values, "application_additional_signature_later", "Additional parent/guardian signature request acknowledged", { format: confirmed, when: value => guardianCount > 1 || present(value.application_additional_signature_later) }),
      field(values, "application_additional_information", "Additional information")
    ]),
    ...recorded
  ], { note: "Personal information is held, used and disclosed in accordance with the College Privacy Collection Notice and Privacy Policy." });
}

export function buildApplicationReview(app, signerGuardianIndex = 0) {
  const values = app?.values || {};
  const guardianCount = Math.max(1, Math.min(6, Number(app?.guardianCount || 1)));
  const emergencyCount = Math.max(2, Math.min(6, Number(app?.emergencyCount || 2)));
  return {
    title: "Application for Enrolment",
    reference: display(app?.reference),
    revision: Number(app?.revision || 0),
    submittedAt: timestamp(app?.submittedAt),
    sections: [
      ...studentSections(values, { formVersion: app?.formVersion }),
      guardianSection(app || {}, values, guardianCount, signerGuardianIndex),
      emergencySection(values, emergencyCount),
      documentsSection(app?.documents),
      conditionsSection(values, { includeSurvey: formReleaseAtLeast(app?.formVersion, 8) }),
      signatureSection(app || {}, values, guardianCount)
    ]
  };
}
