#!/usr/bin/env python3
"""Build one self-contained, offline Snack Dash HTML file using Python stdlib."""
from pathlib import Path
import argparse
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SOURCES = {
    '<!-- BUILD:CSS -->': ('src/css/app.css', '<style>\n', '</style>'),
    '<!-- BUILD:I18N -->': ('src/js/i18n.js', '<script>\n', '</script>'),
    '<!-- BUILD:LOCALES -->': ('src/js/locales.js', '<script>\n', '</script>'),
    '<!-- BUILD:MATH -->': ('src/js/math.js', '<script>\n', '</script>'),
    '<!-- BUILD:REACTIONS -->': ('src/js/reactions.js', '<script>\n', '</script>'),
    '<!-- BUILD:GAME -->': ('src/js/game.js', '<script>\n', '</script>'),
}


def build(destination: Path) -> Path:
    page = (ROOT / 'src/index.template.html').read_text(encoding='utf-8')
    for marker, (filename, prefix, suffix) in SOURCES.items():
        if page.count(marker) != 1:
            raise RuntimeError(f'Expected exactly one {marker} in template')
        content = (ROOT / filename).read_text(encoding='utf-8')
        if filename.endswith('.js') and '</script' in content.lower():
            raise RuntimeError(f'{filename} contains an unsafe script-closing sequence')
        page = page.replace(marker, f'{prefix}{content}{suffix}')
    if any(marker in page for marker in SOURCES):
        raise RuntimeError('Unfilled build marker')
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(page, encoding='utf-8')
    return destination


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=ROOT / 'dist/Snack_Dash.html')
    parser.add_argument('--zip', action='store_true', help='Also create dist/Snack_Dash_HTML.zip')
    args = parser.parse_args()
    output = build(args.output)
    print(f'Built {output} ({output.stat().st_size:,} bytes)')
    if args.zip:
        archive = output.parent / 'Snack_Dash_HTML.zip'
        with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED) as z:
            z.write(output, 'Snack_Dash.html')
        print(f'Packaged {archive} ({archive.stat().st_size:,} bytes)')


if __name__ == '__main__':
    main()
