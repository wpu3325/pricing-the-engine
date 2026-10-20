"""Generate golden fixtures FROM THE WORKBOOK ITSELF.

For each scenario in data/scenarios/scenarios.json:
  1. copy the configurator workbook, patch the input cells (XML level, no Excel needed)
  2. strip cached formula values so LibreOffice must recalculate
  3. convert with `soffice --headless` and read the recalculated cached values
  4. write test/golden/<id>.json

The JS test suite then asserts the engine reproduces every value (see test/parity.test.js).
Run: python3 scripts/gen_golden.py   (requires LibreOffice; no third-party Python packages)
"""
import json, os, re, shutil, subprocess, sys, tempfile, zipfile, html
from xml.etree import ElementTree as ET

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
WB = os.path.join(ROOT, 'docs/reference/configurator/AppliedCompute_Deal_Configurator_Dropdowns.xlsx')
SCEN = os.path.join(ROOT, 'data/scenarios/scenarios.json')
OUT = os.path.join(ROOT, 'test/golden')
NS = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
SHEETS = {'01': 'xl/worksheets/sheet1.xml', '02': 'xl/worksheets/sheet2.xml', '03': 'xl/worksheets/sheet3.xml', '04': 'xl/worksheets/sheet4.xml'}

# Cells the parity test compares. Values are read from the recalculated workbook.
READ = {
    '02': ['B6','B7','B8','B9','B18','B19','B20','B21','B22','B23','B24','B25','B26','B27','B28',
           'B52','B53','B54','B55','B56','B57','B58','B59','B60','B61','B62','B63','B64','B65','B66','B67','B68','B69','B70',
           'B73','B74','B75','B76','B77','B78','B79','B80','B81','B82','B83','B84','B85',
           'B91','B92','B93','B94','B95','B96','B97','B98','B99','B100','B101','B102','B103','B104',
           'B111','B112','B113','B114','B115','B116','B117','B118','B119','B120','B121','B122','B123','B124','B125'],
    '01': ['B8','G5','G6','G7','G8','G9','G10','G11','G12','G13','G16','G17','G18','G19','G23','G24','G25','G28','G30','G32'],
}
# Grid cells for the first 16 weeks (rows 32..47), per column
GRID_COLS = ['D','E','F','G','H','I','J','K','L','P']

def set_cell(xml, ref, value):
    """Replace a cell's content, keeping its style. value: number or string."""
    pat = re.compile(r'<x:c r="%s"( [^>]*?)?(/>|>.*?</x:c>)' % ref, re.S)
    m = pat.search(xml)
    if not m:
        raise SystemExit(f'cell {ref} not found')
    attrs = m.group(1) or ''
    s = re.search(r's="\d+"', attrs)
    style = f' {s.group(0)}' if s else ''
    if isinstance(value, str):
        new = f'<x:c r="{ref}"{style} t="inlineStr"><x:is><x:t>{html.escape(value)}</x:t></x:is></x:c>'
    else:
        new = f'<x:c r="{ref}"{style}><x:v>{value}</x:v></x:c>'
    return xml[:m.start()] + new + xml[m.end():]

def build_input(src, dst, edits):
    zin = zipfile.ZipFile(src)
    zout = zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED)
    for item in zin.infolist():
        data = zin.read(item.filename)
        if item.filename.startswith('xl/worksheets/sheet'):
            s = data.decode('utf-8')
            sheet = [k for k, v in SHEETS.items() if v == item.filename]
            for key, val in edits.items():
                sh, ref = key.split('!')
                if SHEETS.get(sh) == item.filename:
                    s = set_cell(s, ref, val)
            # strip cached formula results so LibreOffice recalculates everything
            s = re.sub(r'(<x:f[^>]*>[^<]*</x:f>|<x:f[^>]*/>)<x:v>[^<]*</x:v>', r'\1', s)
            data = s.encode('utf-8')
        zout.writestr(item, data)
    zout.close()

def read_values(path):
    z = zipfile.ZipFile(path)
    ss = []
    if 'xl/sharedStrings.xml' in z.namelist():
        root = ET.fromstring(z.read('xl/sharedStrings.xml'))
        for si in root.findall(NS + 'si'):
            ss.append(''.join(t.text or '' for t in si.iter(NS + 't')))
    out = {}
    for sh, part in SHEETS.items():
        if part not in z.namelist():
            continue
        root = ET.fromstring(z.read(part))
        for c in root.iter(NS + 'c'):
            ref = c.get('r'); t = c.get('t'); v = c.find(NS + 'v')
            if t == 'inlineStr':
                val = ''.join(x.text or '' for x in c.iter(NS + 't'))
            elif v is None:
                continue
            elif t == 's':
                val = ss[int(v.text)]
            elif t in ('str', 'e'):
                val = v.text
            elif t == 'b':
                val = bool(int(v.text))
            else:
                val = float(v.text)
            out[f'{sh}!{ref}'] = val
    return out

def recalc(edits, tmp):
    src = os.path.join(tmp, 'in.xlsx')
    build_input(WB, src, edits)
    outdir = os.path.join(tmp, 'out')
    subprocess.run(['soffice', '--headless', '--calc', '--convert-to', 'xlsx', '--outdir', outdir, src],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return read_values(os.path.join(outdir, 'in.xlsx'))

def main():
    os.makedirs(OUT, exist_ok=True)
    scen = json.load(open(SCEN))
    for sc in scen:
        tmp = tempfile.mkdtemp(prefix='golden-')
        vals = recalc(sc['workbook'], tmp)
        expected = {}
        for sh, cells in READ.items():
            for c in cells:
                expected[f'{sh}!{c}'] = vals.get(f'{sh}!{c}')
        for r in range(32, 48):
            for col in GRID_COLS:
                expected[f'02!{col}{r}'] = vals.get(f'02!{col}{r}')
        out = {'id': sc['id'], 'description': sc['description'], 'workbookEdits': sc['workbook'], 'expected': expected}
        json.dump(out, open(os.path.join(OUT, sc['id'] + '.json'), 'w'), indent=1)
        print(f"{sc['id']:<28} quote={expected.get('02!B100')} cogs={expected.get('02!B84')} status={expected.get('02!B104')}")
        shutil.rmtree(tmp, ignore_errors=True)

if __name__ == '__main__':
    main()
