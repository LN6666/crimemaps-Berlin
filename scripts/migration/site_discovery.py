"""Add bounded static discovery pages to an already reviewed single-city site.

Run before the final integrity/acceptance receipts are generated. This changes no
report data, routes, JavaScript bundles, analytics settings, or source judgments.
"""
from __future__ import annotations

import argparse
import hashlib
import html
import json
from pathlib import Path
import re
from urllib.parse import urlsplit
import xml.etree.ElementTree as ET

from audit_public_sites import Page

LOCALES = ('de', 'en', 'zh')
HTML_LANG = {'de': 'de', 'en': 'en', 'zh': 'zh-Hans'}
HREFLANG = {'de': 'de', 'en': 'en', 'zh': 'zh-Hans'}
ORIGIN = 'https://ln6666.github.io'
SITE_LIMIT = 1_000_000_000
GROWTH_BUDGET = 900_000_000
FILE_BUDGET = 100_000_000  # Existing project gate; not a claimed Pages per-file limit.
CSS = '''html{font:18px/1.65 system-ui,sans-serif;color:#172435;background:#f4f7fb}body{max-width:58rem;margin:0 auto;padding:2rem 1.2rem}a{color:#174b8b}nav{display:flex;flex-wrap:wrap;gap:.4rem 1rem}nav a{display:inline-flex;align-items:center;min-height:44px}h1{line-height:1.25}section{margin-block:2rem}li{margin-block:.4rem}a:focus-visible{outline:3px solid #b35d00;outline-offset:3px}@media(prefers-color-scheme:dark){html{color:#e8eff7;background:#14202c}a{color:#9cc9ff}}'''
COPY = {
    'de': {
        'portal_title': 'Polizeimeldungen auf Karten für 14 deutsche Städte',
        'map_title': '{city}: Polizeimeldungen auf der Karte',
        'portal_description': 'CrimeMaps zeigt veröffentlichte Polizeimeldungen aus 14 deutschen Städten mit Quellen und Angaben zur Ortsgenauigkeit. Die Auswahl erfasst nicht alle Straftaten.',
        'map_description': 'Veröffentlichte Polizeimeldungen aus {city} auf der Karte: nach Monat erkunden, Quellen lesen und ungenaue Ortsangaben erkennen. Keine vollständige Kriminalstatistik.',
        'intro': 'CrimeMaps ordnet ausgewählte veröffentlichte Polizeimeldungen Orten zu. Auf der Karte können Sie nach Veröffentlichungsmonat suchen und die verfügbaren Quellen öffnen.',
        'coverage_title': 'Was die Karte zeigt',
        'coverage': 'Die Auswahl kann Lücken enthalten. Eine Meldung kann mehrere Ereignisse beschreiben. Die Zahl der Meldungen ist keine Kriminalitätsrate und sagt nicht aus, wie sicher eine Gegend ist.',
        'precision': 'Ortsangaben können eine Straße, einen Bereich oder nur einen Stadtteil nennen. Ein genauer Punkt wird nicht ergänzt, wenn die Quelle dafür keine Grundlage bietet. Der Veröffentlichungsmonat muss nicht dem Zeitpunkt des Ereignisses entsprechen.',
        'edition': 'Dies ist eine frühe, offene Version. Zuordnung, Übersetzung und Bedienung können Fehler enthalten. Hinweise und Beiträge zur Verbesserung sind willkommen.',
        'open': 'Karte öffnen', 'portal_open': 'Städte auswählen', 'cities': 'Weitere Städte',
        'source': 'Zuständige Polizei', 'repository': 'Quellcode auf GitHub',
        'feedback': 'Fehler oder Fragen melden',
        'privacy': 'Für Beiträge auf GitHub brauchen Sie ein Konto. Ihr Konto und Ihr Text sind öffentlich sichtbar. Bitte veröffentlichen Sie keine persönlichen Daten.',
        'languages': 'Sprache', 'about': 'Über diese Karte', 'sitemap': 'Seitenübersicht',
    },
    'en': {
        'portal_title': 'Police report maps for 14 German cities',
        'map_title': '{city}: police reports on a map',
        'portal_description': 'Explore published police reports from 14 German cities with source links and location precision. CrimeMaps covers a selection of reports, not all crime.',
        'map_description': 'Explore published police reports from {city} by month, follow source links and see where locations are uncertain. This is not a complete crime inventory.',
        'intro': 'CrimeMaps places selected published police reports on a map. Browse by publication month and open the available source links.',
        'coverage_title': 'What the map shows',
        'coverage': 'Coverage can have gaps. One report may describe several events. Report counts are not crime rates and do not tell you how safe an area is.',
        'precision': 'A report may name a street, a wider area or only a district. The map does not add a precise point when the source does not support one. The publication month may differ from the time of the event.',
        'edition': 'This is an early open source version. Locations, translations and the interface may contain errors. Corrections and contributions are welcome.',
        'open': 'Open the map', 'portal_open': 'Choose a city', 'cities': 'Other cities',
        'source': 'Responsible police service', 'repository': 'Source code on GitHub',
        'feedback': 'Report an error or ask a question',
        'privacy': 'Posting on GitHub requires an account. Your account and message are public. Please do not post personal information.',
        'languages': 'Language', 'about': 'About this map', 'sitemap': 'Site pages',
    },
    'zh': {
        'portal_title': '德国14城警方公告地图',
        'map_title': '{city}警方公告地图',
        'portal_description': 'CrimeMaps汇集德国14座城市已公开的警方公告，可按公布月份查看地图、追溯来源并了解地点精度。所选公告不涵盖全部犯罪。',
        'map_description': '在地图上按月份查看{city}已公开的警方公告，阅读来源并了解地点不确定之处。所选公告不代表当地全部犯罪，也不是治安风险排名。',
        'intro': 'CrimeMaps把选取的警方公开公告整理到地图上。你可以按公布月份查看，并打开可用的来源链接。',
        'coverage_title': '地图展示什么',
        'coverage': '收录可能有遗漏，一篇公告也可能涉及多起事件。公告数量不是犯罪率，不能据此判断某个地区是否安全。',
        'precision': '公告可能只提到一条街、一片区域或一个行政区。原文不足以支持准确位置时，地图不会补造精确点。公告公布月份也可能与事件发生时间不同。',
        'edition': '这是仍在完善的开源初版，地点识别、翻译和使用体验都可能有错误。欢迎提出问题、纠正内容或参与改进。',
        'open': '打开地图', 'portal_open': '选择城市', 'cities': '其他城市',
        'source': '当地警方网站', 'repository': 'GitHub源代码', 'feedback': '报告错误或提出问题',
        'privacy': '在GitHub发帖需要账号，账号和留言会公开显示。请勿发布个人信息。',
        'languages': '语言', 'about': '关于这张地图', 'sitemap': '网站页面',
    },
}


