"""
Kaidora S.L. — generador de datos simulados para la Actividad 1 de SIG.

Genera un conjunto de datos coherente entre los cuatro niveles de sistemas de
información (TPS -> MIS -> DSS -> ESS) para una empresa ficticia que diseña,
monta y vende kits de primeros auxilios desde Valencia.

- Semilla fija (2026): los datos son reproducibles.
- Periodo: enero 2022 - septiembre 2026 (fecha de corte: 30/09/2026).
- Mercado: solo España, con desglose por comunidad autónoma.
- Escenario: crecimiento sano (~15 % anual), presupuesto cumplido con desviaciones puntuales.
- Salida: kaidora_datos.json (lo consume el dashboard) y csv/*.csv (anexo).

Todos los datos son SIMULADOS con fines académicos.

Uso:  python generar_datos.py
"""
import csv
import json
import os
import random

random.seed(2026)
HERE = os.path.dirname(os.path.abspath(__file__))

# ---------------------------------------------------------------- calendario
YEARS = (2022, 2023, 2024, 2025, 2026)
MONTHS = [(y, m) for y in YEARS for m in range(1, 13) if not (y == 2026 and m > 9)]
MK = [f"{y}-{m:02d}" for y, m in MONTHS]
T_LAST = len(MONTHS) - 1


def lerp(a, b, t):
    return a + (b - a) * t


def noise(s=0.05):
    return random.lognormvariate(0, s)


# ---------------------------------------------------------------- dimensiones
CHANNELS = [
    # id, nombre, corto, comisión/coste del canal (% ventas), tasa devolución, factor precio, logística €/ud, uds/pedido
    dict(id="web", nombre="Tienda online kaidora.es", corto="Web propia", fee=0.11, ret=0.026, price=1.00, log=3.9, upo=1.35),
    dict(id="amz", nombre="Amazon.es", corto="Amazon", fee=0.27, ret=0.036, price=0.97, log=0.0, upo=1.15),
    dict(id="b2b", nombre="Empresas (venta directa B2B)", corto="Empresas B2B", fee=0.05, ret=0.008, price=0.86, log=1.2, upo=16.0),
    dict(id="far", nombre="Farmacias", corto="Farmacias", fee=0.04, ret=0.011, price=0.63, log=0.9, upo=11.0),
    dict(id="dis", nombre="Distribuidores y comercios", corto="Distribuidores", fee=0.03, ret=0.015, price=0.56, log=0.6, upo=38.0),
]

LINES = [
    dict(id="emp", nombre="Empresa y oficina", pvp=59.0, cost=21.5),
    dict(id="veh", nombre="Vehículo", pvp=22.0, cost=7.9),
    dict(id="inf", nombre="Infantil", pvp=29.0, cost=10.6),
    dict(id="fam", nombre="Familia y hogar", pvp=39.0, cost=14.2),
    dict(id="via", nombre="Viaje", pvp=19.0, cost=6.8),
    dict(id="dep", nombre="Deporte y outdoor", pvp=27.0, cost=9.7),
    dict(id="dia", nombre="Diabetes", pvp=42.0, cost=16.8),
    dict(id="per", nombre="Personalizados", pvp=78.0, cost=30.0),
]

REGIONS = [
    dict(id="MAD", nombre="Madrid"),
    dict(id="CAT", nombre="Cataluña"),
    dict(id="AND", nombre="Andalucía"),
    dict(id="VAL", nombre="C. Valenciana"),
    dict(id="PVA", nombre="País Vasco"),
    dict(id="GAL", nombre="Galicia"),
    dict(id="CYL", nombre="Castilla y León"),
    # «Resto de España» se reparte después entre las demás comunidades (índices 7..17)
    dict(id="ARA", nombre="Aragón"),
    dict(id="AST", nombre="Asturias"),
    dict(id="BAL", nombre="Illes Balears"),
    dict(id="CAN", nombre="Canarias"),
    dict(id="CNT", nombre="Cantabria"),
    dict(id="CLM", nombre="Castilla-La Mancha"),
    dict(id="EXT", nombre="Extremadura"),
    dict(id="MUR", nombre="Región de Murcia"),
    dict(id="NAV", nombre="Navarra"),
    dict(id="RIO", nombre="La Rioja"),
    dict(id="CYM", nombre="Ceuta y Melilla"),
]
RES_W = [2.8, 2.1, 2.6, 4.6, 1.2, 4.4, 2.2, 3.2, 1.4, 0.7, 0.35]   # peso poblacional aproximado (%)
rr = random.Random(77)   # generador aparte: no altera el resto de la simulación
REG_SPLIT = {
    "base": [.150, .165, .175, .110, .047, .055, .050, .248],
    "web": [.172, .172, .160, .118, .050, .050, .046, .232],
    "amz": [.170, .175, .165, .105, .050, .052, .048, .235],
    "b2b": [.220, .150, .090, .240, .060, .040, .040, .160],
    "dis": [.120, .140, .180, .160, .050, .060, .060, .230],
}

