"""Read bounded public HTTP responses; never infer search indexing from crawlability."""
from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import urllib.error
import urllib.request
from urllib.parse import urljoin


class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.title = []
        self.text = []
        self.meta = []
        self.links = []
        self.anchors = []
        self.lang = None
        self._title = False
        self._ignored = 0

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'html':
            self.lang = a.get('lang')
        if tag in {'script', 'style'}:
            self._ignored += 1
        if tag == 'title':
            self._title = True
        if tag == 'meta':
            self.meta.append(a)
        if tag == 'link':
            self.links.append(a)
        if tag == 'a' and a.get('href'):
            self.anchors.append(a['href'])

    def handle_endtag(self, tag):
        if tag in {'script', 'style'}:
            self._ignored = max(0, self._ignored - 1)
        if tag == 'title':
            self._title = False

    def handle_data(self, value):
        if self._ignored:
            return
        if self._title:
            self.title.append(value)
        elif value.strip():
            self.text.append(value.strip())

    def summary(self):
        return {
            'html_lang': self.lang,
            'title': ''.join(self.title),
            'descriptions': [a.get('content', '') for a in self.meta if a.get('name', '').lower() == 'description'],
            'robots_meta': [a.get('content', '') for a in self.meta if a.get('name', '').lower() in {'robots', 'googlebot', 'bingbot'}],
            'canonicals': [a.get('href') for a in self.links if 'canonical' in a.get('rel', '').split()],
            'hreflang': [a for a in self.links if a.get('hreflang')],
            'static_text_characters': len(' '.join(self.text)),
            'static_text_sample': ' '.join(self.text)[:900],
            'anchor_count': len(self.anchors),
            'anchors': self.anchors,
        }


def fetch(url, out, name):
    req = urllib.request.Request(url, headers={'User-Agent': 'CrimeMaps-site-audit/1.0'})
    try:
        response = urllib.request.urlopen(req, timeout=25)
    except urllib.error.HTTPError as exc:
        response = exc
    except Exception as exc:
        return {'url': url, 'error': type(exc).__name__ + ': ' + str(exc)}
    with response:
        body = response.read(1_000_001)
        if len(body) > 1_000_000:
            return {'url': url, 'status': response.status, 'error': 'HTTP response exceeds 1 MB bound'}
        result = {'url': url, 'final_url': response.url, 'status': response.status,
                  'bytes': len(body), 'sha256': hashlib.sha256(body).hexdigest(),
                  'headers': {k.lower(): v for k, v in response.headers.items()}}
        (out / name).write_bytes(body)
        if 'html' in result['headers'].get('content-type', ''):
            page = Page()
            page.feed(body.decode('utf-8', errors='replace'))
            result.update(page.summary())
        return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    mapping = json.loads(args.manifest.read_text())['repository_mapping']
    origin = 'https://ln6666.github.io/'
    root_robots = fetch(urljoin(origin, 'robots.txt'), args.out, 'origin-robots.txt')

    def city(row):
        base = urljoin(origin, row['repository'] + '/')
        targets = {'home': base, 'sitemap': base + 'sitemap.xml', 'project_robots': base + 'robots.txt'}
        targets.update({f'raw_{locale}': base + '?lang=' + locale for locale in ('en', 'zh')})
        if row['city'] == 'berlin':
            targets['map'] = base + 'map/'
        return {'city': row['city'], 'repository': row['repository'],
                'responses': {key: fetch(url, args.out, row['city'] + '-' + key + '.txt') for key, url in targets.items()}}

    with ThreadPoolExecutor(max_workers=4) as pool:
        rows = list(pool.map(city, mapping))
    result = {'observed_at_utc': datetime.now(timezone.utc).isoformat(),
              'scope': 'HTTP source HTML only, no JavaScript execution; crawlability is not proof of indexing',
              'robots_scope': 'Only origin /robots.txt controls this host; project-path robots.txt is not a robots control file',
              'origin_robots': root_robots, 'rows': rows}
    (args.out / 'public-http-audit.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    for row in rows:
        h = row['responses']['home']
        print(row['city'], h.get('status'), repr(h.get('title')), 'desc', len(h.get('descriptions', [])),
              'canonical', len(h.get('canonicals', [])), 'static', h.get('static_text_characters'),
              'sitemap', row['responses']['sitemap'].get('status'))


if __name__ == '__main__':
    main()
