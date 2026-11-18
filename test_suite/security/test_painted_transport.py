import hashlib
import io
import json
from pathlib import Path
import runpy
import tarfile

import pytest


TOOLS = Path(__file__).resolve().parents[2] / 'tools'


def binding(raw, collection='painted-assets', suffix='.json'):
    digest = hashlib.sha256(raw).hexdigest()
    return {'path': f'/safety/buildings3d/{collection}/{digest[:2]}/{digest}{suffix}',
            'bytes': len(raw), 'sha256': digest}


def catalog_row(public, source=None):
    row = {'resolvedPath': public['path'], 'sha256': public['sha256'], 'bytes': public['bytes']}
    if source is not None:
        row['sourceAsset'] = source
    return row


@pytest.fixture
def specimen(tmp_path, monkeypatch):
    monkeypatch.syspath_prepend(str(TOOLS))
    pack = runpy.run_path(str(TOOLS / 'pack-painted-transport.py'))['pack']
    table_bytes = b'{"positions":[0,1,2],"indices":[2,1,0]}'
    table = binding(table_bytes, 'painted-tables')
    home = b'/' + b'/'.join((b'home', b'fixture', b'sources'))
    tail = b'/safety/buildings3d/data/leaf.json'
    raw = b'{"models":[{"provenance":{"leaf":"' + home + tail + b'"},"vertices":[3.00,0,-1]}]}'
    public_locator = b'source-evidence/' + hashlib.sha256(home).hexdigest()[:20].encode() + tail
    clean = raw.replace(home + tail, public_locator)
    old, public = binding(raw), binding(clean)
    png_data = b'\x89PNG\r\n\x1a\n'
    png = binding(png_data, suffix='.png')

    def run(name, assets, catalog=None, *, archive_sha=None):
        work = tmp_path / name
        work.mkdir()
        archive, descriptors, rows = work / 'input.tar.gz', work / 'tables.json', work / 'assets.json'
        with tarfile.open(archive, 'w:gz') as tar:
            for path, data in [(table['path'], table_bytes), (png['path'], png_data), *assets]:
                entry = tarfile.TarInfo(path.lstrip('/'))
                entry.size = len(data)
                tar.addfile(entry, io.BytesIO(data))
        digest = hashlib.sha256(archive.read_bytes()).hexdigest()
        descriptors.write_text(json.dumps([table]))
        if catalog is None:
            catalog = [catalog_row(public, old)]
        # Duplicate catalog rows are legitimate when several providers use identical bytes.
        rows.write_text(json.dumps({'found': [catalog_row(png), catalog_row(png), *catalog]}))
        output = work / 'site'
        return pack(archive, archive_sha or digest, descriptors, rows, output,
                    work / 'manifest.json', work / 'receipt.json')

    return run, old, raw, public, clean


def test_original_or_projected_asset_produce_the_same_public_package(specimen, tmp_path):
    run, old, raw, public, clean = specimen
    before = run('original', [(old['path'], raw)])
    after = run('public', [(public['path'], clean)])
    for key in ['archive_sha256', 'asset_root']:
        assert before[key] != after[key]
    assert {k: v for k, v in before.items() if k not in {'archive_sha256', 'asset_root'}} == {
        k: v for k, v in after.items() if k not in {'archive_sha256', 'asset_root'}}
    for name in ['original', 'public']:
        site = tmp_path / name / 'site'
        assert (site / public['path'][1:]).read_bytes() == clean
        assert not (site / old['path'][1:]).exists()
        assert before['non_table_asset_count'] == 2
        assert set(before['files']) == {p.relative_to(site).as_posix() for p in site.rglob('*') if p.is_file()}


def test_clean_legacy_asset_without_alias_remains_valid(specimen):
    run, _, _, public, clean = specimen
    result = run('legacy', [(public['path'], clean)], [catalog_row(public)])
    assert result['files'][public['path'][1:]] == {'bytes': len(clean), 'sha256': public['sha256']}


@pytest.mark.parametrize('problem', ['old-plus-public', 'public-plus-old', 'missing', 'corrupt-old',
                                     'corrupt-public', 'wrong-length', 'wrong-target', 'private-unmapped',
                                     'ambiguous-source', 'archive-sha'])
def test_rejected_inputs_leave_no_public_output(specimen, tmp_path, problem):
    run, old, raw, public, clean = specimen
    source_entry, public_entry = (old['path'], raw), (public['path'], clean)
    assets = [source_entry]
    catalog = [catalog_row(public, old)]
    archive_sha = None
    if problem == 'old-plus-public':
        assets.append(public_entry)
    elif problem == 'public-plus-old':
        assets = [public_entry, source_entry]
    elif problem == 'missing':
        assets = []
    elif problem == 'corrupt-old':
        assets = [(old['path'], raw[:-1] + b'?')]
    elif problem == 'corrupt-public':
        assets = [(public['path'], clean[:-1] + b'?')]
    elif problem == 'wrong-length':
        assets = [(public['path'], raw)]
    elif problem == 'wrong-target':
        catalog = [catalog_row(binding(clean + b' '), old)]
    elif problem == 'private-unmapped':
        catalog = [catalog_row(old)]
    elif problem == 'ambiguous-source':
        catalog.append(catalog_row(binding(clean + b' '), old))
    else:
        archive_sha = '0' * 64
    with pytest.raises(ValueError):
        run('rejected', assets, catalog, archive_sha=archive_sha)
    assert all(not (tmp_path / 'rejected' / name).exists() for name in ['site', 'manifest.json', 'receipt.json'])
