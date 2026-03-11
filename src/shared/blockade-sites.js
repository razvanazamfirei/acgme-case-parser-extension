export const NEURAXIAL_BLOCKADE_SITE_AREA =
  "Neuraxial Blockade Site (Optional)";

export const PERIPHERAL_NERVE_BLOCKADE_SITE_AREA =
  "Peripheral Nerve Blockade Site (Optional)";

export const NEURAXIAL_BLOCKADE_SITE_OPTIONS = [
  "Caudal",
  "Cervical",
  "Lumbar",
  "T 1-7",
  "T 8-12",
];

export const OTHER_PERIPHERAL_NERVE_BLOCKADE_SITE =
  "Other - peripheral nerve blockade site";

export const PERIPHERAL_NERVE_BLOCKADE_SITE_OPTIONS = [
  "Adductor Canal",
  "Ankle",
  "Axillary",
  "Erector Spinae Plane",
  "Femoral",
  "Infraclavicular",
  "Interscalene",
  "Lumbar Plexus",
  "Paravertebral",
  "Popliteal",
  "Quadratus Lumborum",
  "Retrobulbar",
  "Saphenous",
  "Sciatic",
  "Supraclavicular",
  "Transverse Abdominal Plane",
  OTHER_PERIPHERAL_NERVE_BLOCKADE_SITE,
];

const PERIPHERAL_NERVE_BLOCKADE_SITE_MATCHERS = [
  { pattern: /\badductor canal\b/, type: "Adductor Canal" },
  { pattern: /\bankle\b/, type: "Ankle" },
  { pattern: /\baxillary\b/, type: "Axillary" },
  { pattern: /\berector spinae plane\b|\besp\b/, type: "Erector Spinae Plane" },
  { pattern: /\bfemoral\b/, type: "Femoral" },
  { pattern: /\binfraclavicular\b/, type: "Infraclavicular" },
  { pattern: /\binterscalene\b/, type: "Interscalene" },
  { pattern: /\blumbar plexus\b/, type: "Lumbar Plexus" },
  { pattern: /\bparavertebral\b/, type: "Paravertebral" },
  { pattern: /\bpopliteal\b/, type: "Popliteal" },
  { pattern: /\bquadratus lumborum\b|\bql\b/, type: "Quadratus Lumborum" },
  { pattern: /\bretrobulbar\b/, type: "Retrobulbar" },
  { pattern: /\bsaphenous\b/, type: "Saphenous" },
  { pattern: /\bsciatic\b/, type: "Sciatic" },
  { pattern: /\bsupraclavicular\b/, type: "Supraclavicular" },
  {
    pattern: /\btransverse abdominal plane\b|\btap\b/,
    type: "Transverse Abdominal Plane",
  },
];

const NEURAXIAL_BLOCKADE_SITE_MATCHERS = [
  { pattern: /\bcaudal\b/, type: "Caudal" },
  { pattern: /\bcervical\b/, type: "Cervical" },
  { pattern: /\blumbar\b/, type: "Lumbar" },
  {
    pattern:
      /\b(?:t\s*1\s*-\s*7|t1\s*-\s*7|thoracic\s*1\s*-\s*7|thoracic\s*1\s*(?:to|-)\s*7)\b/,
    type: "T 1-7",
  },
  {
    pattern:
      /\b(?:t\s*8\s*-\s*12|t8\s*-\s*12|thoracic\s*8\s*-\s*12|thoracic\s*8\s*(?:to|-)\s*12)\b/,
    type: "T 8-12",
  },
];

