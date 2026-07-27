import { sheetsRequest } from "./google-sheets.mjs";

const SHEETS = {
  Dashboard: [],
  Invitations: [
    "invite_id", "token_hash", "family_label", "recipient_email", "student_name", "status",
    "created_at", "expires_at", "first_opened_at", "last_activity_at", "submitted_at", "submission_id"
  ],
  Applications: [
    "submission_id", "invite_id", "submitted_at", "status", "student_first_name", "student_last_name",
    "student_date_of_birth", "entry_year", "entry_year_level", "parent_a_name", "parent_a_email",
    "parent_a_mobile", "parent_b_name", "parent_b_email", "referral_source", "decision_factors",
    "legal_version", "signature_a_name", "signature_a_date", "signature_b_name", "signature_b_date",
    "network_fingerprint", "user_agent", "documents_json", "application_json"
  ],
  Engagement: [
    "event_id", "invite_id", "session_id", "event_name", "section", "occurred_at", "elapsed_seconds",
    "viewport", "metadata_json"
  ]
};

const metadata = await sheetsRequest("?fields=sheets.properties");
const existing = new Map(metadata.sheets.map((sheet) => [sheet.properties.title, sheet.properties]));
const canDeleteDefaultSheet = metadata.sheets.length === 1 && existing.has("Sheet1");
const addRequests = Object.keys(SHEETS)
  .filter((title) => !existing.has(title))
  .map((title) => ({ addSheet: { properties: { title } } }));

if (addRequests.length) {
  await sheetsRequest(":batchUpdate", {
    method: "POST",
    body: JSON.stringify({ requests: addRequests })
  });
}

const refreshed = await sheetsRequest("?fields=sheets.properties");
const properties = new Map(refreshed.sheets.map((sheet) => [sheet.properties.title, sheet.properties]));

for (const [title, headers] of Object.entries(SHEETS)) {
  if (!headers.length) continue;
  const endColumn = String.fromCharCode(64 + headers.length);
  const range = encodeURIComponent(`${title}!A1:${endColumn}1`);
  await sheetsRequest(`/values/${range}?valueInputOption=RAW`, {
    method: "PUT",
    body: JSON.stringify({ majorDimension: "ROWS", values: [headers] })
  });
}

const dashboardValues = [
  ["Rosewood College enrolment dashboard", "", ""],
  ["Updated automatically from Invitations and Engagement", "", ""],
  ["", "", ""],
  ["Funnel", "Families", "Conversion from invited"],
  ["Invited", '=COUNTA(Invitations!A2:A)', '=IFERROR(B5/B5,0)'],
  ["Opened", '=COUNTIF(Invitations!F2:F,"opened")+COUNTIF(Invitations!F2:F,"started")+COUNTIF(Invitations!F2:F,"submitted")', '=IFERROR(B6/B5,0)'],
  ["Started", '=COUNTIF(Invitations!F2:F,"started")+COUNTIF(Invitations!F2:F,"submitted")', '=IFERROR(B7/B5,0)'],
  ["Submitted", '=COUNTIF(Invitations!F2:F,"submitted")', '=IFERROR(B8/B5,0)'],
  ["", "", ""],
  ["Operational view", "Value", ""],
  ["Invitations expiring in 7 days", '=COUNTIFS(Invitations!H2:H,">="&TODAY(),Invitations!H2:H,"<="&TODAY()+7,Invitations!F2:F,"<>submitted")', ""],
  ["Applications submitted today", '=COUNTIFS(Applications!C2:C,">="&TODAY(),Applications!C2:C,"<"&TODAY()+1)', ""],
  ["Average minutes to submit", '=IFERROR(AVERAGE(FILTER(Engagement!G2:G/60,Engagement!D2:D="submission_completed")),0)', ""]
];
const dashboardRange = encodeURIComponent("Dashboard!A1:C13");
await sheetsRequest(`/values/${dashboardRange}?valueInputOption=USER_ENTERED`, {
  method: "PUT",
  body: JSON.stringify({ majorDimension: "ROWS", values: dashboardValues })
});

const formattingRequests = [];
for (const [title, headers] of Object.entries(SHEETS)) {
  const sheet = properties.get(title);
  if (!sheet) continue;
  formattingRequests.push({
    updateSheetProperties: {
      properties: { sheetId: sheet.sheetId, gridProperties: { frozenRowCount: title === "Dashboard" ? 4 : 1 } },
      fields: "gridProperties.frozenRowCount"
    }
  });
  if (headers.length) {
    formattingRequests.push({
      repeatCell: {
        range: { sheetId: sheet.sheetId, startRowIndex: 0, endRowIndex: 1 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.082, green: 0.137, blue: 0.231 },
            textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true },
            horizontalAlignment: "CENTER"
          }
        },
        fields: "userEnteredFormat"
      }
    });
    formattingRequests.push({
      setBasicFilter: {
        filter: {
          range: { sheetId: sheet.sheetId, startRowIndex: 0, startColumnIndex: 0, endColumnIndex: headers.length }
        }
      }
    });
  }
}

const dashboard = properties.get("Dashboard");
if (dashboard) {
  formattingRequests.push(
    {
      repeatCell: {
        range: { sheetId: dashboard.sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 3 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.082, green: 0.137, blue: 0.231 },
            textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true, fontSize: 16 }
          }
        },
        fields: "userEnteredFormat"
      }
    },
    {
      repeatCell: {
        range: { sheetId: dashboard.sheetId, startRowIndex: 3, endRowIndex: 8, startColumnIndex: 0, endColumnIndex: 3 },
        cell: { userEnteredFormat: { borders: { bottom: { style: "SOLID", color: { red: 0.86, green: 0.84, blue: 0.8 } } } } },
        fields: "userEnteredFormat.borders"
      }
    },
    {
      repeatCell: {
        range: { sheetId: dashboard.sheetId, startRowIndex: 4, endRowIndex: 8, startColumnIndex: 2, endColumnIndex: 3 },
        cell: { userEnteredFormat: { numberFormat: { type: "PERCENT", pattern: "0.0%" } } },
        fields: "userEnteredFormat.numberFormat"
      }
    },
    {
      autoResizeDimensions: {
        dimensions: { sheetId: dashboard.sheetId, dimension: "COLUMNS", startIndex: 0, endIndex: 3 }
      }
    }
  );
}

if (canDeleteDefaultSheet && properties.has("Sheet1")) {
  formattingRequests.push({
    deleteSheet: { sheetId: properties.get("Sheet1").sheetId }
  });
}

await sheetsRequest(":batchUpdate", {
  method: "POST",
  body: JSON.stringify({ requests: formattingRequests })
});

console.log("Rosewood enrolment workbook initialized.");
