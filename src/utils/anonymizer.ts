import { PatientEncounter, EncounterChecklistInstance } from '../types/patient';
import { ChecklistSection } from '../types/checklist';

export interface AnonymizeOptions {
  pseudonymizeId: boolean;
  maskBedAndWard: boolean;
  maskFacility: boolean;
  relativeDates: boolean;
  redactPhiInText: boolean;
  ageBracketOnly: boolean;
  removeUnredactedImages: boolean;
  removeRawInk: boolean;
}

export const DEFAULT_ANONYMIZE_OPTIONS: AnonymizeOptions = {
  pseudonymizeId: true,
  maskBedAndWard: true,
  maskFacility: true,
  relativeDates: true,
  redactPhiInText: true,
  ageBracketOnly: true,
  removeUnredactedImages: true,
  removeRawInk: true,
};

/**
 * Generate a consistent, deterministic 4-character hex hash from a string.
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).toUpperCase().padStart(4, '0').slice(-4);
}

/**
 * Generate a pseudonymous patient ID e.g. "Pt-ANON-7F2A"
 */
export function generatePseudonym(originalId: string): string {
  const hash = hashString(originalId || 'patient');
  return `Pt-ANON-${hash}`;
}

/**
 * Convert specific age into a generalized 10-year bracket (e.g. 67 -> "60-69", 92 -> "90+")
 * as per HIPAA Safe Harbor guidance.
 */
export function maskAgeBracket(ageStr?: string): string | undefined {
  if (!ageStr) return undefined;
  const num = parseInt(ageStr.trim(), 10);
  if (isNaN(num)) return ageStr;
  if (num >= 90) return '90+';
  if (num < 10) return '<10';
  const lower = Math.floor(num / 10) * 10;
  const upper = lower + 9;
  return `${lower}-${upper} yo`;
}

/**
 * Redact potential Protected Health Information (PHI) from free-text strings
 * including telephone numbers, email addresses, MRNs, dates, and clinician names.
 */
export function redactPhiFromText(text: string): string {
  if (!text) return '';

  let sanitized = text;

  // 1. Phone numbers (various formats)
  sanitized = sanitized.replace(
    /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    '[REDACTED_PHONE]'
  );

  // 2. Email addresses
  sanitized = sanitized.replace(
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    '[REDACTED_EMAIL]'
  );

  // 3. Medical Record Numbers (MRN), Account numbers, SSN-like patterns
  sanitized = sanitized.replace(
    /\b(?:MRN|MR#|FIN|SSN|NHS|ID|Record|Account)[\s#:]*([A-Za-z0-9-]{4,15})\b/gi,
    'MRN:[REDACTED_ID]'
  );
  sanitized = sanitized.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED_SSN]');

  // 4. Specific full calendar dates (e.g., 12/04/2024, 2024-11-05, November 5, 2024)
  sanitized = sanitized.replace(
    /\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})\b/g,
    '[REDACTED_DATE]'
  );
  sanitized = sanitized.replace(
    /\b(?:Jan|January|Feb|February|Mar|March|Apr|April|May|Jun|June|Jul|July|Aug|August|Sep|September|Oct|October|Nov|November|Dec|December)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}\b/gi,
    '[REDACTED_DATE]'
  );

  // 5. Clinician names following title (Dr. John Smith, MD Jane Doe)
  sanitized = sanitized.replace(
    /\b(?:Dr\.|Doctor|Prof\.|RN|MD|DO|NP|PA-C)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g,
    'Dr. [REDACTED_CLINICIAN]'
  );

  return sanitized;
}

/**
 * Anonymize an entire PatientEncounter data object based on provided options.
 */