NAVES = [
    dict(id="PAT", nombre="Nave Paterna"),
    dict(id="RIB", nombre="Nave Riba-roja"),
]

SEASON = {
    "emp": [1.45, 1.15, 1.00, 0.95, 0.90, 0.85, 0.75, 0.60, 1.10, 1.05, 0.95, 1.25],
    "veh": [0.80, 0.80, 0.90, 1.00, 1.00, 1.25, 1.45, 1.30, 0.90, 0.85, 1.00, 0.75],
    "inf": [0.80, 0.80, 0.90, 0.90, 0.95, 1.00, 1.00, 1.05, 1.35, 0.95, 1.10, 1.20],
    "fam": [0.95, 0.85, 0.90, 0.90, 0.90, 0.90, 0.90, 0.85, 0.95, 1.00, 1.35, 1.55],
    "via": [0.60, 0.60, 0.85, 1.10, 1.10, 1.45, 1.60, 1.30, 0.85, 0.75, 0.80, 0.95],
    "dep": [0.70, 0.75, 0.95, 1.15, 1.25, 1.35, 1.30, 1.10, 1.00, 0.85, 0.80, 0.80],
    "dia": [1.00, 0.95, 1.00, 1.00, 1.00, 1.00, 0.95, 0.90, 1.00, 1.05, 1.12, 1.05],
    "per": [1.30, 1.10, 1.00, 1.00, 0.95, 0.90, 0.70, 0.60, 1.10, 1.10, 1.10, 1.05],
}
for k, v in SEASON.items():
    mu = sum(v) / 12
    SEASON[k] = [x / mu for x in v]

EVENTS = {
    "amz": {7: 1.20, 10: 1.12, 11: 1.35, 12: 1.15},
    "web": {11: 1.30, 12: 1.10},
    "b2b": {},
    "far": {6: 1.10, 7: 1.10},
    "dis": {6: 1.15, 7: 1.15, 8: 1.12},
}
PROMO = {("amz", 11): 0.12, ("web", 11): 0.12, ("amz", 7): 0.08}

AFF = {
    "web": dict(emp=.10, veh=.12, inf=.14, fam=.20, via=.10, dep=.12, dia=.12, per=.10),
    "amz": dict(emp=.08, veh=.20, inf=.14, fam=.20, via=.14, dep=.16, dia=.08, per=0),
    "b2b": dict(emp=.62, veh=.12, inf=0, fam=.02, via=.02, dep=.04, dia=0, per=.18),
    "far": dict(emp=0, veh=.06, inf=.22, fam=.22, via=.16, dep=.06, dia=.28, per=0),
    "dis": dict(emp=.06, veh=.34, inf=.06, fam=.12, via=.14, dep=.28, dia=0, per=0),
}
# cuota de cada canal: ene-2022 -> sep-2026 (diversificación hacia empresas)
SHARE0 = dict(web=.16, amz=.46, b2b=.14, far=.14, dis=.10)
SHARE1 = dict(web=.17, amz=.36, b2b=.24, far=.13, dis=.10)


def line_factor(line, y, m, t):
    f = 1.0
    if line == "dia":  # lanzamiento de la línea Diabetes en marzo de 2023
        if (y, m) < (2023, 3):
            return 0.0
        k = MK.index("2023-03")
        f *= min(1.0, 0.3 + 0.12 * (t - k))
        if (y, m) == (2026, 3):
            f *= 0.62   # rotura de stock de tabletas de glucosa (proveedor)
        if (y, m) == (2026, 4):
            f *= 0.86
    if line == "per":  # los kits a medida crecen con el equipo B2B
        f *= min(1.25, lerp(.45, 1.25, t / T_LAST))
    return f


