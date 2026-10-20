"""Dump the supplied configurator workbook to data/workbook_dump.json.

For every sheet: each non-empty cell with its label/value, its formula (when it has
one) and its cached value as saved in the workbook. Standard library only (matches
scripts/gen_golden.py). The Excel page (scripts/build_excel_page.mjs) renders this
dump, so the page always shows what the workbook actually contains.
Run: python3 scripts/extract_workbook.py
"""
import json, os, re, zipfile
from xml.etree import ElementTree as ET

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
WB = os.path.join(ROOT, 'deliverables/downloads/AppliedCompute_Deal_Configurator_Dropdowns.xlsx')
OUT = os.path.join(ROOT, 'data/workbook_dump.json')
NS = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
RNS = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}'


def col_index(ref):
    letters = re.match(r'([A-Z]+)', ref).group(1)
    n = 0
    for ch in letters:
        n = n * 26 + (ord(ch) - 64)
    return n


def main():
    z = zipfile.ZipFile(WB)
    shared = []
    if 'xl/sharedStrings.xml' in z.namelist():
        root = ET.fromstring(z.read('xl/sharedStrings.xml'))
        for si in root.iter(NS + 'si'):
            shared.append(''.join(t.text or '' for t in si.iter(NS + 't')))

    wbx = ET.fromstring(z.read('xl/workbook.xml'))
    rels = ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
    target = {r.get('Id'): r.get('Target') for r in rels}
    sheets = []
    for s in wbx.iter(NS + 'sheet'):
        rid = s.get(RNS + 'id')
        path = target[rid].lstrip('/')
        if not path.startswith('xl/'):
            path = 'xl/' + path
        sheets.append((s.get('name'), path))

    out = []
    for name, path in sheets:
        root = ET.fromstring(z.read(path))
        cells = []
        for c in root.iter(NS + 'c'):
            ref = c.get('r')
            t = c.get('t')
            f = c.find(NS + 'f')
            v = c.find(NS + 'v')
            is_ = c.find(NS + 'is')
            value = None
            if t == 's' and v is not None:
                value = shared[int(v.text)]
            elif t == 'inlineStr' and is_ is not None:
                value = ''.join(x.text or '' for x in is_.iter(NS + 't'))
            elif t in ('str', 'e') and v is not None:
                value = v.text
            elif t == 'b' and v is not None:
                value = v.text == '1'
            elif v is not None and v.text is not None:
                try:
                    value = float(v.text)
                except ValueError:
                    value = v.text
            formula = f.text if f is not None and f.text else None
            if value is None and formula is None:
                continue
            cells.append({'ref': ref, 'value': value, 'formula': formula,
                          'col': col_index(ref), 'row': int(re.search(r'\d+', ref).group(0))})
        cells.sort(key=lambda x: (x['row'], x['col']))
        for cell in cells:
            del cell['col'], cell['row']
        out.append({'name': name, 'cells': cells})

    with open(OUT, 'w', encoding='utf-8') as fh:
        json.dump({'source': os.path.relpath(WB, ROOT), 'sheets': out}, fh, ensure_ascii=False, indent=1)
    total = sum(len(s['cells']) for s in out)
    formulas = sum(1 for s in out for c in s['cells'] if c['formula'])
    print(f'wrote {os.path.relpath(OUT, ROOT)}: {len(out)} sheets, {total} cells, {formulas} formulas')


if __name__ == '__main__':
    main()
