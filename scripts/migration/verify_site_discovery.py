"""Verify the generated final-site discovery contract and actual file capacity."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import re
from urllib.parse import urlsplit
import xml.etree.ElementTree as ET

from audit_public_sites import Page
from site_discovery import HREFLANG, HTML_LANG, LOCALES, ORIGIN, measure


def verify(site: Path, city: str) -> dict:
    base = '/crimemaps-' + city.capitalize() + '/'
    entries = [''] + (['map/'] if city == 'berlin' else [])
    expected_urls = set()
    pages = []
    for entry in entries:
        root_path = site / entry / 'index.html'
        html = root_path.read_text()
        root = Page()
        root.feed(html)
        summary = root.summary()
        canonical = ORIGIN + base + entry
        if summary['canonicals'] != [canonical] or len(summary['descriptions']) != 1 or not summary['descriptions'][0]:
            raise ValueError('Missing or incorrect entrance discovery metadata')
        if any('noindex' in value.lower() or 'none' in value.lower() for value in summary['robots_meta']):
            raise ValueError('Entrance is not indexable')
        if summary['static_text_characters'] < 200:
            raise ValueError('Entrance has no static introductory content')
        expected_urls.add(canonical)
        alternates = {HREFLANG[locale]: ORIGIN + base + entry + 'about/' + locale + '/' for locale in LOCALES}
        alternates['x-default'] = alternates['de']
        for locale in LOCALES:
            relative = entry + 'about/' + locale + '/index.html'
            text = (site / relative).read_text()
            page = Page()
            page.feed(text)
            details = page.summary()
            location = alternates[HREFLANG[locale]]
            actual_alternates = {a['hreflang']: a['href'] for a in details['hreflang']}
            if actual_alternates != alternates or len(details['hreflang']) != 4:
                raise ValueError('Alternate language links are incomplete or nonreciprocal')
            if details['html_lang'] != HTML_LANG[locale] or details['canonicals'] != [location]:
                raise ValueError('Wrong static language or canonical URL')
            if len(details['descriptions']) != 1 or details['static_text_characters'] < 350:
                raise ValueError('Missing localized page content')
            if any('noindex' in value.lower() or 'none' in value.lower() for value in details['robots_meta']):
                raise ValueError('Information page is not indexable')
            if len({a for a in details['anchors'] if '?lang=' + locale in a}) < 14:
                raise ValueError('City navigation is not crawlable')
            if re.search(r'<script\b', text, re.I):
                raise ValueError('Static information pages should not require JavaScript')
            expected_urls.add(location)
            pages.append({'file': relative, 'locale': locale, 'canonical': location,
                          'static_text_characters': details['static_text_characters']})
    root = ET.parse(site / 'sitemap.xml').getroot()
    actual = [element.text for element in root.findall('{http://www.sitemaps.org/schemas/sitemap/0.9}url/{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
    if len(actual) != len(set(actual)) or set(actual) != expected_urls:
        raise ValueError('Sitemap URL set differs from the generated pages')
    for location in actual:
        parsed = urlsplit(location)
        if parsed.scheme != 'https' or parsed.netloc != 'ln6666.github.io' or parsed.query or parsed.fragment:
            raise ValueError('Sitemap contains a noncanonical URL')
        if not parsed.path.startswith(base):
            raise ValueError('Project sitemap includes a URL outside its scope')
        path = site / parsed.path.removeprefix(base) / 'index.html'
        if not path.is_file():
            raise ValueError('Sitemap points to missing static content')
    capacity = measure(site)
    if not capacity['within_growth_budget'] or capacity['over_project_file_budget']:
        raise ValueError('Final published directory exceeds a project capacity budget')
    return {'city': city, 'status': 'passed', 'localized_pages': pages,
            'sitemap_url_count': len(actual), 'capacity': capacity,
            'search_indexing_status': 'Not measured. Search Console or Bing Webmaster evidence is required to establish indexing.'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--site', type=Path, required=True)
    parser.add_argument('--city', required=True)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    result = verify(args.site, args.city)
    args.out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'city': args.city, 'status': result['status'], 'sitemap_urls': result['sitemap_url_count'], 'site_bytes': result['capacity']['total_bytes']}))


if __name__ == '__main__':
    main()
