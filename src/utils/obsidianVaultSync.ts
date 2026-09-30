import { Checklist } from '../types/checklist';
import { ClinicalTemplate } from '../types/template';
import { KnowledgeNote, ChecklistRunSession } from '../types/knowledge';
import { FolderItem } from '../types/tab';
import { db } from '../db/db';
import { parseBibtex, exportToBibtex, DEFAULT_CLINICAL_BIBLIOGRAPHY, BibliographyEntry } from './bibtexParser';

export interface VaultFileMap {
  [filePath: string]: string;
}

export interface VaultSyncResult {
  filesWritten: number;
  vaultName: string;
  notesCount: number;
  protocolsCount: number;
  templatesCount: number;
  studyRunsCount: number;
  timestamp: number;
}

export interface VaultImportResult {
  notesImported: number;
  protocolsImported: number;
  filesProcessed: number;
}

/**
 * Format string as safe filename across Linux, macOS, and Windows
 */
export function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '_').trim() || 'Untitled';
}

/**
 * Format YAML frontmatter compliant with Obsidian, Zettlr, and markdown-oxide
 */
export function buildYamlFrontmatter(meta: Record<string, any>): string {
  const lines: string[] = ['---'];
  for (const [key, val] of Object.entries(meta)) {
    if (val === undefined || val === null) continue;
    if (Array.isArray(val)) {
      if (val.length === 0) continue;
      lines.push(`${key}:`);
      for (const item of val) {
        lines.push(`  - "${String(item).replace(/"/g, '\\"')}"`);
      }
    } else if (typeof val === 'string') {
      if (val.includes(':') || val.includes('#') || val.includes('\n') || val.includes('"')) {
        lines.push(`${key}: "${val.replace(/"/g, '\\"')}"`);
      } else {
        lines.push(`${key}: ${val}`);
      }
    } else {
      lines.push(`${key}: ${val}`);
    }
  }
  lines.push('---');
  return lines.join('\n');
}

/**
 * Parse YAML frontmatter from markdown file
 */
