import { ChecklistItem, ChecklistSection, ChecklistTemplate, MedicalLink, MedicalImage } from '../types/checklist';
import { PatientEncounter, EncounterChecklistInstance } from '../types/patient';

/**
 * MedChecklist Markdown Engine
 *
 * Everything circles around Markdown (MD):
 * - Checklists use standard GFM task lists: `- [ ]` and `- [x]`
 * - Starred items: `*starred*` or `⭐`
 * - Item notes: indented blockquote `  > Note: ...` or `  > ...`
 * - Reference / Lab bounds: `[Normal: ...]` or `[Ref: ...]`
 * - Attached medical links: `[UpToDate: Title](url)`
 * - Attached images: `![Caption](url)`
 * - Sections: `## Section Name`
 * - Encounter metadata: `> Patient: ... | Age: ... | Sex: ...`
 * - Handwritten/Bedside notes: `### Bedside & Handwritten Notes (Editable MD)`
 */

export function templateToMarkdown(template: ChecklistTemplate): string {
  const lines: string[] = [];
  lines.push(`# ${template.title}`);
  if (template.description) {
    lines.push(`> ${template.description}`);
  }
  if (template.institution) {
    lines.push(`> Institution: ${template.institution}`);
  }
  if (template.tags && template.tags.length > 0) {
    lines.push(`> Tags: ${template.tags.map(t => t.startsWith('#') ? t : `#${t}`).join(' ')}`);
  }

  // Links
  if (template.links && template.links.length > 0) {
    lines.push(`> Reference Links: ${template.links.map(l => `[${l.title}](${l.url})`).join(' | ')}`);
  }
  lines.push('');

  for (const section of template.sections) {
    lines.push(`## ${section.title}`);
    if (section.description) {
      lines.push(`_${section.description}_`);
      lines.push('');
    }
    for (const item of section.items) {
      let line = item.checked ? '- [x] ' : '- [ ] ';
      line += item.text;
      if (item.labValue) {
        line += `: ${item.labValue}`;
      }
      if (item.referenceValue) {
        line += ` [Normal: ${item.referenceValue}]`;
      }
      if (item.starred) {
        line += ' *starred*';
      }
      lines.push(line);
      if (item.note) {
        lines.push(`  > Note: ${item.note}`);
      }
      if (item.links && item.links.length > 0) {
        for (const l of item.links) {
          lines.push(`  > Link: [${l.title}](${l.url})`);
        }
      }
      if (item.images && item.images.length > 0) {
        for (const img of item.images) {
          lines.push(`  > ![${img.caption || 'Attached Image'}](${img.url})`);
        }
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function encounterToMarkdown(encounter: PatientEncounter): string {
  const lines: string[] = [];
  lines.push(`# Encounter: ${encounter.patientIdentifier}`);

  const metaParts: string[] = [];
  if (encounter.age) metaParts.push(`Age: ${encounter.age}`);
  if (encounter.sex) metaParts.push(`Sex: ${encounter.sex}`);
  if (encounter.bedNumber) metaParts.push(`Bed/Room: ${encounter.bedNumber}`);
  if (encounter.status) metaParts.push(`Status: ${encounter.status}`);
  if (metaParts.length > 0) {
    lines.push(`> ${metaParts.join(' | ')}`);
  }

  if (encounter.chiefComplaint) {
    lines.push(`> Chief Complaint: ${encounter.chiefComplaint}`);
  }

  if (encounter.tags && encounter.tags.length > 0) {
    lines.push(`> Tags: ${encounter.tags.map(t => t.startsWith('#') ? t : `#${t}`).join(' ')}`);
  }

  if (encounter.links && encounter.links.length > 0) {
    lines.push(`> Clinical References: ${encounter.links.map(l => `[${l.title}](${l.url})`).join(' | ')}`);
  }
  lines.push('');

  for (const chk of encounter.checklists) {
    lines.push(`---`);
    lines.push(`### Checklist: ${chk.title}${chk.institution ? ` (${chk.institution})` : ''}`);
    lines.push('');

    for (const section of chk.sections) {
      lines.push(`#### ${section.title}`);
      for (const item of section.items) {
        let line = item.checked ? '- [x] ' : '- [ ] ';
        line += item.text;
        if (item.labValue) {
          line += `: ${item.labValue}`;
        }
        if (item.referenceValue) {
          line += ` [Normal: ${item.referenceValue}]`;
        }
        if (item.starred) {
          line += ' *starred*';
        }
        lines.push(line);
        if (item.note) {
          lines.push(`  > Note: ${item.note}`);
        }
        if (item.links && item.links.length > 0) {
          for (const l of item.links) {
            lines.push(`  > Link: [${l.title}](${l.url})`);
          }
        }
        if (item.images && item.images.length > 0) {
          for (const img of item.images) {
            lines.push(`  > ![${img.caption || 'Attached Image'}](${img.url})`);
          }
        }
      }
      lines.push('');
    }
  }

  // Attached images at encounter level
  if (encounter.images && encounter.images.length > 0) {
    lines.push(`---`);
    lines.push(`### Attached Clinical Images`);
    for (const img of encounter.images) {
      lines.push(`![${img.caption || 'Clinical Snapshot'}](${img.url})`);
    }
    lines.push('');
  }

  if (encounter.generalNotes) {
    lines.push(`---`);
    lines.push(`### Bedside & Handwritten Notes (Editable MD)`);
    lines.push(encounter.generalNotes);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Parse standard Markdown back into structured checklist sections and items
 */
export function parseMarkdownToChecklist(md: string): {
  title: string;
  description: string;
  institution?: string;
  tags: string[];
  links: MedicalLink[];
  sections: ChecklistSection[];
  generalNotes?: string;
} {
  const lines = md.split(/\r?\n/);
  let title = 'Imported Checklist';
  let description = '';
  let institution = '';
  const tags: string[] = [];
  const links: MedicalLink[] = [];
  const sections: ChecklistSection[] = [];
  let currentSection: ChecklistSection | null = null;
  let currentItem: ChecklistItem | null = null;
  let inNotesSection = false;
  const notesLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) continue;

    // Title # ...
    if (line.startsWith('# ') && !inNotesSection) {
      title = line.substring(2).trim();
      continue;
    }

    // Metadata lines > ...
    if (line.startsWith('> ') && !currentSection && !inNotesSection) {
      const meta = line.substring(2).trim();
      if (meta.toLowerCase().startsWith('tags:')) {
        const tagTokens = meta.substring(5).match(/#[\w-]+/g) || [];
        tags.push(...tagTokens);
      } else if (meta.toLowerCase().startsWith('institution:')) {
        institution = meta.substring(12).trim();
      } else if (meta.toLowerCase().includes('links:') || meta.toLowerCase().includes('references:')) {
        const linkMatches = meta.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g);
        for (const match of linkMatches) {
          links.push({
            id: 'link-' + Math.random().toString(36).substring(2, 7),
            title: match[1],
            url: match[2],
          });
        }
      } else if (!description) {
        description = meta;
      }
      continue;
    }

    // Notes section header
    if (line.toLowerCase().includes('bedside & handwritten notes') || line.toLowerCase().includes('clinical notes')) {
      inNotesSection = true;
      continue;
    }

    if (inNotesSection) {
      notesLines.push(rawLine);
      continue;
    }

    // Section header ## or ###
    if (line.startsWith('## ') || line.startsWith('### ') || line.startsWith('#### ')) {
      const sectionTitle = line.replace(/^#+\s*/, '').trim();
      currentSection = {
        id: 'sec-' + Math.random().toString(36).substring(2, 9),
        title: sectionTitle,
        items: [],
      };
      sections.push(currentSection);
      currentItem = null;
      continue;
    }

    // Checklist task item: - [ ] or - [x] or * [ ] or * [x]
    const taskMatch = line.match(/^[-*]\s*\[([ xX])\]\s*(.+)$/);
    if (taskMatch) {
      if (!currentSection) {
        currentSection = {
          id: 'sec-' + Math.random().toString(36).substring(2, 9),
          title: 'General',
          items: [],
        };
        sections.push(currentSection);
      }

      const isChecked = taskMatch[1].toLowerCase() === 'x';
      let content = taskMatch[2].trim();

      const isStarred = content.includes('*starred*') || content.includes('⭐') || content.includes('[!]');
      content = content.replace(/\*starred\*/g, '').replace(/⭐/g, '').replace(/\[!\]/g, '').trim();

      // Extract reference value [Normal: ...] or [Ref: ...]
      let referenceValue = '';
      const refMatch = content.match(/\[(?:Normal|Ref):\s*([^\]]+)\]/i);
      if (refMatch) {
        referenceValue = refMatch[1].trim();
        content = content.replace(refMatch[0], '').trim();
      }

      // Extract recorded lab value e.g. "Item: 142 ng/L"
      let text = content;
      let labValue = '';
      if (content.includes(':') && referenceValue) {
        const parts = content.split(':');
        text = parts[0].trim();
        labValue = parts.slice(1).join(':').trim();
      }

      currentItem = {
        id: 'item-' + Math.random().toString(36).substring(2, 9),
        text,
        checked: isChecked,
        starred: isStarred,
        referenceValue: referenceValue || undefined,
        labValue: labValue || undefined,
        images: [],
        links: [],
      };
      currentSection.items.push(currentItem);
      continue;
    }

    // Plain bullet point: - item or * item
    const bulletMatch = line.match(/^[-*]\s+(?!\[[ xX]\])(.+)$/);
    if (bulletMatch && !line.startsWith('>')) {
      if (!currentSection) {
        currentSection = {
          id: 'sec-' + Math.random().toString(36).substring(2, 9),
          title: 'General',
          items: [],
        };
        sections.push(currentSection);
      }

      currentItem = {
        id: 'item-' + Math.random().toString(36).substring(2, 9),
        text: bulletMatch[1].trim(),
        checked: false,
        images: [],
        links: [],
      };
      currentSection.items.push(currentItem);
      continue;
    }

    // Note, Link, or Image attached to previous item
    if ((line.startsWith('>') || rawLine.startsWith('  >')) && currentItem) {
      // Check for image ![caption](url)
      const imgMatch = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
      if (imgMatch) {
        if (!currentItem.images) currentItem.images = [];
        currentItem.images.push({
          id: 'img-' + Math.random().toString(36).substring(2, 7),
          caption: imgMatch[1] || 'Attached Image',
          url: imgMatch[2],
          timestamp: Date.now(),
        });
        continue;
      }

      // Check for link [title](url)
      const linkMatch = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch && line.toLowerCase().includes('link:')) {
        if (!currentItem.links) currentItem.links = [];
        currentItem.links.push({
          id: 'link-' + Math.random().toString(36).substring(2, 7),
          title: linkMatch[1],
          url: linkMatch[2],
        });
        continue;
      }

      const noteText = line.replace(/^>+\s*(?:Note:\s*)?/i, '').trim();
      currentItem.note = currentItem.note ? `${currentItem.note}\n${noteText}` : noteText;
      continue;
    }
  }

  // Fallback if no sections detected
  if (sections.length === 0) {
    sections.push({
      id: 'sec-default',
      title: 'Imported Items',
      items: [],
    });
  }

  return {
    title,
    description,
    institution: institution || undefined,
    tags,
    links,
    sections,
    generalNotes: notesLines.length > 0 ? notesLines.join('\n').trim() : undefined,
  };
}

/**
 * Builds the LLM Prompt with STRICT formatting instructions first,
 * followed by context/tasks.
 */
export function buildLlmPrompt(
  currentMarkdown: string,
  mode: 'differential' | 'soap' | 'checklist_expansion' | 'custom',
  customInstruction?: string
): string {
  const formatInstructions = `=== MEDCHECKLIST FORMATTING INSTRUCTIONS (REQUIRED) ===
You must format your checklist response in standard MedChecklist Markdown so the software can directly recognize, parse, and import it:

1. Use standard Markdown task list syntax:
   - \`- [ ] Item text\` for unchecked/pending/negative items
   - \`- [x] Item text\` for checked/positive/completed findings
2. For starred/critical items, add \`*starred*\` at the end of the line:
   - \`- [x] Severe crushing chest pain *starred*\`
3. For notes or clinical commentary on an item, indent a blockquote immediately under the item:
   - \`- [x] Retrosternal pain\`
     \`  > Note: Radiates to left jaw, lasted 45 minutes\`
4. For labs with reference values, use \`[Normal: <range>]\` and optional recorded value:
   - \`- [x] High-Sensitivity Troponin: 154 ng/L [Normal: < 14 ng/L] *starred*\`
5. For clinical reference links (UpToDate, PubMed, Guidelines):
   - \`  > Link: [UpToDate: Acute Coronary Syndrome](https://www.uptodate.com/...)\`
6. Group items under Markdown headers (\`## Section Name\`).
7. Place patient metadata at the top:
   \`> Patient: [ID] | Age: [Age] | Sex: [M/F] | Complaint: [Complaint]\`
   \`> Tags: #cardiology #urgent\`
8. Place any free-text clinical discussion, differential diagnoses, or bedside synthesis under:
   \`### Bedside & Handwritten Notes (Editable MD)\`
=== END FORMATTING INSTRUCTIONS ===`;

  let taskInstruction = '';
  if (mode === 'differential') {
    taskInstruction = `### CLINICAL TASK:
Review the following patient checklist and findings.
1. Identify high-priority and positive findings (\`- [x]\`).
2. Provide a prioritized differential diagnosis list under \`### Bedside & Handwritten Notes (Editable MD)\`.
3. Add any crucial diagnostic workups, missing red-flag symptoms, or lab tests as uncompleted items (\`- [ ]\`) in appropriate sections.
4. Include evidence-based reference links to UpToDate or PubMed where relevant.`;
  } else if (mode === 'soap') {
    taskInstruction = `### CLINICAL TASK:
Synthesize the following checklist items into a structured clinical SOAP note (Subjective, Objective, Assessment, Plan).
Keep items structured in MedChecklist markdown with \`- [x]\` and \`- [ ]\`, and place the narrative Assessment and Plan in the \`### Bedside & Handwritten Notes (Editable MD)\` section.`;
  } else if (mode === 'checklist_expansion') {
    taskInstruction = `### CLINICAL TASK:
Expand the provided checklist into a comprehensive, evidence-based clinical protocol/checklist. Add necessary screening questions, laboratory tests with reference values, procedural steps, and clinical reference links.`;
  } else {
    taskInstruction = `### CLINICAL TASK:
${customInstruction || 'Analyze the provided clinical checklist and update it with relevant findings, suggested additions, and clinical notes.'}`;
  }

  return `${formatInstructions}

${taskInstruction}

### CURRENT DATA (MARKDOWN):
\`\`\`markdown
${currentMarkdown}
\`\`\`
`;
}
