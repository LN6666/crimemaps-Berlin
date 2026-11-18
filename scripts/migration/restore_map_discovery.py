"""Retain reviewed map discovery content when replacing a frontend build.

The caller must bind the reviewed entrance to its accepted artifact. Only its
title, description, canonical/help links and static application fallback carry
forward. The new build keeps its scripts, styles, CSP and all runtime assets.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import re

from audit_public_sites import Page
from site_discovery import ORIGIN, replace_head

APP = re.compile(r'<div\s+id=["\']app["\']\s*>(.*?)</div>', re.S)


def restore_map_discovery(current: str, reviewed: str, city: str) -> str:
    if not re.fullmatch(r'[a-z]+', city):
        raise ValueError('Expected a canonical city slug')
    route = '/crimemaps-' + city.capitalize() + '/' + ('map/' if city == 'berlin' else '')
    about = route + 'about/de/'
    page = Page()
    page.feed(reviewed)
    metadata = page.summary()
    if (metadata['canonicals'] != [ORIGIN + route]
            or len(metadata['descriptions']) != 1
            or not metadata['descriptions'][0].strip()
            or not metadata['title'].strip()):
        raise ValueError('Reviewed entrance discovery metadata does not match this city')
    if any(set(re.split(r'[\s,]+', value.lower())) & {'noindex', 'none'}
           for value in metadata['robots_meta']):
        raise ValueError('Reviewed entrance is explicitly not indexable')
    helps = [link.get('href') for link in page.links if 'help' in link.get('rel', '').split()]
    if helps != [about]:
        raise ValueError('Reviewed entrance has an unexpected information-page link')
    old_mounts = list(APP.finditer(reviewed))
    new_mounts = list(APP.finditer(current))
    if len(old_mounts) != 1 or len(new_mounts) != 1 or new_mounts[0].group(1).strip():
        raise ValueError('Expected one reviewed fallback and an empty new application mount')
    fallback = old_mounts[0].group(1)
    if (not fallback.strip() or re.search(r'<\s*(?:div|script|style|iframe)\b', fallback, re.I)
            or not fallback.rstrip().endswith('</main>')):
        raise ValueError('Reviewed static fallback has an unexpected structure')
    fallback_page = Page()
    fallback_page.feed(fallback)
    expected_links = [route + 'about/' + locale + '/' for locale in ('de', 'en', 'zh')]
    if (fallback_page.summary()['static_text_characters'] < 200
            or fallback_page.anchors != expected_links):
        raise ValueError('Reviewed fallback is missing its introduction or language links')
    result = replace_head(current, metadata['title'], metadata['descriptions'][0], ORIGIN + route, about)
    # A callable replacement keeps literal backslashes in reviewed text intact.
    return APP.sub(lambda match: '<div id="app">' + fallback + '</div>', result, count=1)


def restore_file(frontend: Path, reviewed: Path, reviewed_sha256: str, city: str, output: Path) -> dict:
    """Write a new entrance from an explicitly bound accepted predecessor."""
    if output.exists() or output.is_symlink():
        raise ValueError('Output already exists; preserve sealed entrances')
    if frontend.is_symlink() or reviewed.is_symlink():
        raise ValueError('Expected ordinary frontend and reviewed files')
    raw = frontend.read_bytes()
    accepted = reviewed.read_bytes()
    if hashlib.sha256(accepted).hexdigest() != reviewed_sha256:
        raise ValueError('Reviewed entrance hash changed')
    result = restore_map_discovery(raw.decode('utf-8'), accepted.decode('utf-8'), city).encode('utf-8')
    with output.open('xb') as stream:
        stream.write(result)
    return {'city': city, 'frontend_sha256': hashlib.sha256(raw).hexdigest(),
            'reviewed_sha256': reviewed_sha256, 'output_sha256': hashlib.sha256(result).hexdigest(),
            'output_bytes': len(result), 'publication_ready': False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--frontend', type=Path, required=True)
    parser.add_argument('--reviewed', type=Path, required=True)
    parser.add_argument('--reviewed-sha256', required=True)
    parser.add_argument('--city', required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(restore_file(args.frontend, args.reviewed, args.reviewed_sha256, args.city, args.output)))


if __name__ == '__main__':
    main()
