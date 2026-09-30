/**
 * BibTeX and CSL Citation Engine adhering to Zettlr and Pandoc standards.
 * Supports parsing .bib databases, detecting @citekey and [@citekey] citations,
 * interactive citation popovers, and automatic bibliography rendering.
 */

export interface BibliographyEntry {
  id: string; // Citekey e.g. "smith2020"
  type: string; // article, book, incollection, etc.
  title: string;
  author?: string;
  year?: string;
  journal?: string;
  booktitle?: string;
  volume?: string;
  number?: string;
  pages?: string;
  publisher?: string;
  edition?: string;
  doi?: string;
  url?: string;
  abstract?: string;
  rawBibtex?: string;
}

export interface ParsedCitation {
  raw: string; // e.g. "[@smith2020, p. 45]" or "@smith2020"
  citekey: string; // "smith2020"
  prefix?: string; // e.g. "see"
  locator?: string; // e.g. "p. 45" or "pp. 12-15"
  isParenthetical: boolean; // true for [@...], false for in-text @...
  suppressAuthor?: boolean; // true for [-@...]
}

/**
 * Format raw author string into readable display: "Smith et al." or "Smith & Doe"
 */
export function formatAuthorShort(authorString?: string): string {
  if (!authorString) return 'Unknown';

  // Bibtex authors separated by " and "
  const authors = authorString.split(/\s+and\s+/i).map((a) => a.trim());
  if (authors.length === 0) return 'Unknown';

  const getLastName = (name: string) => {
    if (name.includes(',')) {
      return name.split(',')[0].trim();
    }
    const parts = name.split(/\s+/);
    return parts[parts.length - 1];
  };

  if (authors.length === 1) {
    return getLastName(authors[0]);
  } else if (authors.length === 2) {
    return `${getLastName(authors[0])} & ${getLastName(authors[1])}`;
  } else {
    return `${getLastName(authors[0])} et al.`;
  }
}

/**
 * Format full authors list according to APA / Chicago style: "Smith, J., & Doe, J."
 */
export function formatAuthorFull(authorString?: string): string {
  if (!authorString) return 'Unknown Author';

  const authors = authorString.split(/\s+and\s+/i).map((a) => a.trim());
  if (authors.length === 0) return 'Unknown Author';

  const formatSingle = (name: string) => {
    if (name.includes(',')) {
      const [last, first] = name.split(',').map((s) => s.trim());
      const initials = first
        ? first
            .split(/\s+/)
            .map((p) => (p[0] ? `${p[0].toUpperCase()}.` : ''))
            .join(' ')
        : '';
      return initials ? `${last}, ${initials}` : last;
    }
    const parts = name.split(/\s+/);
    const last = parts.pop() || '';
    const initials = parts.map((p) => `${p[0]?.toUpperCase()}.`).join(' ');
    return initials ? `${last}, ${initials}` : last;
  };

  if (authors.length === 1) {
    return formatSingle(authors[0]);
  } else if (authors.length === 2) {
    return `${formatSingle(authors[0])}, & ${formatSingle(authors[1])}`;
  } else {
    const formatted = authors.map(formatSingle);
    const last = formatted.pop();
    return `${formatted.join(', ')}, & ${last}`;
  }
}

/**
 * Format a single bibliography entry in Chicago / APA author-date format (Zettlr standard)
 */
export function formatBibliographyItem(entry: BibliographyEntry): string {
  const author = formatAuthorFull(entry.author);
  const year = entry.year ? `(${entry.year}).` : '(n.d.).';
  const title = entry.title ? `${entry.title.replace(/\.$/, '')}.` : 'Untitled.';
  
  let source = '';
  if (entry.journal) {
    source = entry.journal;
    if (entry.volume) {
      source += `, ${entry.volume}`;
      if (entry.number) source += `(${entry.number})`;
    }
    if (entry.pages) {
      source += `, ${entry.pages}`;
    }
    source += '.';
  } else if (entry.booktitle) {
    source = `In ${entry.booktitle}`;
    if (entry.pages) source += ` (pp. ${entry.pages})`;
    if (entry.publisher) source += `, ${entry.publisher}`;
    source += '.';
  } else if (entry.publisher) {
    source = `${entry.publisher}.`;
  }

  const doiOrUrl = entry.doi
    ? `https://doi.org/${entry.doi.replace(/^https?:\/\/doi\.org\//, '')}`
    : entry.url || '';

  return [author, year, title, source, doiOrUrl].filter(Boolean).join(' ');
}

/**
 * Format in-text citation representation: e.g. "(Smith et al., 2020, p. 45)"
 */