def url(path: str) -> str:
    return ORIGIN + path


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def replace_head(page: str, title: str, description: str, canonical: str, about_path: str) -> str:
    if page.count('</head>') != 1 or len(re.findall(r'<title>.*?</title>', page, re.S)) != 1:
        raise ValueError('Expected one HTML head and title')
    parsed = Page()
    parsed.feed(page)
    metadata = parsed.summary()
    if any(set(re.split(r'[\s,]+', value.lower())) & {'noindex', 'none'} for value in metadata['robots_meta']):
        raise ValueError('Page is explicitly noindex; do not silently override publication intent')
    if metadata['canonicals'] or metadata['descriptions']:
        raise ValueError('Existing discovery metadata requires explicit reconciliation')
    page = re.sub(r'<title>.*?</title>', '<title>' + html.escape(title) + '</title>', page, count=1, flags=re.S)
    additions = (f'<meta name="description" content="{html.escape(description, quote=True)}">'
                 f'<link rel="canonical" href="{html.escape(canonical, quote=True)}">'
                 f'<link rel="help" href="{html.escape(about_path, quote=True)}">')
    return page.replace('</head>', additions + '</head>')


def measure(site: Path) -> dict:
    files = {}
    for path in sorted(site.rglob('*')):
        if path.is_symlink():
            raise ValueError('Published site may not contain symbolic links')
        if path.is_file():
            stat = path.stat()
            if stat.st_nlink != 1:
                raise ValueError('Published site may not contain hard links')
            files[path.relative_to(site).as_posix()] = stat.st_size
    total = sum(files.values())
    largest = max(files, key=files.get) if files else None
    return {'total_bytes': total, 'file_count': len(files), 'site_limit_bytes': SITE_LIMIT,
            'within_site_limit': total <= SITE_LIMIT, 'remaining_site_limit_bytes': SITE_LIMIT - total,
            'growth_budget_bytes': GROWTH_BUDGET, 'remaining_growth_budget_bytes': GROWTH_BUDGET - total,
            'largest_file': {'path': largest, 'bytes': files[largest]} if largest else None,
            'over_project_file_budget': [p for p, size in files.items() if size > FILE_BUDGET],
            'within_growth_budget': total < GROWTH_BUDGET,
            'measurement': 'Sum of actual regular file lengths in this final site directory; not repository size or compressed transfer size'}


