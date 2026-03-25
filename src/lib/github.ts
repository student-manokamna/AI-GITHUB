import { Octokit } from "@octokit/rest";

export function getOctokit(accessToken?: string) {
  return new Octokit({
    auth: accessToken || process.env.GITHUB_PERSONAL_ACCESS_TOKEN,
  });
}

export async function getUserRepos(accessToken: string) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.repos.listForAuthenticatedUser({
    sort: "updated",
    per_page: 30,
    visibility: "all",
  });
  return data;
}

export async function getRepoPulls(
  owner: string,
  repo: string,
  accessToken: string
) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.pulls.list({
    owner,
    repo,
    state: "open",
    per_page: 20,
  });
  return data;
}

export async function getRepoCommits(
  owner: string,
  repo: string,
  accessToken: string
) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.repos.listCommits({
    owner,
    repo,
    per_page: 10,
  });
  return data;
}

export async function getRepoFileTree(
  owner: string,
  repo: string,
  accessToken: string
) {
  const octokit = getOctokit(accessToken);
  const { data: repoData } = await octokit.repos.get({ owner, repo });
  const branch = repoData.default_branch;
  const { data } = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: branch,
    recursive: "1",
  });
  return data.tree.filter((item) => item.type === "blob").slice(0, 100);
}

export async function getFileContent(
  owner: string,
  repo: string,
  path: string,
  accessToken: string
): Promise<string | null> {
  const octokit = getOctokit(accessToken);
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path });
    if ("content" in data && data.encoding === "base64") {
      return Buffer.from(data.content, "base64").toString("utf-8");
    }
  } catch {
    return null;
  }
  return null;
}

export async function getPRFiles(
  owner: string,
  repo: string,
  pull_number: number,
  accessToken: string
) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.pulls.listFiles({
    owner,
    repo,
    pull_number,
    per_page: 30,
  });
  return data;
}

export async function postPRReviewComment(
  owner: string,
  repo: string,
  pull_number: number,
  body: string,
  accessToken: string
) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.pulls.createReview({
    owner,
    repo,
    pull_number,
    body,
    event: "COMMENT",
  });
  return data;
}

export async function getDefaultBranchFiles(
  owner: string,
  repo: string,
  accessToken: string
): Promise<Array<{ path: string; content: string }>> {
  const octokit = getOctokit(accessToken);
  const { data: repoData } = await octokit.repos.get({ owner, repo });
  const branch = repoData.default_branch;
  const { data: treeData } = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: branch,
    recursive: "1",
  });

  const codeExtensions = [
    ".ts", ".tsx", ".js", ".jsx", ".py", ".mjs", ".cjs",
  ];
  const files = treeData.tree
    .filter(
      (item) =>
        item.type === "blob" &&
        item.path &&
        codeExtensions.some((ext) => item.path!.endsWith(ext)) &&
        !item.path.includes("node_modules") &&
        !item.path.includes(".next")
    )
    .slice(0, 20);

  const results: Array<{ path: string; content: string }> = [];
  for (const file of files) {
    const content = await getFileContent(owner, repo, file.path!, accessToken);
    if (content) {
      results.push({ path: file.path!, content });
    }
  }
  return results;
}

export async function createFixPR(
  owner: string,
  repo: string,
  filePath: string,
  newContent: string,
  issueMessage: string,
  issueId: string,
  accessToken: string
): Promise<string> {
  const octokit = getOctokit(accessToken);
  const { data: repoData } = await octokit.repos.get({ owner, repo });
  const defaultBranch = repoData.default_branch;

  const { data: refData } = await octokit.git.getRef({
    owner,
    repo,
    ref: `heads/${defaultBranch}`,
  });
  const sha = refData.object.sha;

  const newBranch = `ai-fix-${issueId}-${Date.now()}`;
  await octokit.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${newBranch}`,
    sha,
  });

  let currentFileSha = "";
  try {
    const { data: currentFile } = await octokit.repos.getContent({
      owner,
      repo,
      path: filePath,
      ref: newBranch,
    });
    if (!Array.isArray(currentFile)) {
      currentFileSha = currentFile.sha;
    }
  } catch {}

  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: filePath,
    message: `Fix issue: ${issueMessage}`,
    content: Buffer.from(newContent).toString("base64"),
    branch: newBranch,
    sha: currentFileSha || undefined,
  });

  const { data: prData } = await octokit.pulls.create({
    owner,
    repo,
    title: `🤖 AI Fix: ${issueMessage.substring(0, 50)}${issueMessage.length > 50 ? '...' : ''}`,
    head: newBranch,
    base: defaultBranch,
    body: `This PR contains an AI-generated fix for the following issue:\n\n**File:** \`${filePath}\`\n**Issue:** ${issueMessage}\n\nReview the changes and merge if they look correct!\n\n*(Created by AI Code Review Agent)*`,
  });

  return prData.html_url;
}

export interface FileUpdate {
  filePath: string;
  newContent: string;
}

export async function createBulkFixPR(
  owner: string,
  repo: string,
  filesToUpdate: FileUpdate[],
  accessToken: string
): Promise<string> {
  const octokit = getOctokit(accessToken);
  const { data: repoData } = await octokit.repos.get({ owner, repo });
  const defaultBranch = repoData.default_branch;

  const { data: refData } = await octokit.git.getRef({
    owner,
    repo,
    ref: `heads/${defaultBranch}`,
  });
  const sha = refData.object.sha;

  const newBranch = `ai-bulk-fix-${Date.now()}`;
  await octokit.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${newBranch}`,
    sha,
  });

  for (const file of filesToUpdate) {
    let currentFileSha = "";
    try {
      const { data: currentFile } = await octokit.repos.getContent({
        owner,
        repo,
        path: file.filePath,
        ref: newBranch,
      });
      if (!Array.isArray(currentFile)) {
        currentFileSha = currentFile.sha;
      }
    } catch {}

    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: file.filePath,
      message: `🤖 Auto-fix issues in ${file.filePath}`,
      content: Buffer.from(file.newContent).toString("base64"),
      branch: newBranch,
      sha: currentFileSha || undefined,
    });
  }

  const { data: prData } = await octokit.pulls.create({
    owner,
    repo,
    title: `🚀 AI Bulk Fix: Resolved multiple issues`,
    head: newBranch,
    base: defaultBranch,
    body: `This PR contains AI-generated fixes for multiple files across the repository.\n\nFiles modified:\n${filesToUpdate.map((f) => `- \`${f.filePath}\``).join("\n")}\n\nReview the changes and merge if they look correct!\n\n*(Created by AI Code Review Agent)*`,
  });

  return prData.html_url;
}