export function formatInTextCitation(
  citation: ParsedCitation,
  entry?: BibliographyEntry
): string {
  const author = entry ? formatAuthorShort(entry.author) : citation.citekey;
  const year = entry?.year || '';

  if (citation.suppressAuthor) {
    const parts = [year, citation.locator].filter(Boolean);
    return `(${parts.join(', ')})`;
  }

  if (citation.isParenthetical) {
    const mainPart = year ? `${author}, ${year}` : author;
    const withPrefix = citation.prefix ? `${citation.prefix} ${mainPart}` : mainPart;
    const withLocator = citation.locator ? `${withPrefix}, ${citation.locator}` : withPrefix;
    return `(${withLocator})`;
  } else {
    // Narrative citation: "Smith et al. (2020)" or "Smith et al. (2020, p. 45)"
    if (year) {
      const inner = citation.locator ? `${year}, ${citation.locator}` : year;
      return `${author} (${inner})`;
    }
    return `@${citation.citekey}`;
  }
}

/**
 * Extract all Zettlr / Pandoc citation expressions from markdown text.
 * Matches:
 * 1. `[@citekey]` or `[@citekey, p. 45]` or `[see @citekey, pp. 10-12; also @another]`
 * 2. `@citekey` in-text
 * 3. `[-@citekey]` suppress author
 */
export function extractCitationsFromMarkdown(markdown: string): ParsedCitation[] {
  const citations: ParsedCitation[] = [];

  // Match bracketed citations: [...@citekey...]
  const bracketRegex = /\[([^\]]*?@[a-zA-Z0-9_:\.\-]+[^\]]*?)\]/g;
  let bracketMatch: RegExpExecArray | null;

  while ((bracketMatch = bracketRegex.exec(markdown)) !== null) {
    const fullMatch = bracketMatch[0];
    const inner = bracketMatch[1];

    // Inner might contain multiple semicolon-separated items: "see @smith2020, p. 45; @doe2021"
    const subParts = inner.split(';');
    for (const part of subParts) {
      const citeMatch = part.match(/(.*?)(?:(-)?@([a-zA-Z0-9_:\.\-]+))(.*)/);
      if (citeMatch) {
        const prefix = citeMatch[1]?.trim() || undefined;
        const suppressAuthor = Boolean(citeMatch[2]);
        const citekey = citeMatch[3]?.trim();
        let locator = citeMatch[4]?.trim() || undefined;
        if (locator?.startsWith(',')) {
          locator = locator.substring(1).trim();
        }

        if (citekey) {
          citations.push({
            raw: fullMatch,
            citekey,
            prefix: prefix || undefined,
            locator: locator || undefined,
            isParenthetical: true,
            suppressAuthor,
          });
        }
      }
    }
  }

  // Match standalone in-text citations: @citekey (not followed by bracket or preceding bracket)
  const standaloneRegex = /(^|[^\[\w@])@([a-zA-Z0-9_:\.\-]+)/g;
  let standMatch: RegExpExecArray | null;

  while ((standMatch = standaloneRegex.exec(markdown)) !== null) {
    const citekey = standMatch[2];
    // Check that it wasn't already caught inside a bracket
    const prevCharIndex = standMatch.index + standMatch[1].length;
    const windowBefore = markdown.substring(Math.max(0, prevCharIndex - 20), prevCharIndex);
    if (!windowBefore.includes('[') || windowBefore.includes(']')) {
      citations.push({
        raw: `@${citekey}`,
        citekey,
        isParenthetical: false,
        suppressAuthor: false,
      });
    }
  }

  return citations;
}

/**
 * Robust parser for BibTeX strings (.bib files)
 */