def channel_factor(ch, y, m):
    f = EVENTS[ch].get(m, 1.0)
    if ch == "web" and (y, m) in ((2026, 5), (2026, 6)):
        f *= 0.9    # incidencia tras el cambio de pasarela de pago
    return f


# ---------------------------------------------------------------- hechos de venta
raw = {}
for t, (y, m) in enumerate(MONTHS):
    trend = 1.155 ** (t / 12)
    for ci, ch in enumerate(CHANNELS):
        cid = ch["id"]
        share = lerp(SHARE0[cid], SHARE1[cid], t / T_LAST)
        aff = AFF[cid]
        tot_aff = sum(aff.values())
        split = REG_SPLIT.get(cid, REG_SPLIT["base"])
        for li, ln in enumerate(LINES):
            a = aff[ln["id"]]
            if a <= 0:
                continue
            base = trend * share * (a / tot_aff) * SEASON[ln["id"]][m - 1]
            base *= line_factor(ln["id"], y, m, t) * channel_factor(cid, y, m) * noise(0.06)
            if base <= 0:
                continue
            for ri, s in enumerate(split):
                raw[(t, ci, li, ri)] = base * s * noise(0.05)

TARGET = {2022: 12_000_000, 2023: 13_800_000, 2024: 15_900_000, 2025: 18_200_000, 2026: 15_400_000}  # 2026 = ene-sep
for yr, tgt in TARGET.items():
    keys = [k for k in raw if MONTHS[k[0]][0] == yr]
    s = sum(raw[k] for k in keys)
    for k in keys:
        raw[k] *= tgt / s

COST_INFL = {2022: 0.96, 2023: 0.98, 2024: 1.0, 2025: 1.035, 2026: 1.06}
facts = []  # [mes, canal, línea, región, uds, ventas €, uds devueltas]
for (t, ci, li, ri), rev in sorted(raw.items()):
    y, m = MONTHS[t]
    ch, ln = CHANNELS[ci], LINES[li]
    disc = PROMO.get((ch["id"], m), 0.0)
    unit_price = ln["pvp"] * ch["price"] * (1 - disc) * (0.97 if y <= 2023 else 1.0)
    rnoise = noise(0.15)
    if ri < 7:
        units = max(1, round(rev / unit_price))
        facts.append([t, ci, li, ri, units, round(units * unit_price), round(units * ch["ret"] * rnoise)])
        continue
    w = [x * rr.lognormvariate(0, 0.08) for x in RES_W]
    for k, wk in enumerate(w):
        part = rev * wk / sum(w)
        units = round(part / unit_price)
        if units < 1:
            continue
        facts.append([t, ci, li, 7 + k, units, round(units * unit_price), round(units * ch["ret"] * rr.lognormvariate(0, 0.15))])

# ---------------------------------------------------------------- presupuesto (por canal y mes)
act = {}
for f in facts:
    act[(f[0], f[1])] = act.get((f[0], f[1]), 0) + f[5]
budget = []
for t, (y, m) in enumerate(MONTHS):
    for ci, ch in enumerate(CHANNELS):
        if y == 2022:
            b = act[(t, ci)] * noise(0.03) * 0.99
        else:
            prev = act[(t - 12, ci)]
            tweak = {"b2b": 1.04, "amz": 0.97, "web": 1.03}.get(ch["id"], 1.0) if y == 2026 else 1.0
            b = prev * 1.145 * tweak * noise(0.01)
        budget.append([t, ci, round(b)])

# ---------------------------------------------------------------- producción (montaje) por nave
BUILD = [0.95, 1.0, 1.02, 1.0, 1.05, 1.08, 1.0, 0.95, 1.12, 1.15, 1.05, 0.85]
sold = {}
for f in facts:
    sold[(f[0], f[2])] = sold.get((f[0], f[2]), 0) + f[4] - f[6]