export function normalizeBlockadeSiteText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function splitBlockadeSiteValues(valuesString) {
  return String(valuesString || "")
    .split(/[;,]+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

export function isPeripheralBlockAnesthesia(anesthesia) {
  const normalized = String(anesthesia || "").trim();
  return normalized === "PNB Single" || normalized === "PNB Continuous";
}

export function isNeuraxialBlockAnesthesia(anesthesia) {
  const normalized = String(anesthesia || "").trim();
  return (
    normalized === "Spinal" || normalized === "Epidural" || normalized === "CSE"
  );
}

function extractPrimaryBlockTokens(caseData) {
  if (
    typeof caseData.primaryBlock === "string" &&
    caseData.primaryBlock.trim()
  ) {
    return splitBlockadeSiteValues(caseData.primaryBlock);
  }

  const comments = String(caseData.comments || "");
  const match = comments.match(/(?:^|\|\s*)block:\s*(.+)$/i);
  if (!match) {
    return [];
  }

  return splitBlockadeSiteValues(match[1]);
}

export function mapPeripheralBlockTokenToType(token) {
  const normalizedToken = normalizeBlockadeSiteText(token)
    .replace(/\bnerve\b/g, " ")
    .replace(/\bblockade\b/g, " ")
    .replace(/\bblock\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalizedToken) {
    return null;
  }

  for (const matcher of PERIPHERAL_NERVE_BLOCKADE_SITE_MATCHERS) {
    if (matcher.pattern.test(normalizedToken)) {
      return matcher.type;
    }
  }

  return OTHER_PERIPHERAL_NERVE_BLOCKADE_SITE;
}

export function mapNeuraxialBlockTokenToType(token) {
  const normalizedToken = normalizeBlockadeSiteText(token)
    .replace(/\bneuraxial\b/g, " ")
    .replace(/\bblockade\b/g, " ")
    .replace(/\bblock\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalizedToken) {
    return null;
  }

  for (const matcher of NEURAXIAL_BLOCKADE_SITE_MATCHERS) {
    if (matcher.pattern.test(normalizedToken)) {
      return matcher.type;
    }
  }

  return null;
}

function uniqueValues(values) {
  const seen = new Set();
  const unique = [];

  for (const value of values) {
    if (!value || seen.has(value)) {
      continue;
    }
    seen.add(value);
    unique.push(value);
  }

  return unique;
}

export function resolvePeripheralBlockadeSiteSelections(caseData) {
  const explicitSelections = splitBlockadeSiteValues(
    caseData.peripheralNerveBlockadeSite,
  );
  if (explicitSelections.length > 0) {
    return {
      selectedTypes: uniqueValues(explicitSelections),
      mappedToOther: [],
      unmappedTokens: [],
    };
  }

  if (!isPeripheralBlockAnesthesia(caseData.anesthesia)) {
    return { selectedTypes: [], mappedToOther: [], unmappedTokens: [] };
  }

  const selectedTypes = [];
  const mappedToOther = [];

  for (const token of extractPrimaryBlockTokens(caseData)) {
    const type = mapPeripheralBlockTokenToType(token);
    if (!type) {
      continue;
    }
    selectedTypes.push(type);
    if (type === OTHER_PERIPHERAL_NERVE_BLOCKADE_SITE) {
      mappedToOther.push(token);
    }
  }

  return {
    selectedTypes: uniqueValues(selectedTypes),
    mappedToOther,
    unmappedTokens: [],
  };
}

export function resolveNeuraxialBlockadeSiteSelections(caseData) {
  const explicitSelections = splitBlockadeSiteValues(
    caseData.neuraxialBlockadeSite,
  );
  if (explicitSelections.length > 0) {
    return {
      selectedTypes: uniqueValues(explicitSelections),
      unmappedTokens: [],
    };
  }

  if (!isNeuraxialBlockAnesthesia(caseData.anesthesia)) {
    return { selectedTypes: [], unmappedTokens: [] };
  }

  const selectedTypes = [];
  const unmappedTokens = [];

  for (const token of extractPrimaryBlockTokens(caseData)) {
    const type = mapNeuraxialBlockTokenToType(token);
    if (!type) {
      unmappedTokens.push(token);
      continue;
    }
    selectedTypes.push(type);
  }

  return {
    selectedTypes: uniqueValues(selectedTypes),
    unmappedTokens,
  };
}
