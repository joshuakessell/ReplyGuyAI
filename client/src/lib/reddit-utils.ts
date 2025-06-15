export function isValidRedditUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.includes('reddit.com');
  } catch {
    return false;
  }
}

export function extractRedditInfo(url: string) {
  const match = url.match(/reddit\.com\/r\/([^\/]+)\/comments\/([^\/]+)\/([^\/]*)\/?/);
  if (match) {
    return {
      subreddit: match[1],
      postId: match[2],
      slug: match[3],
      type: 'post' as const
    };
  }
  
  // Handle comment URLs
  const commentMatch = url.match(/reddit\.com\/r\/([^\/]+)\/comments\/([^\/]+)\/[^\/]*\/([^\/]+)/);
  if (commentMatch) {
    return {
      subreddit: commentMatch[1],
      postId: commentMatch[2],
      commentId: commentMatch[3],
      type: 'comment' as const
    };
  }
  
  return null;
}

export function normalizeRedditUrl(url: string): string {
  // Remove trailing slashes and query parameters
  return url.replace(/\/$/, '').split('?')[0];
}