T_RIB = MK.index("2024-07")
T_SEMI = MK.index("2025-10")
production = []   # [mes, nave, línea, uds montadas]
oee = []          # [mes, nave, disponibilidad, rendimiento, calidad, horas, kWh/kit, % renovable]
for t, (y, m) in enumerate(MONTHS):
    rib_open = t >= T_RIB
    for li, ln in enumerate(LINES):
        u = sold.get((t, li), 0) * BUILD[m - 1] * noise(0.02)
        if u <= 0:
            continue
        rib_share = {"per": 1.0, "emp": 0.6, "veh": 0.3}.get(ln["id"], 0.0) if rib_open else 0.0
        pu, ru = round(u * (1 - rib_share)), round(u * rib_share)
        if pu:
            production.append([t, 0, li, pu])
        if ru:
            production.append([t, 1, li, ru])
    for ni in (0, 1):
        units = sum(p[3] for p in production if p[0] == t and p[1] == ni)
        if units == 0:
            continue
        if ni == 0:
            A = 0.885 + 0.025 * (t / T_LAST) + random.uniform(-.01, .01)
            P = 0.850 + 0.035 * (t / T_LAST) + random.uniform(-.012, .012)
            Q = 0.982 + 0.004 * (t / T_LAST) + random.uniform(-.003, .003)
            kph = 5.9 + 0.7 * (t / T_LAST)
            kwh = lerp(0.23, 0.178, t / T_LAST)
            ren = 0.0 if (y, m) < (2025, 4) else 0.38
        else:
            k = t - T_RIB
            if t >= T_SEMI:
                j = t - T_SEMI
                A = min(0.915, 0.88 + 0.006 * j) + random.uniform(-.008, .008)
                P = min(0.905, 0.84 + 0.009 * j) + random.uniform(-.01, .01)
                Q = 0.989 + random.uniform(-.003, .003)
                kph = 7.8
            else:
                A = min(0.88, 0.80 + 0.006 * k) + random.uniform(-.01, .01)
                P = min(0.83, 0.76 + 0.005 * k) + random.uniform(-.012, .012)
                Q = 0.968 + 0.001 * k + random.uniform(-.003, .003)
                kph = 5.1 + 0.03 * k
            kwh = lerp(0.25, 0.19, (t - T_RIB) / (T_LAST - T_RIB))
            ren = 0.0 if (y, m) < (2026, 1) else 0.22
        oee.append([t, ni, round(A, 4), round(P, 4), round(min(Q, 0.995), 4), round(units / kph), round(kwh, 3), ren])

# ---------------------------------------------------------------- operaciones (mensual)
ops = []  # [mes, % envase reciclado, % pedidos electrónicos, accidentes con baja, OTIF clientes, plazo entrega (h)]
T_EDI = MK.index("2025-02")
for t, (y, m) in enumerate(MONTHS):
    rec = lerp(0.32, 0.83, t / T_LAST) + random.uniform(-.01, .01)
    edi = lerp(0.86, 0.905, t / T_EDI) if t < T_EDI else min(0.98, 0.968 + 0.004 * min(1, (t - T_EDI) / 19))
    acc = random.choice([0, 0, 0, 1, 0, 0, 1, 0]) if t < 40 else random.choice([0, 0, 0, 0, 1, 0])
    otif = 0.925 + 0.03 * (t / T_LAST) + random.uniform(-.01, .008)
    if (y, m) == (2026, 3):
        otif -= 0.03
    lead = round(lerp(34, 24, t / T_LAST) + random.uniform(-1.5, 1.5), 1)
    ops.append([t, round(rec, 3), round(edi, 3), acc, round(otif, 3), lead])

