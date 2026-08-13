import { processTwitterMention } from "../bots/twitterBot";
import { refreshXAccessToken, getAuthenticatedXUser } from "../services/auth/oauth";
import { splitTweetContent } from "../templates/cardRenderer";

let currentAccessToken = process.env.X_ACCESS_TOKEN || "";
let currentRefreshToken = process.env.X_REFRESH_TOKEN || "";
const X_CLIENT_ID = process.env.X_CLIENT_ID || "";
const X_CLIENT_SECRET = process.env.X_CLIENT_SECRET || "";
const X_BOT_ENABLED = process.env.X_BOT_ENABLED === "true";
export const POLL_INTERVAL_MS = 60000; // 60 seconds (strictly fits Twitter API 15 req / 15 min limit)

let lastSeenTweetId: string | null = null;
let cachedBotUserId: string | null = null;
let isPolling = false;

async function getBotUserId(): Promise<string | null> {
  if (cachedBotUserId) return cachedBotUserId;
  if (!currentAccessToken) return null;
  try {
    const user = await getAuthenticatedXUser(currentAccessToken);
    cachedBotUserId = user.id;
    console.log(`[twitter-worker] Resolved bot X User ID: ${user.id} (@${user.username})`);
    return cachedBotUserId;
  } catch (err: any) {
    console.error("[twitter-worker] Failed to resolve bot X User ID:", err.message);
    return null;
  }
}

async function tryRefreshToken(): Promise<boolean> {
  if (!currentRefreshToken || !X_CLIENT_ID || !X_CLIENT_SECRET) {
    return false;
  }
  try {
    const refreshed = await refreshXAccessToken({
      refreshToken: currentRefreshToken,
      clientId: X_CLIENT_ID,
      clientSecret: X_CLIENT_SECRET,
    });
    currentAccessToken = refreshed.access_token;
    if (refreshed.refresh_token) {
      currentRefreshToken = refreshed.refresh_token;
    }
    // Invalidate cached bot user ID so it re-verifies on next call
    cachedBotUserId = null;
    console.log("[twitter-worker] Successfully refreshed X OAuth access token.");
    return true;
  } catch (err: any) {
    console.error("[twitter-worker] Failed to refresh X OAuth token:", err.message);
    return false;
  }
}

/**
 * Fetches recent mentions for the bot user from Twitter API v2
 */
async function fetchBotMentions(sinceId?: string, isRetry = false): Promise<any[]> {
  if (!currentAccessToken) return [];

  const botUserId = await getBotUserId();
  if (!botUserId) return [];

  const url = new URL(`https://api.twitter.com/2/users/${botUserId}/mentions`);
  url.searchParams.set("tweet.fields", "author_id,created_at,text");
  url.searchParams.set("expansions", "author_id");
  url.searchParams.set("user.fields", "username");
  url.searchParams.set("max_results", "10");
  if (sinceId) {
    url.searchParams.set("since_id", sinceId);
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${currentAccessToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401 && !isRetry) {
      console.warn("[twitter-worker] Access token expired (401). Attempting token refresh...");
      const refreshed = await tryRefreshToken();
      if (refreshed) {
        return fetchBotMentions(sinceId, true);
      }
    } else if (response.status === 429) {
      console.warn("[twitter-worker] Rate limited by Twitter API (429). Backing off for this cycle.");
    } else {
      const text = await response.text().catch(() => "");
      console.warn(`[twitter-worker] Mentions fetch error (${response.status}): ${text}`);
    }
    return [];
  }

  const json = await response.json();
  const tweets = json.data || [];
  const users = json.includes?.users || [];
  const usersMap = new Map<string, string>();
  for (const u of users) {
    if (u.id && u.username) {
      usersMap.set(u.id, u.username);
    }
  }

  return tweets.map((t: any) => ({
    id: t.id,
    author_id: t.author_id,
    author_username: usersMap.get(t.author_id) || undefined,
    text: t.text,
  }));
}

/**
 * Posts a reply tweet back to Twitter API v2, returning created tweet ID
 */
async function postReplyTweet(replyText: string, inReplyToTweetId: string): Promise<string | null> {
  if (!currentAccessToken) return null;

  const response = await fetch("https://api.twitter.com/2/tweets", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${currentAccessToken}`,
    },
    body: JSON.stringify({
      text: replyText,
      reply: {
        in_reply_to_tweet_id: inReplyToTweetId,
      },
    }),
  });

  if (response.ok) {
    const json = await response.json();
    return json.data?.id || null;
  }

  const errorText = await response.text().catch(() => "");
  console.warn(`[twitter-worker] Reply tweet returned ${response.status}: ${errorText}`);

  // Fallback: If HTTP 403 (conversation reply restricted by thread author), post as a Quote Tweet!
  if (response.status === 403) {
    console.log("[twitter-worker] Attempting quote tweet fallback for restricted conversation...");
    const quoteResponse = await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${currentAccessToken}`,
      },
      body: JSON.stringify({
        text: replyText,
        quote_tweet_id: inReplyToTweetId,
      }),
    });

    if (quoteResponse.ok) {
      const json = await quoteResponse.json();
      console.log(`[twitter-worker] Successfully posted quote tweet fallback (id: ${json.data?.id})`);
      return json.data?.id || null;
    } else {
      const quoteErr = await quoteResponse.text().catch(() => "");
      console.error(`[twitter-worker] Quote tweet fallback failed (${quoteResponse.status}): ${quoteErr}`);
    }
  }

  return null;
}

/**
 * Single polling cycle
 */
export async function pollTwitterMentionsOnce(): Promise<number> {
  try {
    const mentions = await fetchBotMentions(lastSeenTweetId || undefined);
    if (mentions.length === 0) return 0;

    let processedCount = 0;

    // Process mentions from oldest to newest
    const sortedMentions = mentions.reverse();

    for (const tweet of sortedMentions) {
      const tweetId = tweet.id;
      const authorXUserId = tweet.author_id;
      const authorUsername = tweet.author_username;
      const text = tweet.text;

      lastSeenTweetId = tweetId;

      if (!authorXUserId || !text) continue;

      const replyText = await processTwitterMention({
        tweetId,
        authorXUserId,
        authorUsername,
        text,
      });

      if (replyText) {
        const chunks = splitTweetContent(replyText);
        let parentTweetId = tweetId;
        for (const chunk of chunks) {
          const postedId = await postReplyTweet(chunk, parentTweetId);
          if (postedId) {
            parentTweetId = postedId;
          } else {
            break;
          }
        }
        processedCount++;
      }
    }

    return processedCount;
  } catch (err) {
    console.error("[twitter-worker] Error in polling cycle:", err);
    return 0;
  }
}

/**
 * Starts continuous background polling worker
 */
export function startTwitterWorker() {
  if (!X_BOT_ENABLED || !currentAccessToken) {
    console.log("[twitter-worker] X Bot Worker disabled or missing X_ACCESS_TOKEN.");
    return;
  }

  if (isPolling) return;
  isPolling = true;

  console.log(`[twitter-worker] Twitter Mentions Worker started (polling every ${POLL_INTERVAL_MS / 1000}s)...`);

  setInterval(async () => {
    await pollTwitterMentionsOnce();
  }, POLL_INTERVAL_MS);
}
