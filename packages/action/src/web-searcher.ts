import axios from 'axios';
import * as cheerio from 'cheerio';

export class WebSearcher {
  async search(query: string): Promise<string> {
    try {
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
        timeout: 10000,
      });
      const $ = cheerio.load(response.data);
      const results: string[] = [];
      $('.result__body')
        .slice(0, 3)
        .each((i, elem) => {
          const title = $(elem).find('.result__title').text().trim();
          const snippet = $(elem).find('.result__snippet').text().trim();
          if (title && snippet) {
            results.push(`${i + 1}. ${title}\n   ${snippet}`);
          }
        });
      return results.length > 0
        ? `Search results for "${query}":\n\n${results.join('\n\n')}`
        : 'No results found.';
    } catch (error: unknown) {
      console.error('[WebSearcher] Error:', error);
      return 'Error performing web search.';
    }
  }
}