# ---------------------------------------------------------------- personas (plantilla a 30/09/2026)
DEPTS = [
    ("dir", "Dirección general", 5, None, "PAT", []),
    ("mon", "Producción y montaje", 58, 0.60, "PAT", [("op", "Operario/a de montaje", 21800), ("tec", "Técnico/a de calidad", 29500), ("mi", "Jefe/a de turno", 33500)]),
    ("log", "Logística y almacén", 28, 0.25, "RIB", [("op", "Mozo/a de almacén", 22300), ("op", "Carretillero/a", 24100), ("mi", "Jefe/a de almacén", 36000)]),
    ("com", "Compras y proveedores", 6, 0.50, "PAT", [("tec", "Técnico/a de compras", 31000), ("mi", "Responsable de compras", 47000)]),
    ("b2b", "Comercial B2B y farmacia", 14, 0.50, "PAT", [("tec", "Comercial", 31500), ("mi", "Key account manager", 45000)]),
    ("eco", "E-commerce y marketing", 12, 0.58, "PAT", [("tec", "Especialista e-commerce", 32500), ("tec", "Diseño y contenidos", 29500), ("mi", "Responsable de marketplaces", 48000)]),
    ("sac", "Atención al cliente", 10, 0.70, "PAT", [("op", "Agente de atención al cliente", 21900), ("mi", "Coordinador/a de atención", 32000)]),
    ("fin", "Finanzas y administración", 7, 0.57, "PAT", [("tec", "Técnico/a contable", 30500), ("mi", "Responsable de control de gestión", 52000)]),
    ("rrhh", "Personas (RR. HH.)", 4, 0.75, "PAT", [("tec", "Técnico/a de RR. HH.", 30000), ("mi", "Responsable de personas", 50000)]),
    ("it", "Sistemas y datos", 6, 0.17, "PAT", [("tec", "Analista de datos", 37500), ("tec", "Técnico/a de sistemas", 35000), ("mi", "Responsable de sistemas", 56000)]),
]
LEVEL_NAMES = {"dir": "Dirección", "mi": "Mando intermedio", "tec": "Técnico/a y especialista", "op": "Personal operativo"}
emps = []
eid = 1


def age_for(dept, level):
    if level == "dir":
        return random.randint(41, 58)
    if level == "mi":
        return random.randint(33, 59)
    if dept in ("mon", "log", "sac"):
        r = random.random()
        if r < 0.13:
            return random.randint(19, 24)
        if r < 0.85:
            return random.randint(25, 54)
        return random.randint(55, 63)
    return random.randint(24, 58)


for puesto, g, sal, age in [("CEO · Director general", "H", 112000, 52), ("CFO · Directora financiera", "M", 96000, 47),
                            ("COO · Director de operaciones", "H", 94000, 50), ("CCO · Director comercial", "H", 92000, 45),
                            ("CPO · Directora de personas", "M", 86000, 44)]:
    emps.append(dict(id=f"E{eid:03d}", dep="dir", nivel="dir", puesto=puesto, genero=g, edad=age, disc=False,
                     antig=random.randint(5, 7), jornada="Completa", contrato="Indefinido", salario=sal,
                     formacion=random.randint(20, 40), sede="PAT"))
    eid += 1

mi_women = dict(mon=2, log=0, com=1, b2b=0, eco=1, sac=1, fin=0, rrhh=1, it=0)
for dep, dname, n, pw, sede, roles in DEPTS[1:]:
    mi_roles = [r for r in roles if r[0] == "mi"]
    other = [r for r in roles if r[0] != "mi"]
    n_mi = {"mon": 6, "log": 3}.get(dep, 1)
    slots = [mi_roles[0]] * n_mi
    if dep == "mon":
        slots += [other[1]] * 4 + [other[0]] * (n - n_mi - 4)
    else:
        for i in range(n - n_mi):
            slots.append(other[i % len(other)] if dep != "log" else (other[0] if i % 5 else other[1]))
    for (lvl, puesto, base) in slots:
        if lvl == "mi":
            g = "M" if mi_women.get(dep, 0) > 0 else "H"
            if g == "M":
                mi_women[dep] -= 1
        else:
            p_w = 0.12 if (dep == "log" and puesto == "Carretillero/a") else pw
            g = "M" if random.random() < p_w else "H"
        age = age_for(dep, lvl)
        sal = base * noise(0.035)
        if dep == "log" and g == "H" and random.random() < 0.6:
            sal *= 1.09
        if dep == "b2b":
            sal *= 1.12 if g == "H" else 1.05
        if g == "M":
            sal *= 0.975
        jornada = "Parcial" if (g == "M" and random.random() < 0.16) or (g == "H" and random.random() < 0.05) else "Completa"
        if jornada == "Parcial":
            sal *= 0.75
        antig = max(0, min(age - 18, random.choice([0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 6, 7])))
        emps.append(dict(id=f"E{eid:03d}", dep=dep, nivel=lvl, puesto=puesto, genero=g, edad=age, disc=False,
                         antig=antig, jornada=jornada,
                         contrato="Temporal" if (lvl == "op" and random.random() < 0.14) else "Indefinido",
                         salario=round(sal / 50) * 50, formacion=0, sede=sede))
        eid += 1

