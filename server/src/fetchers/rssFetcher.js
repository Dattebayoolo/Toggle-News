import Parser from 'rss-parser';
import { toArticleRow } from '../pipeline/normalize.js';

const parser = new Parser({
  timeout: 15000,
  headers: {
    'User-Agent': 'ToggleNewsBot/1.0 (+https://example.com; contact: admin@example.com)',
    Accept: 'application/rss+xml, application/xml, text/xml, */*',
  },
  customFields: {
    item: [
      ['media:content', 'mediaContent', { keepArray: false }],
      ['media:thumbnail', 'mediaThumbnail', { keepArray: false }],
    ],
  },
});

export async function fetchRss(source) {
  const feed = await parser.parseURL(source.url);
  return feed.items
    .map((item) =>
      toArticleRow(source, {
        title: item.title,
        link: item.link || item.guid,
        creator: item.creator,
        contentSnippet: item.contentSnippet || item.content || item.summary,
        pubDate: item.isoDate || item.pubDate,
        enclosure: item.enclosure,
        'media:content': item.mediaContent?.$ ? { url: item.mediaContent.$.url } : null,
        'media:thumbnail': item.mediaThumbnail?.$ ? { url: item.mediaThumbnail.$.url } : null,
      })
    )
    .filter(Boolean);
}
