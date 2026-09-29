export interface GitHubReleaseAsset {
  id: number;
  name: string;
  size: number;
  downloadUrl: string;
  contentType: string;
}

export interface UpdateCheckResult {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseName: string;
  releaseNotes: string;
  releaseUrl: string;
  publishedAt: string;
  assets: GitHubReleaseAsset[];
}

import { APP_VERSION } from '../version';

export const CURRENT_APP_VERSION = APP_VERSION;

export async function checkForGitHubUpdate(
  repoOwner: string = 'dkchw',
  repoName: string = 'MedChecklist'
): Promise<UpdateCheckResult | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/releases/latest`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!res.ok) return null;

    const data = await res.json();
    const latestTag = (data.tag_name || '').replace(/^v/, '');
    const currentTag = CURRENT_APP_VERSION.replace(/^v/, '');

    const hasUpdate = compareVersions(latestTag, currentTag) > 0;

    const assets: GitHubReleaseAsset[] = (data.assets || []).map((a: any) => ({
      id: a.id,
      name: a.name,
      size: a.size,
      downloadUrl: a.browser_download_url,
      contentType: a.content_type,
    }));

    return {
      hasUpdate,
      currentVersion: CURRENT_APP_VERSION,
      latestVersion: latestTag,
      releaseName: data.name || data.tag_name,
      releaseNotes: data.body || '',
      releaseUrl: data.html_url,
      publishedAt: data.published_at,
      assets,
    };
  } catch (err) {
    console.error('Failed to check for GitHub updates:', err);
    return null;
  }
}

function compareVersions(v1: string, v2: string): number {
  const p1 = v1.split('.').map(n => parseInt(n, 10) || 0);
  const p2 = v2.split('.').map(n => parseInt(n, 10) || 0);
  const len = Math.max(p1.length, p2.length);

  for (let i = 0; i < len; i++) {
    const num1 = p1[i] || 0;
    const num2 = p2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}
