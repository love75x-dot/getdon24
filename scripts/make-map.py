"""로또 1등 지도용 경계 만들기 (한 번만 돌리면 된다).

원본: 통계청(KOSTAT) 2013 시군구 경계, southkorea/southkorea-maps 저장소
  git clone --depth 1 https://github.com/southkorea/southkorea-maps.git
  pip install shapely
  python3 scripts/make-map.py southkorea-maps/kostat/2013/json/skorea_municipalities_geo_simple.json
결과: src/map-kr.json  (시·도 묶음 + 시·군 단위 SVG 경로)
행정구역이 바뀐 곳(청주·청원 통합, 군위군 대구 편입, 인천 구 개편 등)은 아래 표로 맞춘다.
"""
import json, math, re, sys
from shapely.geometry import shape, Polygon, MultiPolygon
from shapely.ops import unary_union

SRC = sys.argv[1]
OUT = 'src/map-kr.json'
PROV = {'11': '서울', '21': '부산', '22': '대구', '23': '인천', '24': '광주·전남', '25': '대전', '26': '울산', '29': '세종',
        '31': '경기', '32': '강원', '33': '충북', '34': '충남', '35': '전북', '36': '광주·전남', '37': '경북', '38': '경남', '39': '제주'}

def unit_of(code, name):
    g = PROV[code[:2]]
    if g == '세종': return g, '세종'
    if code == '37310': return '대구', '군위군'          # 2023년 대구 편입
    if code == '33310': return g, '청주시'              # 2014년 청주·청원 통합
    if g == '인천':
        if name in ('중구', '동구'): return g, '중구·동구'   # 2026년 제물포구·영종구로 개편
        if name == '남구': return g, '미추홀구'
        return g, name                                    # 서구 = 서해구·검단구
    if code[:2] == '24': return g, '광주 ' + name
    m = re.match(r'^(\S+?시)(\S+구)$', name)
    return g, (m.group(1) if m else name)

feats = json.load(open(SRC))['features']
units = {}
for f in feats:
    p = f['properties']; g, u = unit_of(p['code'], p['name'])
    units.setdefault((g, u), []).append(shape(f['geometry']).buffer(0))
units = {k: unary_union(v) for k, v in units.items()}

LAT0 = 36.0; K = 100.0; CO = math.cos(math.radians(LAT0))
allg = unary_union(list(units.values()))
minx, miny, maxx, maxy = allg.bounds
def xy(lon, lat): return ((lon - minx) * CO * K, (maxy - lat) * K)
W, H = xy(maxx, miny)

def parts(geom):
    return list(geom.geoms) if isinstance(geom, MultiPolygon) else [geom]

def path(geom, tol, keep=0.03, minarea=0.0004):
    geom = geom.simplify(tol, preserve_topology=True)
    ps = [p for p in parts(geom) if not p.is_empty]
    if not ps: return ''
    big = max(p.area for p in ps)
    out = []
    for p in ps:
        if p is not ps[0] and p.area < big * keep and p.area < minarea and p.area != big: continue
        for ring in [p.exterior]:
            pts = [xy(x, y) for x, y in ring.coords]
            s = 'M' + 'L'.join(f'{a:.1f} {b:.1f}' for a, b in pts[:-1]) + 'Z'
            out.append(s)
    return ''.join(out)

def bbox(geom):
    a, b, c, d = geom.bounds; x1, y1 = xy(a, d); x2, y2 = xy(c, b)
    return [round(x1, 1), round(y1, 1), round(x2 - x1, 1), round(y2 - y1, 1)]

def center(geom):
    pt = geom.representative_point() if not isinstance(geom, MultiPolygon) else max(parts(geom), key=lambda p: p.area).representative_point()
    x, y = xy(pt.x, pt.y); return [round(x, 1), round(y, 1)]

groups = {}
for (g, u), geom in units.items(): groups.setdefault(g, []).append(geom)
G = []
for g, gs in groups.items():
    gg = unary_union(gs)
    G.append([g, path(gg, 0.006, minarea=0.002), center(gg), bbox(gg)])
U = [[g, u, path(geom, 0.0025), center(geom), bbox(geom)[2:]] for (g, u), geom in sorted(units.items())]
json.dump({'W': round(W, 1), 'H': round(H, 1), 'src': '통계청 2013 시군구 경계(southkorea-maps) 가공', 'g': G, 'u': U},
          open(OUT, 'w'), ensure_ascii=False, separators=(',', ':'))
print(len(G), 'groups', len(U), 'units', round(W), 'x', round(H))