export function anonymizePatientEncounter(
  enc: PatientEncounter,
  options: Partial<AnonymizeOptions> = {}
): PatientEncounter {
  const opts: AnonymizeOptions = { ...DEFAULT_ANONYMIZE_OPTIONS, ...options };

  // Clone encounter deeply
  const clone = JSON.parse(JSON.stringify(enc)) as PatientEncounter;

  // 1. Patient Identifier
  if (opts.pseudonymizeId) {
    clone.patientIdentifier = generatePseudonym(enc.patientIdentifier);
  }

  // 2. Bed and Ward
  if (opts.maskBedAndWard) {
    clone.bedNumber = undefined;
    clone.group = enc.group ? 'Clinical Care Unit' : undefined;
  }

  // 3. Hospital / Facility
  if (opts.maskFacility) {
    clone.facility = enc.facility ? 'Medical Center [De-identified]' : undefined;
  }

  // 4. Demographics
  if (opts.ageBracketOnly && clone.age) {
    clone.age = maskAgeBracket(clone.age);
  }

  // 5. Timestamps and Relative Timeline
  if (opts.relativeDates) {
    // Zero-out exact timestamps
    clone.createdAt = 0;
    clone.updatedAt = 0;
    clone.archivedAt = undefined;
  }

  // 6. Free-text PHI Redaction
  if (opts.redactPhiInText) {
    if (clone.chiefComplaint) {
      clone.chiefComplaint = redactPhiFromText(clone.chiefComplaint);
    }
    if (clone.generalNotes) {
      clone.generalNotes = redactPhiFromText(clone.generalNotes);
    }
  }

  // 7. Checklists
  clone.checklists = (clone.checklists || []).map((chk: EncounterChecklistInstance) => {
    return {
      ...chk,
      institution: opts.maskFacility ? undefined : chk.institution,
      sections: (chk.sections || []).map((sec: ChecklistSection) => ({
        ...sec,
        items: (sec.items || []).map((itm) => {
          let itemNote = itm.note;
          if (opts.redactPhiInText && itemNote) {
            itemNote = redactPhiFromText(itemNote);
          }
          // Filter images attached to item
          let itemImages = itm.images || [];
          if (opts.removeUnredactedImages) {
            itemImages = itemImages.filter(
              (img) => (img.tags || []).includes('anonymized') || (img.tags || []).includes('redacted')
            );
          }
          return {
            ...itm,
            note: itemNote,
            images: itemImages,
          };
        }),
      })),
    };
  });

  // 8. Encounter level images
  if (opts.removeUnredactedImages && clone.images) {
    clone.images = clone.images.filter(
      (img) => (img.tags || []).includes('anonymized') || (img.tags || []).includes('redacted')
    );
  }

  // 9. Raw Ink Strokes
  if (opts.removeRawInk) {
    clone.inkStrokes = [];
    clone.bedsideInkStrokes = [];
  }

  return clone;
}

/**
 * Generate an anonymized GitHub Flavored Markdown case export
 */
export function generateAnonymizedMarkdown(
  enc: PatientEncounter,
  options: Partial<AnonymizeOptions> = {}
): string {
  const anon = anonymizePatientEncounter(enc, options);
  const opts = { ...DEFAULT_ANONYMIZE_OPTIONS, ...options };

  const lines: string[] = [];

  lines.push(`# Clinical Case Summary (De-identified)`);
  lines.push(`> **Privacy Notice**: De-identified per HIPAA Safe Harbor standard for clinical sharing & medical education.`);
  lines.push('');

  lines.push(`## Patient Demographics`);
  lines.push(`- **Case Identifier**: \`${anon.patientIdentifier}\``);
  if (anon.age) lines.push(`- **Age Bracket**: ${anon.age}`);
  if (anon.sex) lines.push(`- **Sex**: ${anon.sex}`);
  if (anon.group) lines.push(`- **Setting**: ${anon.group}`);
  if (anon.facility) lines.push(`- **Facility**: ${anon.facility}`);
  lines.push('');

  if (anon.chiefComplaint) {
    lines.push(`## Chief Complaint & Clinical Presentation`);
    lines.push(anon.chiefComplaint);
    lines.push('');
  }

  if (anon.checklists && anon.checklists.length > 0) {
    lines.push(`## Protocols & Checklist Findings`);
    for (const chk of anon.checklists) {
      lines.push(`### ${chk.title}`);
      for (const sec of chk.sections) {
        lines.push(`#### ${sec.title}`);
        for (const item of sec.items) {
          const checkMark = item.checked ? '[x]' : '[ ]';
          const star = item.starred ? ' ⭐ [CRITICAL]' : '';
          let line = `- ${checkMark} **${item.text}**${star}`;
          if (item.labValue) {
            line += ` (Measured: \`${item.labValue}\``;
            if (item.referenceValue) line += ` | Ref: ${item.referenceValue}`;
            line += ')';
          }
          lines.push(line);
          if (item.note) {
            lines.push(`  - *Note*: ${item.note}`);
          }
        }
        lines.push('');
      }
    }
  }

  if (anon.generalNotes) {
    lines.push(`## Bedside Clinical Notes & Synthesis`);
    lines.push(anon.generalNotes);
    lines.push('');
  }

  if (anon.images && anon.images.length > 0) {
    lines.push(`## De-identified Clinical Imagery`);
    for (const img of anon.images) {
      const caption = img.caption || 'Verified De-identified Clinical Image';
      lines.push(`- **${caption}** (Tags: ${img.tags?.join(', ') || 'anonymized'})`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push(`*Generated by MedChecklist • De-identification Engine v1.0*`);

  return lines.join('\n');
}
