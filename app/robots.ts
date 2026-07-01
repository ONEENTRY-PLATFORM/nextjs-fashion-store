import type { MetadataRoute } from 'next';
import { SITE_URL } from '../src/app/data/seoData';

const PRIVATE_PATHS = ['/cart', '/favorites', '/account', '/checkout/', '/download/', '/api/'];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // General rule for all crawlers
      {
        userAgent: '*',
        allow: '/',
        disallow: PRIVATE_PATHS,
      },
      // AI assistants — explicitly allow product discovery for recommendations
      {
        userAgent: [
          'GPTBot',          // OpenAI
          'ChatGPT-User',    // OpenAI browsing
          'OAI-SearchBot',   // OpenAI search
          'ClaudeBot',       // Anthropic
          'anthropic-ai',    // Anthropic
          'PerplexityBot',   // Perplexity AI
          'Amazonbot',       // Amazon Alexa / Rufus
          'meta-externalagent', // Meta AI
          'Applebot-Extended',  // Apple AI
          'cohere-ai',       // Cohere
          'Bytespider',      // TikTok / ByteDance
          'YouBot',          // You.com
        ],
        allow: ['/', '/product/', '/women/', '/men/', '/sale', '/new', '/info/', '/stores', '/llms.txt'],
        disallow: PRIVATE_PATHS,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