for e in random.sample([e for e in emps if e["nivel"] in ("op", "tec")], 2):
    e["genero"] = "X"
disc_ids = [e["id"] for e in random.sample([e for e in emps if e["dep"] == "mon" and e["nivel"] == "op"], 2)]
disc_ids += [e["id"] for e in random.sample([e for e in emps if e["dep"] == "sac"], 1)]
disc_ids += [e["id"] for e in random.sample([e for e in emps if e["dep"] == "it"], 1)]
for e in emps:
    e["disc"] = e["id"] in disc_ids
for e in emps:
    if e["formacion"]:
        continue
    base = {"op": 18, "tec": 30, "mi": 34}[e["nivel"]]
    if e["edad"] >= 55:
        base *= 0.55
    elif e["edad"] < 30:
        base *= 1.15
    e["formacion"] = max(4, round(base * noise(0.25)))
assert len(emps) == 150, len(emps)

hr = []  # [mes, plantilla, % absentismo, % rotación voluntaria, horas formación, % mujeres en mandos]
for t, (y, m) in enumerate(MONTHS):
    head = round(lerp(104, 150, (t / T_LAST) ** 0.95))
    ab = 0.043 + (0.009 if m in (1, 2) else 0) + (-0.006 if m == 8 else 0) + random.uniform(-.004, .004)
    rot = 0.011 + random.uniform(-.004, .006)
    form = round(head * random.uniform(1.6, 2.6))
    wm = lerp(0.24, 0.381, t / T_LAST)
    hr.append([t, head, round(ab, 4), round(rot, 4), form, round(wm, 3)])

# ---------------------------------------------------------------- proveedores y componentes
SUPPLIERS = [
    dict(id="S01", nombre="Textil Sanitario Levante", ciudad="Alzira (Valencia)", cat="Gasas y vendas", lead=5, otif=.97, local=True, cee=False),
    dict(id="S02", nombre="MediPlast Iberia", ciudad="Barcelona", cat="Apósitos y esparadrapo", lead=7, otif=.95, local=False, cee=False),
    dict(id="S03", nombre="Nitrilo Global Supply", ciudad="Kuala Lumpur (Malasia)", cat="Guantes de nitrilo", lead=45, otif=.86, local=False, cee=False),
    dict(id="S04", nombre="Laboratorios Aqualis", ciudad="Murcia", cat="Suero y antisépticos", lead=8, otif=.96, local=False, cee=False),
    dict(id="S05", nombre="Termoprotect", ciudad="Braga (Portugal)", cat="Mantas y frío instantáneo", lead=10, otif=.93, local=False, cee=False),
    dict(id="S06", nombre="GlucoCare Europe", ciudad="Colonia (Alemania)", cat="Tabletas de glucosa", lead=14, otif=.84, local=False, cee=False),
    dict(id="S07", nombre="EcoPack Valencia", ciudad="Quart de Poblet (Valencia)", cat="Cajas de cartón reciclado", lead=4, otif=.98, local=True, cee=False),
    dict(id="S08", nombre="Shenzhen EVA Cases", ciudad="Shenzhen (China)", cat="Estuches rígidos EVA", lead=60, otif=.81, local=False, cee=False),
    dict(id="S09", nombre="CEE Manipulats Horta Nord", ciudad="Burjassot (Valencia)", cat="Manipulado y etiquetado", lead=3, otif=.99, local=True, cee=True),
    dict(id="S10", nombre="Instrumental Médico Ebro", ciudad="Zaragoza", cat="Tijeras, pinzas y termómetros", lead=9, otif=.94, local=False, cee=False),
    dict(id="S11", nombre="Gràfiques Túria", ciudad="Valencia", cat="Folletos y etiquetas", lead=4, otif=.97, local=True, cee=False),
    dict(id="S12", nombre="RCP Safe", ciudad="Lyon (Francia)", cat="Mascarillas RCP", lead=12, otif=.92, local=False, cee=False),
]
SPEND_W = dict(S01=.16, S02=.14, S03=.09, S04=.08, S05=.07, S06=.07, S07=.12, S08=.08, S09=.045, S10=.06, S11=.035, S12=.03)
cogs26 = sum(f[4] * LINES[f[2]]["cost"] * COST_INFL[2026] for f in facts if MONTHS[f[0]][0] == 2026) * 0.72
for s in SUPPLIERS:
    s["gasto_2026"] = round(cogs26 * SPEND_W[s["id"]] / sum(SPEND_W.values()), -2)
    s["incidencias_2026"] = max(0, round((1 - s["otif"]) * 40 * noise(0.2)))