export function parseYamlFrontmatter(content: string): { meta: Record<string, any>; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return { meta: {}, body: content };
  }

  const rawYaml = match[1];
  const body = match[2];
  const meta: Record<string, any> = {};

  const lines = rawYaml.split(/\r?\n/);
  let currentKey = '';
  let currentList: string[] | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (trimmed.startsWith('- ') && currentKey) {
      if (!currentList) {
        currentList = [];
        meta[currentKey] = currentList;
      }
      const itemVal = trimmed.substring(2).replace(/^["']|["']$/g, '');
      currentList.push(itemVal);
      continue;
    }

    currentList = null;
    const colonIdx = line.indexOf(':');
    if (colonIdx !== -1) {
      const key = line.substring(0, colonIdx).trim();
      const valStr = line.substring(colonIdx + 1).trim().replace(/^["']|["']$/g, '');
      currentKey = key;
      if (valStr.length > 0) {
        if (valStr === 'true') meta[key] = true;
        else if (valStr === 'false') meta[key] = false;
        else if (!isNaN(Number(valStr)) && valStr !== '') meta[key] = Number(valStr);
        else meta[key] = valStr;
      }
    }
  }

  return { meta, body };
}

/**
 * Generate full Obsidian Vault structure compliant with Zettlr and markdown-oxide
 */
export function generateObsidianVaultFiles(data: {
  notes: KnowledgeNote[];
  checklists: Checklist[];
  templates: ClinicalTemplate[];
  studyRuns: ChecklistRunSession[];
  folders: FolderItem[];
  bibliography?: string;
}): VaultFileMap {
  const files: VaultFileMap = {};
  const dateStr = new Date().toISOString().split('T')[0];

  // 1. Obsidian App Settings (.obsidian/app.json)
  files['.obsidian/app.json'] = JSON.stringify(
    {
      useMarkdownLinks: false, // Enable standard [[wikilinks]]
      showLineNumber: true,
      livePreview: true,
      strictLineBreaks: false,
      newFileLocation: 'current',
    },
    null,
    2
  );

  // 2. Obsidian Appearance (.obsidian/appearance.json)
  files['.obsidian/appearance.json'] = JSON.stringify(
    {
      baseFontSize: 15,
      theme: 'obsidian',
    },
    null,
    2
  );

  // 3. markdown-oxide Language Server Protocol Config (.moxide.toml)
  files['.moxide.toml'] = `# markdown-oxide LSP configuration
[fuzzy_search]
case_sensitive = false

[semantic_tokens]
wikilinks = true
tags = true

[diagnostics]
dead_links = true
`;

  // 4. Clinical Protocols (Checklists as Markdown)
  for (const chk of data.checklists) {
    if (chk.isDeleted) continue;
    const filename = `Clinical Protocols/${sanitizeFilename(chk.title)}.md`;
    const frontmatter = buildYamlFrontmatter({
      title: chk.title,
      category: chk.category,
      institution: chk.institution,
      tags: chk.tags || ['protocol'],
      aliases: [chk.title, `${chk.title} Protocol`],
      type: 'protocol',
      version: '1.0.6',
      date: dateStr,
      updated: new Date(chk.updatedAt).toISOString(),
    });

    const lines: string[] = [frontmatter, '', `# ${chk.title}`];
    if (chk.description) {
      lines.push(`> ${chk.description}`);
    }
    if (chk.institution) {
      lines.push(`> **Institution:** ${chk.institution}`);
    }
    lines.push('');

    for (const section of chk.sections) {
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
          line += ` [Ref: ${item.referenceValue}]`;
        }
        if (item.starred) {
          line += ' ⭐ *Red Flag*';
        }
        lines.push(line);
        if (item.note) {
          lines.push(`  > Note: ${item.note}`);
        }
      }
      lines.push('');
    }

    files[filename] = lines.join('\n');
  }

  // 5. Clinical Template Bundles
  for (const tmpl of data.templates) {
    if (tmpl.isDeleted) continue;
    const filename = `Clinical Templates/${sanitizeFilename(tmpl.title)}.md`;
    const frontmatter = buildYamlFrontmatter({
      title: tmpl.title,
      category: tmpl.category,
      institution: tmpl.institution,
      tags: tmpl.tags || ['template', 'bundle'],
      type: 'clinical_template',
      date: dateStr,
      updated: new Date(tmpl.updatedAt).toISOString(),
    });

    const lines: string[] = [frontmatter, '', `# ${tmpl.title}`];
    if (tmpl.description) {
      lines.push(`> ${tmpl.description}`);
    }
    lines.push('');

    lines.push('### Bundled Clinical Protocols');
    if (tmpl.checklistIds && tmpl.checklistIds.length > 0) {
      for (const chkId of tmpl.checklistIds) {
        const linkedChk = data.checklists.find((c) => c.id === chkId);
        if (linkedChk) {
          lines.push(`- [[${linkedChk.title}]]`);
        }
      }
    } else {
      lines.push('_No modular checklists attached to this bundle._');
    }
    lines.push('');

    if (tmpl.protocolNotes) {
      lines.push('### Standard Clinical Guidelines & Ward Handoff');
      lines.push(tmpl.protocolNotes);
    }

    files[filename] = lines.join('\n');
  }

  // 6. Study Sessions & Lesson Runs
  for (const run of data.studyRuns) {
    if (run.isDeleted) continue;
    const dateFormatted = new Date(run.createdAt).toISOString().replace(/[:.]/g, '-');
    const filename = `Study Sessions/${sanitizeFilename(run.title || 'Run')}-${dateFormatted.substring(0, 10)}.md`;

    const frontmatter = buildYamlFrontmatter({
      title: run.title,
      checklistTitle: run.title,
      facility: run.facility,
      ward: run.ward,
      tags: ['study-run', 'clinical-lesson'],
      type: 'study_session',
      date: new Date(run.createdAt).toISOString().substring(0, 10),
      completedItems: run.checkedItemIds?.length || 0,
    });

    const lines: string[] = [
      frontmatter,
      '',
      `# Study Run: [[${run.title}]]`,
      `- **Session Date:** ${new Date(run.createdAt).toLocaleString()}`,
      run.facility ? `- **Facility:** ${run.facility}` : '',
      run.ward ? `- **Ward:** ${run.ward}` : '',
      '',
    ].filter(Boolean);

    if (run.sessionNotes) {
      lines.push('### Study & Clinical Notes');
      lines.push(run.sessionNotes);
      lines.push('');
    }

    files[filename] = lines.join('\n');
  }

  // 7. Knowledge & Lecture Notes
  for (const note of data.notes) {
    if (note.isDeleted) continue;

    // Determine subfolder path: Facility / Ward or Category
    let subfolder = 'Knowledge Notes';
    if (note.facility && note.ward) {
      subfolder = `Knowledge Notes/${sanitizeFilename(note.facility)}/${sanitizeFilename(note.ward)}`;
    } else if (note.facility) {
      subfolder = `Knowledge Notes/${sanitizeFilename(note.facility)}`;
    } else if (note.folderId) {
      const folderItem = data.folders.find((f) => f.id === note.folderId);
      if (folderItem) {
        subfolder = `Knowledge Notes/${sanitizeFilename(folderItem.name)}`;
      }
    }

    const filename = `${subfolder}/${sanitizeFilename(note.title)}.md`;
    const frontmatter = buildYamlFrontmatter({
      title: note.title,
      facility: note.facility,
      ward: note.ward,
      tags: note.tags || ['study'],
      aliases: [note.title],
      bibliography: 'references.bib',
      type: 'knowledge_note',
      date: new Date(note.createdAt).toISOString().substring(0, 10),
      updated: new Date(note.updatedAt).toISOString(),
    });

    // Ensure content has frontmatter
    let noteBody = note.content;
    if (noteBody.startsWith('---')) {
      const parsed = parseYamlFrontmatter(noteBody);
      noteBody = parsed.body;
    }

    files[filename] = `${frontmatter}\n\n${noteBody}`;
  }

  // 8. Zettlr & Pandoc Bibliography Library (references.bib)
  files['references.bib'] = data.bibliography || exportToBibtex(DEFAULT_CLINICAL_BIBLIOGRAPHY);

  // 9. Vault Map of Content / Index (README.md)
  const indexLines: string[] = [
    buildYamlFrontmatter({
      title: 'Clinical Knowledge Vault Index',
      tags: ['moc', 'index', 'medchecklist'],
      aliases: ['Home', 'Index', 'Vault MOC'],
      type: 'index',
      version: '1.0.6',
      date: dateStr,
    }),
    '',
    '# 🩺 Clinical Knowledge Vault (MedChecklist)',
    '> Synchronized medical knowledge vault structured for **Obsidian**, **Zettlr**, and **markdown-oxide**.',
    '',
    '## 📚 Table of Contents (Map of Content)',
    '',
    '### 📋 Clinical Protocols',
  ];

  for (const chk of data.checklists) {
    if (!chk.isDeleted) {
      indexLines.push(`- [[${chk.title}]] — _${chk.category || 'General'}_`);
    }
  }

  indexLines.push('', '### 📑 Clinical Template Bundles');
  for (const tmpl of data.templates) {
    if (!tmpl.isDeleted) {
      indexLines.push(`- [[${tmpl.title}]] — _${tmpl.category || 'General'}_`);
    }
  }

  indexLines.push('', '### 📝 Knowledge & Study Notes');
  for (const note of data.notes) {
    if (!note.isDeleted) {
      const loc = note.facility && note.ward ? ` (${note.facility} - ${note.ward})` : '';
      indexLines.push(`- [[${note.title}]]${loc}`);
    }
  }

  indexLines.push(
    '',
    '---',
    `_Generated by MedChecklist v1.0.6 at ${new Date().toISOString()}_`
  );

  files['README.md'] = indexLines.join('\n');

  return files;
}