export function parseBibtex(bibtexContent: string): BibliographyEntry[] {
  const entries: BibliographyEntry[] = [];
  if (!bibtexContent) return entries;

  // Regex to match BibTeX entries: @type{citekey, ...}
  const entryRegex = /@([a-zA-Z]+)\s*\{\s*([^,\s]+)\s*,([\s\S]*?)(?=\n@[a-zA-Z]+\s*\{|\n*$)/g;
  let match: RegExpExecArray | null;

  while ((match = entryRegex.exec(bibtexContent)) !== null) {
    const type = match[1].toLowerCase();
    const id = match[2].trim();
    const body = match[3];

    // Don't parse @comment, @preamble, or @string
    if (type === 'comment' || type === 'preamble' || type === 'string') {
      continue;
    }

    const fields: Record<string, string> = {};

    // Match fields: key = {value} or key = "value" or key = 123
    const fieldRegex = /([a-zA-Z0-9_\-]+)\s*=\s*(?:\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}|"([^"]*)"|(\d+))/g;
    let fieldMatch: RegExpExecArray | null;

    while ((fieldMatch = fieldRegex.exec(body)) !== null) {
      const key = fieldMatch[1].toLowerCase().trim();
      const val = (fieldMatch[2] !== undefined ? fieldMatch[2] : fieldMatch[3] !== undefined ? fieldMatch[3] : fieldMatch[4] || '')
        .replace(/[\r\n]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      fields[key] = val;
    }

    entries.push({
      id,
      type,
      title: fields.title || id,
      author: fields.author,
      year: fields.year || fields.date,
      journal: fields.journal || fields.journaltitle,
      booktitle: fields.booktitle,
      volume: fields.volume,
      number: fields.number || fields.issue,
      pages: fields.pages,
      publisher: fields.publisher || fields.institution || fields.organization,
      doi: fields.doi,
      url: fields.url,
      abstract: fields.abstract,
      rawBibtex: match[0],
    });
  }

  return entries;
}

/**
 * Serialize BibliographyEntry[] into standard BibTeX string
 */
export function exportToBibtex(entries: BibliographyEntry[]): string {
  return entries
    .map((e) => {
      const lines = [`@${e.type || 'article'}{${e.id},`];
      if (e.title) lines.push(`  title = {${e.title}},`);
      if (e.author) lines.push(`  author = {${e.author}},`);
      if (e.year) lines.push(`  year = {${e.year}},`);
      if (e.journal) lines.push(`  journal = {${e.journal}},`);
      if (e.booktitle) lines.push(`  booktitle = {${e.booktitle}},`);
      if (e.volume) lines.push(`  volume = {${e.volume}},`);
      if (e.number) lines.push(`  number = {${e.number}},`);
      if (e.pages) lines.push(`  pages = {${e.pages}},`);
      if (e.publisher) lines.push(`  publisher = {${e.publisher}},`);
      if (e.doi) lines.push(`  doi = {${e.doi}},`);
      if (e.url) lines.push(`  url = {${e.url}},`);
      if (e.abstract) lines.push(`  abstract = {${e.abstract}},`);
      lines.push('}');
      return lines.join('\n');
    })
    .join('\n\n');
}

/**
 * Built-in default medical and clinical references library
 * Provides essential clinical references out of the box
 */
export const DEFAULT_CLINICAL_BIBLIOGRAPHY: BibliographyEntry[] = [
  {
    id: 'who2020covid',
    type: 'article',
    title: 'Clinical management of COVID-19: living guidance',
    author: 'World Health Organization',
    year: '2020',
    journal: 'WHO Guidelines Approved by the Guidelines Review Committee',
    publisher: 'World Health Organization',
    url: 'https://www.who.int/publications/i/item/WHO-2019-nCoV-clinical-2020.5',
  },
  {
    id: 'singer2016sepsis',
    type: 'article',
    title: 'The Third International Consensus Definitions for Sepsis and Septic Shock (Sepsis-3)',
    author: 'Singer, Mervyn and Deutschman, Clifford S and Seymour, Christopher W and Shankar-Hari, Manu and Annane, Djillali and Bauer, Michael and Bellomo, Rinaldo and Bernard, Gordon R and Chiche, Jean-Daniel and Coopersmith, Craig M and others',
    year: '2016',
    journal: 'JAMA',
    volume: '315',
    number: '8',
    pages: '801-810',
    doi: '10.1001/jama.2016.0287',
  },
  {
    id: 'atls2018trauma',
    type: 'book',
    title: 'Advanced Trauma Life Support (ATLS) Student Course Manual',
    author: 'American College of Surgeons Committee on Trauma',
    year: '2018',
    publisher: 'American College of Surgeons',
    edition: '10th',
  },
  {
    id: 'acls2020aha',
    type: 'article',
    title: 'Part 3: Adult Basic and Advanced Life Support: 2020 American Heart Association Guidelines for Cardiopulmonary Resuscitation and Emergency Cardiovascular Care',
    author: 'Panchal, Ashish R and Bartos, Jason A and Cabañas, José G and Donnino, Michael W and Drennan, Ian R and Hirsch, Karen G and Kudenchuk, Peter J and Kurz, Michael C and Lavonas, Eric J and Morley, Peter T and others',
    year: '2020',
    journal: 'Circulation',
    volume: '142',
    number: '16_suppl_2',
    pages: 'S366-S468',
    doi: '10.1161/CIR.0000000000000916',
  },
];