def build(site: Path, city_id: str, catalog_path: Path) -> dict:
    if site.is_symlink() or not site.is_dir():
        raise ValueError('Expected a real reviewed site directory')
    cities = json.loads(catalog_path.read_text())
    city = next(c for c in cities if c['city'] == city_id)
    repo = 'crimemaps-' + city_id.capitalize()
    base = '/' + repo + '/'
    if city['map_path'] != base + ('map/' if city_id == 'berlin' else ''):
        raise ValueError('Unexpected canonical city path')
    if len(cities) != 14 or len({c['city'] for c in cities}) != 14:
        raise ValueError('Expected fourteen distinct cities')
    for c in cities:
        if set(c['names']) != set(LOCALES) or urlsplit(c['officialPoliceUrl']).scheme != 'https':
            raise ValueError('Invalid localized city/source catalog')
    css_target = site / 'discovery.css'
    sitemap_target = site / 'sitemap.xml'
    if css_target.exists() or sitemap_target.exists():
        raise ValueError('Discovery output already exists; preserve previous output')
    entrypoints = [('index.html', base, city_id == 'berlin')]
    if city_id == 'berlin':
        entrypoints.append(('map/index.html', base + 'map/', False))
    prepared = {}
    originals = {}
    sitemap_urls = []
    for filename, route, portal in entrypoints:
        path = site / filename
        if path.is_symlink() or not path.is_file():
            raise ValueError('Missing reviewed entrance: ' + filename)
        raw = path.read_text()
        originals[filename] = sha(path)
        description = COPY['de']['portal_description' if portal else 'map_description'].format(city=city['names']['de'])
        title = COPY['de']['portal_title' if portal else 'map_title'].format(city=city['names']['de']) + ' | CrimeMaps'
        about_base = route + 'about/'
        prepared[filename] = replace_head(raw, title, description, url(route), about_base + 'de/')
        if not portal:
            fallback = (f'<main><h1>{html.escape(title)}</h1><p>{html.escape(COPY["de"]["intro"])}</p>'
                        f'<p>{html.escape(COPY["de"]["coverage"])}</p><nav aria-label="Sprache">' +
                        ''.join(f'<a href="{about_base}{locale}/" lang="{HTML_LANG[locale]}">{label}</a>' for locale, label in [('de', 'Deutsch'), ('en', 'English'), ('zh', '中文')]) + '</nav></main>')
            prepared[filename], count = re.subn(r'<div\s+id=[\"\']app[\"\']\s*>\s*</div>', '<div id="app">' + fallback + '</div>', prepared[filename])
            if count != 1:
                raise ValueError('Expected an empty application mount; reconcile fallback explicitly')
        else:
            links = '<nav aria-label="Über CrimeMaps">' + ''.join(f'<a href="{about_base}{locale}/" lang="{HTML_LANG[locale]}">{label}</a>' for locale, label in [('de', 'Über CrimeMaps'), ('en', 'About CrimeMaps'), ('zh', '关于CrimeMaps')]) + '</nav>'
            if prepared[filename].count('</footer>') != 1:
                raise ValueError('Expected one portal footer')
            prepared[filename] = prepared[filename].replace('</footer>', links + '</footer>')
        sitemap_urls.append(url(route))
        alternates = ''.join(f'<link rel="alternate" hreflang="{HREFLANG[locale]}" href="{url(about_base + locale + "/")}">' for locale in LOCALES)
        alternates += f'<link rel="alternate" hreflang="x-default" href="{url(about_base + "de/")}">'
        for locale in LOCALES:
            copy = COPY[locale]
            name = city['names'][locale]
            heading = copy['portal_title' if portal else 'map_title'].format(city=name)
            description = copy['portal_description' if portal else 'map_description'].format(city=name)
            page_url = url(about_base + locale + '/')
            language_links = ''.join(f'<a href="{url(about_base + lang + "/")}" lang="{HTML_LANG[lang]}">{label}</a>' for lang, label in [('de', 'Deutsch'), ('en', 'English'), ('zh', '中文')])
            city_links = ''.join(f'<li><a href="{url(c["map_path"])}?lang={locale}">{html.escape(c["names"][locale])}</a></li>' for c in cities)
            repository = 'https://github.com/LN6666/' + repo
            page = (f'<!doctype html><html lang="{HTML_LANG[locale]}"><head><meta charset="utf-8">'
                    '<meta name="viewport" content="width=device-width,initial-scale=1">'
                    '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; script-src &#39;none&#39;; object-src &#39;none&#39;; style-src &#39;self&#39;; base-uri &#39;none&#39;; form-action &#39;none&#39;">'
                    f'<title>{html.escape(heading)} | CrimeMaps</title><meta name="description" content="{html.escape(description, quote=True)}">'
                    f'<link rel="canonical" href="{page_url}">{alternates}<link rel="stylesheet" href="{base}discovery.css"></head><body>'
                    f'<nav aria-label="{html.escape(copy["languages"])}">{language_links}</nav><main><h1>{html.escape(heading)}</h1>'
                    f'<p>{html.escape(copy["intro"])}</p><nav><a href="{url(route)}?lang={locale}">{html.escape(copy["portal_open" if portal else "open"])}</a></nav>'
                    f'<section><h2>{html.escape(copy["coverage_title"])}</h2><p>{html.escape(copy["coverage"])}</p><p>{html.escape(copy["precision"])}</p><p>{html.escape(copy["edition"])}</p></section>'
                    f'<p><a href="{html.escape(city["officialPoliceUrl"], quote=True)}">{html.escape(copy["source"])}</a></p>'
                    f'<section><h2>{html.escape(copy["cities"])}</h2><ul>{city_links}</ul></section></main>'
                    f'<footer><nav><a href="{repository}">{html.escape(copy["repository"])}</a><a href="{repository}/issues/new/choose">{html.escape(copy["feedback"])}</a>'
                    f'<a href="{base}sitemap.xml">{html.escape(copy["sitemap"])}</a></nav><p>{html.escape(copy["privacy"])}</p></footer></body></html>')
            relative = about_base.removeprefix(base) + locale + '/index.html'
            if (site / relative).exists():
                raise ValueError('Information page already exists')
            prepared[relative] = page
            sitemap_urls.append(page_url)
    namespace = 'http://www.sitemaps.org/schemas/sitemap/0.9'
    ET.register_namespace('', namespace)
    root = ET.Element('{' + namespace + '}urlset')
    for location in sitemap_urls:
        ET.SubElement(ET.SubElement(root, '{' + namespace + '}url'), '{' + namespace + '}loc').text = location
    xml = ET.tostring(root, encoding='unicode', xml_declaration=True)
    projected_added_bytes = sum(len(v.encode()) - ((site / k).stat().st_size if (site / k).exists() else 0) for k, v in prepared.items()) + len(CSS.encode()) + len(xml.encode())
    before = measure(site)
    if before['total_bytes'] + projected_added_bytes >= GROWTH_BUDGET:
        raise ValueError('Discovery addition would exceed final-site growth budget')
    for relative, text in prepared.items():
        target = site / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(text)
    css_target.write_text(CSS)
    sitemap_target.write_text(xml)
    return {'city': city_id, 'entrypoint_before_sha256': originals,
            'changed_files': {name: sha(site / name) for name in sorted([*prepared, 'discovery.css', 'sitemap.xml'])},
            'added_bytes': projected_added_bytes, 'sitemap_urls': sitemap_urls, 'capacity': measure(site),
            'hreflang_scope': 'Only the truly translated static information pages; existing query-language map and portal URLs are not falsely declared static alternates',
            'robots_scope': 'No project-path robots.txt is emitted: only origin-root robots.txt controls crawling',
            'data_and_bundles_changed': False, 'requires_new_integrity_and_acceptance_receipts': True}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--site', type=Path, required=True)
    parser.add_argument('--city', required=True)
    parser.add_argument('--catalog', type=Path, required=True)
    parser.add_argument('--receipt', type=Path, required=True)
    args = parser.parse_args()
    result = build(args.site, args.city, args.catalog)
    args.receipt.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'city': args.city, 'changed_files': len(result['changed_files']), 'added_bytes': result['added_bytes'], 'final_bytes': result['capacity']['total_bytes']}))


if __name__ == '__main__':
    main()