COMPONENTS = [
    ("C01", "Gasa estéril 10×10 cm", "S01", 48200, 3900, 31000, 15600, "GS-2608-14", "2030-08", True),
    ("C02", "Venda elástica 5 m", "S01", 16900, 1500, 11000, 6000, "VE-2607-02", "2031-07", True),
    ("C03", "Apósitos adhesivos surtidos", "S02", 91500, 8200, 57000, 32800, "AP-2609-21", "2029-09", True),
    ("C04", "Esparadrapo hipoalérgico", "S02", 9800, 900, 6300, 3600, "ES-2605-11", "2029-05", True),
    ("C05", "Guantes de nitrilo M", "S03", 11800, 2700, 14000, 8100, "GN-2604-88", "2029-04", True),
    ("C06", "Suero fisiológico 5 ml", "S04", 38400, 3100, 22000, 12400, "SF-2601-07", "2027-01", True),
    ("C07", "Toallita de clorhexidina", "S04", 27200, 2900, 20000, 11600, "CL-2607-19", "2028-07", True),
    ("C08", "Manta isotérmica", "S05", 7900, 950, 6200, 3800, "MI-2606-04", "2034-06", False),
    ("C09", "Compresa de frío instantáneo", "S05", 5200, 520, 3900, 2100, "CF-2608-01", "2028-08", False),
    ("C10", "Tabletas de glucosa 4 g", "S06", 2100, 310, 3300, 1250, "TG-2607-30", "2027-11", False),
    ("C11", "Estuche isotérmico insulina", "S06", 2600, 170, 1900, 700, "EI-2605-12", "—", False),
    ("C12", "Caja de cartón reciclado", "S07", 21400, 1700, 12000, 6800, "CX-2609-26", "—", False),
    ("C13", "Estuche rígido EVA", "S08", 1150, 420, 5600, 3400, "EV-2603-01", "—", False),
    ("C14", "Tijeras de punta roma", "S10", 12600, 1450, 9500, 5800, "TJ-2606-15", "—", True),
    ("C15", "Termómetro digital", "S10", 4100, 330, 2600, 1300, "TD-2604-09", "—", True),
    ("C16", "Mascarilla RCP", "S12", 6800, 690, 4800, 2800, "RC-2605-23", "2031-05", True),
    ("C17", "Folleto de primeros auxilios", "S11", 30400, 2800, 17000, 11200, "FL-2609-02", "—", False),
]
components = [dict(id=c[0], nombre=c[1], prov=c[2], stock=c[3], consumo=c[4], rop=c[5], ss=c[6], lote=c[7], cad=c[8], sanitario=c[9]) for c in COMPONENTS]

# ---------------------------------------------------------------- clientes (para indicadores de inclusión del ESS)
customers = dict(
    bandas=["18-24", "25-34", "35-44", "45-54", "55-64", "65+"],
    poblacion=[0.085, 0.130, 0.165, 0.190, 0.170, 0.260],
    compradores=[0.070, 0.205, 0.290, 0.225, 0.130, 0.080],
    nps=[48, 55, 58, 54, 44, 31],
    auditoria_web=[["2024-T4", 61], ["2025-T2", 68], ["2025-T4", 74], ["2026-T2", 79]],
    objetivo_web=95,
    valoracion_amazon=4.6,
    resenas_amazon=12480,
    clientes_b2b=[[2022, 270], [2023, 330], [2024, 410], [2025, 575], [2026, 690]],
)

meta = dict(empresa="Kaidora S.L.", sede="Paterna (Valencia)", fundacion=2019, plantilla=150, corte="2026-09-30", semilla=2026,
            aviso="Datos simulados con fines académicos (Actividad 1 · SIG · Universidad Europea).")

