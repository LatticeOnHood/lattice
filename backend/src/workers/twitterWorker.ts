import { processTwitterMention } from "../bots/twitterBot";

const X_ACCESS_TOKEN = process.env.X_ACCESS_TOKEN || "";
const X_BOT_ENABLED = process.env.X_BOT_ENABLED === "true";
const POLL_INTERVAL_MS = 30000; // 30 seconds

let lastSeenTweetId: string | null = null;
let isPolling = false;

/**
 * Fetches recent mentions for the bot user from Twitter API v2
 */
async function fetchBotMentions(sinceId?: string): Promise<any[]> {
  if (!X_ACCESS_TOKEN) return [];

  const url = new URL("https://api.twitter.com/2/users/me/mentions");
  url.searchParams.set("tweet.fields", "author_id,created_at,text");
  url.searchParams.set("max_results", "10");
  if (sinceId) {
    url.searchParams.set("since_id", sinceId);
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${X_ACCESS_TOKEN}`,
    },
  });

  if (!response.ok) {
    if (response.status === 429) {
      console.warn("[twitter-worker] Rate limited by Twitter API. Backing off.");
    }
    return [];
  }

  const json = await response.json();
  return json.data || [];
}

/**
 * Posts a reply tweet back to Twitter API v2
 */
async function postReplyTweet(replyText: string, inReplyToTweetId: string): Promise<boolean> {
  if (!X_ACCESS_TOKEN) return false;

  const response = await fetch("https://api.twitter.com/2/tweets", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${X_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      text: replyText,
      reply: {
        in_reply_to_tweet_id: inReplyToTweetId,
      },
    }),
  });

  return response.ok;
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
      const text = tweet.text;

      lastSeenTweetId = tweetId;

      if (!authorXUserId || !text) continue;

      const replyText = await processTwitterMention({
        tweetId,
        authorXUserId,
        text,
      });

      await postReplyTweet(replyText, tweetId);
      processedCount++;
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
  if (!X_BOT_ENABLED || !X_ACCESS_TOKEN) {
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