/**
 * Check if the File System Access API is supported in current environment
 */
export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

/**
 * Open browser directory picker to select desktop vault folder
 */
export async function pickVaultDirectory(): Promise<FileSystemDirectoryHandle> {
  if (!isFileSystemAccessSupported()) {
    throw new Error('File System Access API is not supported in this browser.');
  }
  return await (window as any).showDirectoryPicker({
    mode: 'readwrite',
  });
}

/**
 * Recursively write all vault files directly into the desktop directory handle
 */
export async function writeVaultFilesToDirectory(
  rootDirHandle: FileSystemDirectoryHandle,
  vaultFiles: VaultFileMap
): Promise<number> {
  let count = 0;

  for (const [filePath, content] of Object.entries(vaultFiles)) {
    const parts = filePath.split('/');
    const fileName = parts.pop()!;
    let currentDir = rootDirHandle;

    for (const part of parts) {
      currentDir = await currentDir.getDirectoryHandle(part, { create: true });
    }

    const fileHandle = await currentDir.getFileHandle(fileName, { create: true });
    const writable = await (fileHandle as any).createWritable();
    await writable.write(content);
    await writable.close();
    count++;
  }

  return count;
}

/**
 * Recursively scan directory handle for .md files to import into Knowledge Hub
 */
export async function importVaultFilesFromDirectory(
  rootDirHandle: FileSystemDirectoryHandle
): Promise<VaultImportResult> {
  let notesImported = 0;
  let protocolsImported = 0;
  let filesProcessed = 0;

  async function scanDirectory(
    dirHandle: FileSystemDirectoryHandle,
    pathPrefix: string = ''
  ): Promise<void> {
    for await (const [name, handle] of (dirHandle as any).entries()) {
      if (name.startsWith('.') || name === 'node_modules') continue;

      if (handle.kind === 'directory') {
        await scanDirectory(handle, pathPrefix ? `${pathPrefix}/${name}` : name);
      } else if (handle.kind === 'file' && name.endsWith('.md')) {
        filesProcessed++;
        const file = await (handle as FileSystemFileHandle).getFile();
        const text = await file.text();
        const { meta, body } = parseYamlFrontmatter(text);

        const title = meta.title || name.replace(/\.md$/, '');
        const type = meta.type || 'knowledge_note';

        if (type === 'protocol') {
          // If it's a protocol, create or update checklist
          const existingChk = await db.checklists.where('title').equalsIgnoreCase(title).first();
          if (!existingChk) {
            await db.checklists.put({
              id: 'chk-imp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
              title,
              category: meta.category || 'Imported Protocol',
              institution: meta.institution,
              description: body.split('\n')[0]?.replace(/^#*\s*/, '') || '',
              tags: meta.tags || ['imported'],
              sections: [
                {
                  id: 'sec-' + Date.now(),
                  title: 'Imported Steps',
                  items: body
                    .split('\n')
                    .filter((l) => l.trim().startsWith('- [ ]') || l.trim().startsWith('- [x]'))
                    .map((l, idx) => ({
                      id: 'itm-' + idx,
                      text: l.replace(/^- \[[ xX]\]\s*/, ''),
                      checked: l.includes('- [x]') || l.includes('- [X]'),
                    })),
                },
              ],
              updatedAt: Date.now(),
            });
            protocolsImported++;
          }
        } else {
          // Knowledge Note
          const existingNote = await db.knowledgeNotes.where('title').equalsIgnoreCase(title).first();
          const noteObj: KnowledgeNote = {
            id: existingNote?.id || 'note-imp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
            title,
            content: text,
            facility: meta.facility,
            ward: meta.ward,
            tags: meta.tags || ['vault'],
            createdAt: existingNote?.createdAt || Date.now(),
            updatedAt: Date.now(),
          };

          await db.knowledgeNotes.put(noteObj);
          notesImported++;
        }
      } else if (handle.kind === 'file' && (name.endsWith('.bib') || name.endsWith('.bibtex'))) {
        filesProcessed++;
        const file = await (handle as FileSystemFileHandle).getFile();
        const text = await file.text();
        const parsed = parseBibtex(text);
        if (parsed.length > 0) {
          const current = (await db.settings.get('knowledge_bibliography'))?.value || [];
          const existingKeys = new Set(current.map((i: any) => i.id));
          const merged = [...current, ...parsed.filter((p) => !existingKeys.has(p.id))];
          await db.settings.put({ key: 'knowledge_bibliography', value: merged });
        }
      }
    }
  }

  await scanDirectory(rootDirHandle);

  return {
    notesImported,
    protocolsImported,
    filesProcessed,
  };
}

// Minimal in-memory CRC32 table for zero-dependency zip creation
function makeCrcTable(): Uint32Array {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
}

const CRC_TABLE = makeCrcTable();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Generate standard PKZip archive blob in-memory with zero external dependencies
 */
export function createVaultZipBlob(files: VaultFileMap): Blob {
  const encoder = new TextEncoder();
  const fileEntries: Array<{
    nameBytes: Uint8Array;
    dataBytes: Uint8Array;
    crc: number;
    offset: number;
  }> = [];

  const chunks: Uint8Array[] = [];
  let currentOffset = 0;

  // 1. Write Local File Records
  for (const [filePath, content] of Object.entries(files)) {
    const nameBytes = encoder.encode(filePath);
    const dataBytes = encoder.encode(content);
    const crc = crc32(dataBytes);

    const localHeader = new Uint8Array(30 + nameBytes.length);
    const dv = new DataView(localHeader.buffer);

    dv.setUint32(0, 0x04034b50, true); // signature
    dv.setUint16(4, 20, true); // version needed
    dv.setUint16(6, 0x0800, true); // UTF-8 filename flag
    dv.setUint16(8, 0, true); // uncompressed
    dv.setUint16(10, 0, true); // mod time
    dv.setUint16(12, 0, true); // mod date
    dv.setUint32(14, crc, true); // crc32
    dv.setUint32(18, dataBytes.length, true); // compressed size
    dv.setUint32(22, dataBytes.length, true); // uncompressed size
    dv.setUint16(26, nameBytes.length, true); // filename length
    dv.setUint16(28, 0, true); // extra length

    localHeader.set(nameBytes, 30);

    chunks.push(localHeader);
    chunks.push(dataBytes);

    fileEntries.push({
      nameBytes,
      dataBytes,
      crc,
      offset: currentOffset,
    });

    currentOffset += localHeader.length + dataBytes.length;
  }

  // 2. Write Central Directory Records
  const centralDirStartOffset = currentOffset;
  let centralDirSize = 0;

  for (const entry of fileEntries) {
    const cdHeader = new Uint8Array(46 + entry.nameBytes.length);
    const dv = new DataView(cdHeader.buffer);

    dv.setUint32(0, 0x02014b50, true); // signature
    dv.setUint16(4, 20, true); // version made by
    dv.setUint16(6, 20, true); // version needed
    dv.setUint16(8, 0x0800, true); // UTF-8 filename flag
    dv.setUint16(10, 0, true); // uncompressed
    dv.setUint16(12, 0, true); // mod time
    dv.setUint16(14, 0, true); // mod date
    dv.setUint32(16, entry.crc, true); // crc32
    dv.setUint32(20, entry.dataBytes.length, true); // compressed size
    dv.setUint32(24, entry.dataBytes.length, true); // uncompressed size
    dv.setUint16(28, entry.nameBytes.length, true); // filename length
    dv.setUint16(30, 0, true); // extra length
    dv.setUint16(32, 0, true); // comment length
    dv.setUint16(34, 0, true); // disk start
    dv.setUint16(36, 0, true); // internal file attributes
    dv.setUint32(38, 0, true); // external file attributes
    dv.setUint32(42, entry.offset, true); // relative offset of local header

    cdHeader.set(entry.nameBytes, 46);

    chunks.push(cdHeader);
    centralDirSize += cdHeader.length;
    currentOffset += cdHeader.length;
  }

  // 3. Write End of Central Directory Record
  const eocd = new Uint8Array(22);
  const dvEocd = new DataView(eocd.buffer);

  dvEocd.setUint32(0, 0x06054b50, true); // signature
  dvEocd.setUint16(4, 0, true); // disk number
  dvEocd.setUint16(6, 0, true); // central dir disk
  dvEocd.setUint16(8, fileEntries.length, true); // records on disk
  dvEocd.setUint16(10, fileEntries.length, true); // total records
  dvEocd.setUint32(12, centralDirSize, true); // size of central dir
  dvEocd.setUint32(16, centralDirStartOffset, true); // offset of central dir
  dvEocd.setUint16(20, 0, true); // comment length

  chunks.push(eocd);

  return new Blob(chunks as any, { type: 'application/zip' });
}

/**
 * Trigger immediate browser download of the full Obsidian vault zip archive
 */
export function downloadVaultZip(files: VaultFileMap, zipName: string = 'MedChecklist-Obsidian-Vault.zip'): void {
  const blob = createVaultZipBlob(files);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = zipName;
  a.click();
  URL.revokeObjectURL(url);
}