data = dict(meta=meta, months=MK, channels=CHANNELS, lines=LINES, regions=REGIONS, naves=NAVES,
            facts=facts, budget=budget, production=production, oee=oee, ops=ops,
            employees=emps, levels=LEVEL_NAMES, hr=hr, suppliers=SUPPLIERS, components=components,
            customers=customers, cost_infl=COST_INFL)

with open(os.path.join(HERE, "kaidora_datos.json"), "w", encoding="utf-8") as fh:
    json.dump(data, fh, ensure_ascii=False, separators=(",", ":"))

# ---------------------------------------------------------------- anexos CSV
CSV = os.path.join(HERE, "csv")
os.makedirs(CSV, exist_ok=True)
for old in os.listdir(CSV):
    os.remove(os.path.join(CSV, old))


def wcsv(name, header, rows):
    with open(os.path.join(CSV, name), "w", newline="", encoding="utf-8-sig") as fh:
        w = csv.writer(fh, delimiter=";")
        w.writerow(header)
        w.writerows(rows)


wcsv("ventas_mensuales.csv", ["mes", "canal", "linea", "comunidad", "unidades", "ventas_eur", "uds_devueltas"],
     [[MK[f[0]], CHANNELS[f[1]]["corto"], LINES[f[2]]["nombre"], REGIONS[f[3]]["nombre"], *f[4:]] for f in facts])
wcsv("presupuesto_canal.csv", ["mes", "canal", "presupuesto_eur"], [[MK[b[0]], CHANNELS[b[1]]["corto"], b[2]] for b in budget])
wcsv("produccion.csv", ["mes", "nave", "linea", "uds_montadas"], [[MK[p[0]], NAVES[p[1]]["nombre"], LINES[p[2]]["nombre"], p[3]] for p in production])
wcsv("oee_naves.csv", ["mes", "nave", "disponibilidad", "rendimiento", "calidad", "horas", "kwh_por_kit", "pct_renovable"],
     [[MK[o[0]], NAVES[o[1]]["nombre"], *o[2:]] for o in oee])
wcsv("plantilla.csv", ["id", "departamento", "nivel", "puesto", "genero", "edad", "discapacidad", "antiguedad", "jornada", "contrato", "salario_bruto_anual", "horas_formacion_2026", "sede"],
     [[e["id"], e["dep"], LEVEL_NAMES[e["nivel"]], e["puesto"], e["genero"], e["edad"], "Sí" if e["disc"] else "No", e["antig"], e["jornada"], e["contrato"], e["salario"], e["formacion"], e["sede"]] for e in emps])
wcsv("proveedores.csv", ["id", "nombre", "ciudad", "categoria", "plazo_dias", "otif", "local", "centro_especial_empleo", "gasto_2026_eur", "incidencias_2026"],
     [[s["id"], s["nombre"], s["ciudad"], s["cat"], s["lead"], s["otif"], s["local"], s["cee"], s["gasto_2026"], s["incidencias_2026"]] for s in SUPPLIERS])
wcsv("componentes_stock.csv", ["id", "componente", "proveedor", "stock", "consumo_diario", "punto_pedido", "stock_seguridad", "lote", "caducidad", "producto_sanitario"],
     [[c["id"], c["nombre"], c["prov"], c["stock"], c["consumo"], c["rop"], c["ss"], c["lote"], c["cad"], c["sanitario"]] for c in components])

# ---------------------------------------------------------------- resumen de control
for yr in YEARS:
    rv = sum(f[5] for f in facts if MONTHS[f[0]][0] == yr)
    un = sum(f[4] for f in facts if MONTHS[f[0]][0] == yr)
    bd = sum(b[2] for b in budget if MONTHS[b[0]][0] == yr)
    print(yr, f"ventas {rv/1e6:.2f} M€ | presupuesto {bd/1e6:.2f} M€ ({(rv/bd-1)*100:+.1f} %) | uds {un:,}")
print("filas hechos:", len(facts), "| meses:", len(MK), "| empleados:", len(emps))
print("json KB:", round(os.path.getsize(os.path.join(HERE, "kaidora_datos.json")) / 1024))
