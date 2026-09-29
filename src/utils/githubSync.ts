import { GitHubSyncConfig, SyncStatus } from '../types/sync';
import { ChecklistTemplate } from '../types/checklist';
import { PatientEncounter } from '../types/patient';
import { templateToMarkdown, encounterToMarkdown, parseMarkdownToChecklist } from './markdownEngine';

export class GitHubSyncService {
  private config: GitHubSyncConfig;

  constructor(config: GitHubSyncConfig) {
    this.config = config;
  }

  private getHeaders(): HeadersInit {
    return {
      'Authorization': `Bearer ${this.config.personalAccessToken.trim()}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
  }

  private getBaseUrl(): string {
    return `https://api.github.com/repos/${this.config.repoOwner}/${this.config.repoName}/contents`;
  }

  /**
   * Test connection and verify repository access
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`https://api.github.com/repos/${this.config.repoOwner}/${this.config.repoName}`, {
        headers: this.getHeaders(),
      });
      if (res.status === 200) {
        const repo = await res.json();
        return { success: true, message: `Connected to ${repo.full_name} (${repo.private ? 'Private' : 'Public'})` };
      } else if (res.status === 404) {
        return { success: false, message: `Repository ${this.config.repoOwner}/${this.config.repoName} not found or token lacks access.` };
      } else if (res.status === 401) {
        return { success: false, message: 'Invalid Personal Access Token (401 Unauthorized).' };
      } else {
        return { success: false, message: `GitHub API error: ${res.status} ${res.statusText}` };
      }
    } catch (err: any) {
      return { success: false, message: `Network error: ${err.message}` };
    }
  }

  /**
   * Get file contents and SHA from GitHub
   */
  async getFile(path: string): Promise<{ content: string; sha: string } | null> {
    try {
      const url = `${this.getBaseUrl()}/${path}?ref=${this.config.branch || 'main'}`;
      const res = await fetch(url, { headers: this.getHeaders() });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

      const data = await res.json();
      const content = decodeURIComponent(escape(atob(data.content.replace(/\s/g, ''))));
      return { content, sha: data.sha };
    } catch {
      return null;
    }
  }

  /**
   * Push or update a file on GitHub with safe SHA conflict detection
   */
  async putFile(
    path: string,
    contentStr: string,
    commitMessage: string
  ): Promise<{ success: boolean; sha?: string; error?: string }> {
    try {
      const existing = await this.getFile(path);
      const url = `${this.getBaseUrl()}/${path}`;

      const encodedContent = btoa(unescape(encodeURIComponent(contentStr)));

      const body: any = {
        message: commitMessage,
        content: encodedContent,
        branch: this.config.branch || 'main',
      };

      if (existing) {
        body.sha = existing.sha;
      }

      const res = await fetch(url, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        return {
          success: false,
          error: errJson.message || `Failed to commit file (HTTP ${res.status})`,
        };
      }

      const data = await res.json();
      return { success: true, sha: data.content?.sha };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Sync patient encounters to GitHub as Markdown files
   * Keeps version history in Git and prevents accidental deletion!
   */
  async syncEncounter(encounter: PatientEncounter): Promise<{ success: boolean; error?: string }> {
    const safeId = encounter.id.replace(/[^a-zA-Z0-9_-]/g, '_');
    const mdPath = `encounters/${safeId}.md`;
    const mdContent = encounterToMarkdown(encounter);
    const commitMsg = `Sync encounter ${encounter.patientIdentifier} [${new Date().toISOString()}]`;

    const res = await this.putFile(mdPath, mdContent, commitMsg);
    if (!res.success) return res;

    // Also sync strokes if present
    if (encounter.inkStrokes && encounter.inkStrokes.length > 0) {
      const strokesPath = `encounters/${safeId}.strokes.json`;
      const strokesContent = JSON.stringify(encounter.inkStrokes, null, 2);
      await this.putFile(strokesPath, strokesContent, `Sync ink strokes for ${encounter.patientIdentifier}`);
    }

    return { success: true };
  }

  /**
   * Sync checklist templates to GitHub as Markdown files
   */
  async syncTemplate(template: ChecklistTemplate): Promise<{ success: boolean; error?: string }> {
    const safeId = template.id.replace(/[^a-zA-Z0-9_-]/g, '_');
    const mdPath = `templates/${safeId}.md`;
    const mdContent = templateToMarkdown(template);
    const commitMsg = `Sync template ${template.title} [${new Date().toISOString()}]`;

    return this.putFile(mdPath, mdContent, commitMsg);
  }
}
