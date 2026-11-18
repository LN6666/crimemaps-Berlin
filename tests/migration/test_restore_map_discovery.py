import hashlib
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'scripts/migration'))
from restore_map_discovery import restore_file, restore_map_discovery
from site_discovery import COPY, HTML_LANG, ORIGIN, replace_head
from audit_public_sites import Page


class RestoreMapDiscoveryTests(unittest.TestCase):
    def fixtures(self, city='hamburg'):
        current = ('<!doctype html><html lang="de-DE"><head><title>New map</title>'
                   '<meta http-equiv="Content-Security-Policy" content="script-src \'self\'">'
                   '<script type="module" src="/new-runtime.js"></script>'
                   '<link rel="stylesheet" href="/new-style.css"></head>'
                   '<body><div id="app"></div></body></html>')
        route = '/crimemaps-' + city.capitalize() + '/' + ('map/' if city == 'berlin' else '')
        reviewed = replace_head(current.replace('/new-runtime.js', '/old-runtime.js'),
                                'Reviewed title', 'Reviewed description', ORIGIN + route, route + 'about/de/')
        fallback = '<main><h1>Reviewed title</h1><p>' + COPY['de']['intro'] + '</p><p>' + COPY['de']['coverage'] + '</p><nav>'
        fallback += ''.join(f'<a href="{route}about/{locale}/" lang="{HTML_LANG[locale]}">{locale}</a>' for locale in ('de', 'en', 'zh'))
        fallback += '</nav></main>'
        return current, reviewed.replace('<div id="app"></div>', '<div id="app">' + fallback + '</div>')

    def test_retains_reviewed_copy_and_new_runtime(self):
        for city in ('berlin', 'hamburg'):
            with self.subTest(city=city):
                current, reviewed = self.fixtures(city)
                result = restore_map_discovery(current, reviewed, city)
                self.assertIn('/new-runtime.js', result)
                self.assertNotIn('/old-runtime.js', result)
                self.assertIn('<link rel="stylesheet" href="/new-style.css">', result)
                self.assertIn('<meta http-equiv="Content-Security-Policy" content="script-src \'self\'">', result)
                page = Page(); page.feed(result)
                self.assertEqual(page.summary()['title'], 'Reviewed title')
                self.assertGreater(page.summary()['static_text_characters'], 200)
                self.assertEqual(len(page.summary()['canonicals']), 1)

    def test_refuses_cross_city_or_existing_app_content(self):
        current, reviewed = self.fixtures()
        with self.assertRaises(ValueError):
            restore_map_discovery(current, reviewed, 'berlin')
        with self.assertRaises(ValueError):
            restore_map_discovery(current.replace('<div id="app"></div>', '<div id="app">Live content</div>'), reviewed, 'hamburg')

    def test_refuses_noindex_and_double_application(self):
        current, reviewed = self.fixtures()
        for target in (current.replace('</head>', '<meta name="robots" content="noindex"></head>'),
                       restore_map_discovery(current, reviewed, 'hamburg')):
            with self.assertRaises(ValueError):
                restore_map_discovery(target, reviewed, 'hamburg')
        with self.assertRaises(ValueError):
            restore_map_discovery(current, reviewed.replace('</head>', '<meta name="robots" content="none"></head>'), 'hamburg')

    def test_file_boundary_checks_binding_and_preserves_inputs(self):
        current, reviewed = self.fixtures()
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory); frontend = root / 'new.html'; source = root / 'accepted.html'; output = root / 'restored.html'
            frontend.write_text(current); source.write_text(reviewed)
            with self.assertRaisesRegex(ValueError, 'hash changed'):
                restore_file(frontend, source, '0' * 64, 'hamburg', output)
            self.assertFalse(output.exists())
            binding = hashlib.sha256(source.read_bytes()).hexdigest()
            receipt = restore_file(frontend, source, binding, 'hamburg', output)
            self.assertEqual(frontend.read_text(), current)
            self.assertEqual(source.read_text(), reviewed)
            self.assertEqual(receipt['output_sha256'], hashlib.sha256(output.read_bytes()).hexdigest())
            with self.assertRaisesRegex(ValueError, 'already exists'):
                restore_file(frontend, source, binding, 'hamburg', output)


if __name__ == '__main__':
    unittest.main()
