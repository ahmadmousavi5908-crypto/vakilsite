// Preserve Next.js 16.4.6's built-in HTML-limited bot coverage and add crawlers
// that are explicitly allowed to read this site's public pages.
export const HTML_LIMITED_BOT_USER_AGENT =
  /Googlebot|[\w-]+-Google|Google-[\w-]+|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight|OAI-SearchBot|Claude-SearchBot|PerplexityBot|ChatGPT-User|Claude-User|Perplexity-User|(?:bot|crawler|spider|scraper)/i;
