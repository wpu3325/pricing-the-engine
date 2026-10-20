// Model catalog lookups. Mirrors workbook '04 Guide Assumptions'!F26:Q55 and the
// VLOOKUPs in '01 Deal Setup' B8, G23:G32. Null parameter counts are never
// coerced to 0: they surface as NOT_VERIFIED so the model cannot be quoted.
import catalogJson from '../../data/model_catalog.json' with { type: 'json' };

export const NOT_VERIFIED = 'Not verified';

export function loadCatalog(raw = catalogJson) {
  return raw.models.map((m) => ({
    name: m.name,
    totalB: isNum(m.total_parameters_b) ? m.total_parameters_b : null,
    activeB: isNum(m.active_parameters_b) ? m.active_parameters_b : null,
    architecture: m.architecture,
    trainingStatus: m.training_status,
    servingStatus: m.serving_status,
    evidence: m.catalog_evidence,
    proxyClass: Number(m.pricing_proxy_class),
    gpuRequirement: m.gpu_requirement,
    parameterSource: m.parameter_source,
    catalogSource: m.catalog_source,
    note: m.qualification_note,
  }));
}

function isNum(v) {
  return typeof v === 'number' && Number.isFinite(v) && v > 0;
}

// Training statuses that block RL approval (workbook G30 list).
export const NON_TRAINABLE = ['Not listed', 'Research only', 'Legacy mention', 'Family - verify', 'Access required'];

export function findModel(catalog, name) {
  return catalog.find((m) => m.name === name) || null;
}

// Custom model: user-entered params. Always non-trainable until verified.
export function customModel(name, totalB, activeB, architecture = 'Unknown') {
  return {
    name: name || 'Custom model',
    totalB: isNum(totalB) ? totalB : null,
    activeB: isNum(activeB) ? activeB : null,
    architecture,
    trainingStatus: 'Not listed',
    servingStatus: 'Not listed',
    evidence: 'User-entered',
    proxyClass: 3,
    gpuRequirement: 'Validate',
    parameterSource: 'User-entered; not verified',
    catalogSource: '',
    note: 'Custom model: qualification required before quote',
    custom: true,
  };
}

// Display helper: "Not verified" instead of 0 / null.
export function displayParams(v) {
  return v == null ? NOT_VERIFIED : v;
}
