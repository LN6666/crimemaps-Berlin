import copy
import hashlib
import json
import sqlite3

import pytest

from crimemapsberlin.munich_official_sections import import_sections


def sha(text):
    return hashlib.sha256(text.encode()).hexdigest()


@pytest.fixture
def intake(tmp_path):
    body = 'Station report. At 12:00 police observed an incident. The location is unknown.'
    quote = 'At 12:00 police observed an incident.'
    source_sha = sha(body)
    url = 'https://invalid.example/official/123'
    candidate = {
        'schema': 'crimemaps.private-provisional-munich-scene-review.v1',
        'city': 'munich', 'source_id': '123', 'source_url': url,
        'identity': {'source_id': '123', 'city': 'munich', 'source_url': url,
                     'source_candidate_narrative_body_sha256': source_sha},
        'canonical_adopted': False, 'publication_ready': False,
        'incident_count': None, 'incident_count_status': 'not_asserted',
        'scenes_complete_for_saved_narrative': True,
        'formal_locations_complete_for_saved_narrative': True,
        'scene_section_count': 1,
        'article_overview': {'quote_de': quote, 'quote_sha256': sha(quote),
                             'referenced_scene_ids': ['section-1']},
        'formal_locations': [{'location_id': 'location-1', 'coordinates': None,
                              'geometry_decision': 'unknown_unresolved',
                              'place_wording_de': 'The location is unknown.',
                              'scene_ids': ['section-1'], 'evidence_quotes': [quote],
                              'evidence_quote_sha256': [sha(quote)]}],
        'scenes': [{'incident_id': 'section-1', 'city': 'munich', 'source_id': '123',
                    'source_url': url, 'source_candidate_narrative_body_sha256': source_sha,
                    'source_sha256': None, 'event_time': None,
                    'original_section_heading': 'Station report.',
                    'formal_location_ids': ['location-1'], 'evidence_quotes': [quote],
                    'source_stated_time': ['12:00'],
                    'phases': [{'quote_de': quote, 'quote_sha256': sha(quote),
                                'formal_location_ids': ['location-1'], 'time_de': '12:00'}]}],
    }
    db = tmp_path / 'source.sqlite'
    with sqlite3.connect(db) as con:
        con.execute('CREATE TABLE reports(id TEXT,url TEXT,title TEXT,published TEXT,body TEXT,sha256 TEXT,revision TEXT)')
        con.execute('INSERT INTO reports VALUES(?,?,?,?,?,?,?)',
                    ('123', url, 'Synthetic report', '2026-10-01', body, source_sha, 'fixture'))
    path = tmp_path / 'candidate.json'
    return db, path, candidate


def receive(intake, candidate=None):
    db, path, original = intake
    path.write_text(json.dumps(candidate or original), encoding='utf-8')
    return import_sections(db_path=db, candidate_path=path)


def test_source_bound_sections_round_trip_is_idempotent_and_never_publishes(intake):
    result = receive(intake)
    assert result['sections'] == 1 and result['incident_count'] is None
    assert result['source_binding_accepted'] is True and result['publication_ready'] is False
    assert result['inserted'] == 1 and receive(intake)['inserted'] == 0
    with sqlite3.connect(intake[0]) as db:
        saved = json.loads(db.execute('SELECT candidate_json FROM munich_official_section_reviews').fetchone()[0])
        assert saved == intake[2]
        assert db.execute('SELECT count(*) FROM reports').fetchone()[0] == 1


@pytest.mark.parametrize('mutation', ['source', 'quote', 'coordinate', 'reference', 'count', 'coverage', 'time', 'publish', 'missing_hash'])
def test_rejects_stale_fabricated_or_promoted_evidence_without_writing_ledger(intake, mutation):
    c = copy.deepcopy(intake[2])
    if mutation == 'source':
        c['identity']['source_candidate_narrative_body_sha256'] = '0' * 64
    elif mutation == 'quote':
        c['scenes'][0]['phases'][0]['quote_de'] = 'Not in the official body.'
    elif mutation == 'coordinate':
        c['formal_locations'][0]['coordinates'] = [11, 48]
    elif mutation == 'reference':
        c['scenes'][0]['phases'][0]['formal_location_ids'] = ['not-reviewed']
    elif mutation == 'count':
        c['incident_count'] = 1
    elif mutation == 'coverage':
        c['scenes_complete_for_saved_narrative'] = False
    elif mutation == 'time':
        c['scenes'][0]['source_stated_time'] = ['2026-10-19T12:00:00Z']
    elif mutation == 'missing_hash':
        del c['scenes'][0]['phases'][0]['quote_sha256']
    elif mutation == 'publish':
        c['publication_ready'] = True
    with pytest.raises((ValueError, TypeError)):
        receive(intake, c)
    with sqlite3.connect(intake[0]) as db:
        assert not db.execute("SELECT name FROM sqlite_master WHERE name='munich_official_section_reviews'").fetchall()


def test_changed_body_does_not_reuse_old_source_binding(intake):
    receive(intake)
    with sqlite3.connect(intake[0]) as db:
        body = 'A replaced source version.'
        db.execute('UPDATE reports SET body=?,sha256=?', (body, sha(body)))
    with pytest.raises(ValueError, match='source identity or body version'):
        receive(intake)
    with sqlite3.connect(intake[0]) as db:
        assert db.execute('SELECT count(*) FROM munich_official_section_reviews').fetchone()[0] == 1


def test_three_sections_26_phases_13_null_locations_round_trip_without_count(intake):
    c = copy.deepcopy(intake[2])
    original_scene = c['scenes'][0]
    original_location = c['formal_locations'][0]
    c['formal_locations'] = [dict(copy.deepcopy(original_location), location_id=f'location-{i}') for i in range(13)]
    c['scenes'] = []
    for i, phase_count in enumerate([9, 9, 8]):
        scene = copy.deepcopy(original_scene)
        scene['incident_id'] = f'section-{i}'
        scene['formal_location_ids'] = [loc['location_id'] for loc in c['formal_locations']]
        phase = dict(copy.deepcopy(original_scene['phases'][0]), formal_location_ids=['location-0'])
        scene['phases'] = [copy.deepcopy(phase) for _ in range(phase_count)]
        c['scenes'].append(scene)
    ids = [s['incident_id'] for s in c['scenes']]
    for loc in c['formal_locations']:
        loc['scene_ids'] = ids
    c['article_overview']['referenced_scene_ids'] = ids
    c['scene_section_count'] = 3
    result = receive(intake, c)
    assert (result['sections'], result['phases'], result['locations'], result['incident_count']) == (3, 26, 13, None)
    with sqlite3.connect(intake[0]) as db:
        saved = json.loads(db.execute('SELECT candidate_json FROM munich_official_section_reviews').fetchone()[0])
    assert saved == c
    assert all(loc['coordinates'] is None for loc in saved['formal_locations'])
