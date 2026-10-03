"""Build the single-file artifact.

Concatenates consts → data → model → the voxel lattice → the signature
modules (bullseye, vials3d, scan3d) → view → sig inside one strict-mode IIFE,
and embeds the images and the lattice as data. The artifact output has no doctype/html/head/body (the
host provides them); a preview.html target gets a minimal wrapper.

    python3 build.py ../index.html            # the artifact file
    python3 build.py "$PWD/preview.html"      # local preview
"""
import base64, pathlib, sys
here = pathlib.Path(__file__).parent
def uri(name, mime):
    return f"data:{mime};base64," + base64.b64encode((here / name).read_bytes()).decode()
def js(name):
    return (here / name).read_text()
MODULES = ['modules/bullseye.js', 'modules/vials3d.js', 'modules/scan3d.js']
def lattice():
    # The Living Scan's voxel figure: X Bot by Adobe Mixamo (royalty-free),
    # re-posed to an A-pose and voxelised by tools/bake-lattice.mjs. Inlined as
    # JSON rather than a data URI so the module can decode it synchronously.
    raw = (here / 'assets/scan-lattice.json').read_text().strip()
    return 'const SCAN_LATTICE = ' + raw + ';'
def plates():
    out = {}
    for f in sorted((here).glob('plate-*.png')):
        out[f.stem.replace('plate-', '')] = uri(f.name, 'image/png')
    return out
def wood():
    # a photograph when one is supplied, else the drawn section stands
    for n, m in (('wood.jpg', 'image/jpeg'), ('wood.png', 'image/png')):
        if (here / n).exists():
            return uri(n, m)
    return ''
def opt_img(*names):
    for n, m in names:
        if (here / n).exists():
            return uri(n, m)
    return ''
def treeline():
    # the hero's engraved horizon: a supplied plate wins, else the painted stand
    for n, m in (('treeline.png', 'image/png'), ('treeline.webp', 'image/webp'), ('treeline.jpg', 'image/jpeg')):
        if (here / n).exists():
            return uri(n, m)
    return ''
imgs = {'{{HERO}}': uri('hero.jpg', 'image/jpeg'), '{{CANOPY}}': uri('canopy.jpg', 'image/jpeg'),
        '{{WM_GREEN}}': uri('wm-green.png', 'image/png'), '{{WM_WHITE}}': uri('wm-white.png', 'image/png'),
        '{{WM_INV}}': uri('wm-inv.png', 'image/png')}
src = (here / 'src.html').read_text()
import json as _json
parts = {'{{PLATES}}': 'const PLATES = ' + _json.dumps(plates()) + ';\nconst WOOD_URI = ' + _json.dumps(wood()) + ';\nconst TREELINE_URI = ' + _json.dumps(treeline()) + ';\nconst RING_URI = ' + _json.dumps(opt_img(('ring-round.webp','image/webp'),('ring-round.png','image/png'))) + ';\nconst CLOSE_URI = ' + _json.dumps(opt_img(('close-engraving.webp','image/webp'),('close-engraving.png','image/png'))) + ';\nconst SPRIG_URI = ' + _json.dumps(opt_img(('sprig.png','image/png'),('sprig.webp','image/webp'))) + ';',
         '{{CONSTS}}': js('consts.js'), '{{DATA}}': js('data.js'), '{{MODEL}}': js('model.js'), '{{LATTICE}}': lattice(),
         '{{MODULES}}': '\n'.join(js(m) for m in MODULES), '{{VIEW}}': js('view.js'), '{{SIG}}': js('sig.js')}
for k, v in parts.items():
    assert k in src, k
    src = src.replace(k, v)
for k, v in imgs.items():
    src = src.replace(k, v)
args = [a for a in sys.argv[1:] if not a.startswith('--')]
flags = {a for a in sys.argv[1:] if a.startswith('--')}
out = args[0] if args else str(here / 'out.html')
# the artifact host supplies its own document shell; a file served anywhere
# else - local preview, GitHub Pages - needs a real one
if out.endswith('preview.html') or '--standalone' in flags:
    # a served page is asked for a favicon; an inline mark answers it without a request
    ICON = '<link rel="icon" href="data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%2032%2032%22%3E%3Crect%20width=%2232%22%20height=%2232%22%20rx=%227%22%20fill=%22%232C4E25%22/%3E%3Ccircle%20cx=%2216%22%20cy=%2216%22%20r=%2210.5%22%20fill=%22none%22%20stroke=%22%23FFFCF7%22%20stroke-opacity=%22.45%22%20stroke-width=%221.6%22/%3E%3Ccircle%20cx=%2216%22%20cy=%2216%22%20r=%226%22%20fill=%22none%22%20stroke=%22%23FFFCF7%22%20stroke-opacity=%22.7%22%20stroke-width=%221.6%22/%3E%3Ccircle%20cx=%2216%22%20cy=%2216%22%20r=%222.4%22%20fill=%22%23A4C29D%22/%3E%3C/svg%3E">'
    src = '<!doctype html><html lang="en-CA"><head><meta charset="utf-8">' + ICON + src + '</html>'
pathlib.Path(out).write_text(src)
print(out, len(src))
