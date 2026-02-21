/**
 * Constants and configuration
 */

export const DOM = {
  // Sections
  uploadSection: "uploadSection",
  navSection: "navSection",
  previewSection: "previewSection",
  settingsSection: "settingsSection",
  helpSection: "helpSection",
  confirmationModal: "confirmationModal",
  statusSection: "statusSection",

  // Upload
  uploadBtn: "uploadBtn",
  fileInput: "fileInput",
  fileName: "fileName",

  // Navigation
  prevBtn: "prevBtn",
  nextBtn: "nextBtn",
  prevBtnBottom: "prevBtnBottom",
  nextBtnBottom: "nextBtnBottom",
  caseJump: "caseJump",
  filterPending: "filterPending",
  currentIndex: "currentIndex",
  totalCount: "totalCount",
  currentIndexBottom: "currentIndexBottom",
  totalCountBottom: "totalCountBottom",
  pendingCount: "pendingCount",
  submittedCount: "submittedCount",
  skippedCount: "skippedCount",

  // Form fields
  caseId: "caseId",
  date: "date",
  attending: "attending",
  ageCategory: "ageCategory",
  asa: "asa",
  anesthesia: "anesthesia",
  procedureCategory: "procedureCategory",
  comments: "comments",
  caseStatus: "caseStatus",

  // Actions
  skipBtn: "skipBtn",
  fillBtn: "fillBtn",
  fillSubmitBtn: "fillSubmitBtn",
  beastModeBtn: "beastModeBtn",
  beastModeText: "beastModeText",

  // Help
  helpToggle: "helpToggle",

  // Confirmation modal
  confirmCheckbox: "confirmCheckbox",
  confirmAccuracyCheckbox: "confirmAccuracyCheckbox",
  confirmBtn: "confirmBtn",
  declineBtn: "declineBtn",
  declineMessage: "declineMessage",
  confirmInstitution: "confirmInstitution",

  // Settings
  settingsToggle: "settingsToggle",
  settingInstitution: "settingInstitution",
  settingDefaultAttending: "settingDefaultAttending",
  settingSubmitDelay: "settingSubmitDelay",
  submitDelayValue: "submitDelayValue",
  settingCardiacAutoFill: "settingCardiacAutoFill",
  settingAuto5EPathology: "settingAuto5EPathology",
  settingShowWarnings: "settingShowWarnings",
  saveSettingsBtn: "saveSettingsBtn",
  clearSessionBtn: "clearSessionBtn",

  // Status
  statusMessage: "statusMessage",

  // Validation
  validationSummary: "validationSummary",
  validationText: "validationText",
};

export const REQUIRED_COLUMNS = [
  "Case ID",
  "Case Date",
  "Supervisor",
  "Age",
  "Original Procedure",
  "ASA Physical Status",
  "Anesthesia Type",
  "Procedure Category",
];

export const OPTIONAL_COLUMNS = [
  "Airway Management",
  "Specialized Vascular Access",
  "Specialized Monitoring Techniques",
];

export const EXPECTED_COLUMNS = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS];

export const STORAGE_KEYS = {
  cases: "acgme_cases",
  currentIndex: "acgme_currentIndex",
  caseStatuses: "acgme_caseStatuses",
  settings: "acgme_settings",
  confirmed: "acgme_uphs_confirmed",
};

export const STATUS_TYPES = {
  pending: "pending",
  submitted: "submitted",
  skipped: "skipped",
};

export const ACGME_URL_PATTERN = "apps.acgme.org/ads/CaseLogs/CaseEntry";
