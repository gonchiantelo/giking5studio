"""Motor de timeline de RAVIX Studio (puro, sin E/S, testeable).

Todos los tiempos son enteros en microsegundos (us) y están expresados en el
tiempo del archivo ORIGINAL. Nunca se usan floats para acumular tiempos.

Política de pausas (documentada también en la UI):
- La "pausa mínima" se mide ENTRE intervalos de voz detectados, ANTES de aplicar
  márgenes.
- Dentro de una pausa elegible se reservan los márgenes (después de la voz
  anterior y antes de la siguiente). Sobre lo que queda disponible se conserva
  la "pausa residual" (total, repartida mitad y mitad) y solo se propone cortar
  la parte central.
- Si los márgenes + residual ocupan todo el hueco, no se corta.
- Al inicio/fin del archivo el residual se conserva pegado a la voz.
"""
from __future__ import annotations

from typing import Dict, Iterable, List, Optional, Sequence, Tuple

US_PER_S = 1_000_000
Range = Tuple[int, int]

PROFILES: Dict[str, Dict[str, int]] = {
    "conservador": {
        "min_pause_us": 800_000,
        "pad_before_us": 180_000,
        "pad_after_us": 250_000,
        "residual_us": 200_000,
        "min_cut_us": 150_000,
        "min_clip_us": 500_000,
    },
    "equilibrado": {
        "min_pause_us": 600_000,
        "pad_before_us": 150_000,
        "pad_after_us": 200_000,
        "residual_us": 150_000,
        "min_cut_us": 120_000,
        "min_clip_us": 500_000,
    },
    "rapido": {
        "min_pause_us": 450_000,
        "pad_before_us": 120_000,
        "pad_after_us": 150_000,
        "residual_us": 100_000,
        "min_cut_us": 100_000,
        "min_clip_us": 500_000,
    },
}

# Si la propuesta elimina más de esta fracción, se exige revisión explícita.
MOSTLY_REMOVED_RATIO = 0.6


def normalize(ranges: Iterable[Range], duration_us: Optional[int] = None) -> List[Range]:
    """Ordena, recorta a [0, duración], descarta vacíos y fusiona solapamientos."""
    out: List[Range] = []
    for s, e in sorted((int(a), int(b)) for a, b in ranges):
        if duration_us is not None:
            s = max(0, min(s, duration_us))
            e = max(0, min(e, duration_us))
        else:
            s = max(0, s)
        if e <= s:
            continue
        if out and s <= out[-1][1]:
            out[-1] = (out[-1][0], max(out[-1][1], e))
        else:
            out.append((s, e))
    return out


def subtract(base: Sequence[Range], remove: Sequence[Range]) -> List[Range]:
    """base - remove (ambos se normalizan)."""
    base_n = normalize(base)
    rem_n = normalize(remove)
    out: List[Range] = []
    for s, e in base_n:
        cur = s
        for rs, re_ in rem_n:
            if re_ <= cur or rs >= e:
                continue
            if rs > cur:
                out.append((cur, rs))
            cur = max(cur, re_)
            if cur >= e:
                break
        if cur < e:
            out.append((cur, e))
    return out


def complement(ranges: Sequence[Range], duration_us: int) -> List[Range]:
    return subtract([(0, duration_us)], ranges)


def total(ranges: Sequence[Range]) -> int:
    return sum(e - s for s, e in ranges)


def propose_cuts(
    speech: Sequence[Range],
    duration_us: int,
    params: Dict[str, int],
    protected: Sequence[Range] = (),
) -> List[Dict]:
    """Convierte intervalos de voz en propuestas de recorte de pausas.

    Devuelve una lista de dicts {start_us, end_us, gap_start_us, gap_end_us}.
    No devuelve nada si no hay voz (se conserva todo).
    """
    if duration_us <= 0:
        return []
    sp = normalize(speech, duration_us)
    if not sp:
        return []

    min_pause = params["min_pause_us"]
    pad_b = params["pad_before_us"]
    pad_a = params["pad_after_us"]
    residual = params["residual_us"]
    min_cut = params["min_cut_us"]

    gaps: List[Tuple[int, int, bool, bool]] = []  # (s, e, hay_voz_antes, hay_voz_despues)
    prev_end = 0
    for i, (s, e) in enumerate(sp):
        if s > prev_end:
            gaps.append((prev_end, s, i > 0, True))
        prev_end = e
    if prev_end < duration_us:
        gaps.append((prev_end, duration_us, True, False))

    proposals: List[Dict] = []
    for gs, ge, voice_before, voice_after in gaps:
        if ge - gs < min_pause:
            continue
        avail_s = gs + (pad_a if voice_before else 0)
        avail_e = ge - (pad_b if voice_after else 0)
        if avail_e - avail_s <= residual:
            continue
        if voice_before and voice_after:
            half = residual // 2
            cs, ce = avail_s + half, avail_e - (residual - half)
        elif voice_after:  # hueco inicial: residual pegado a la voz siguiente
            cs, ce = avail_s, avail_e - residual
        else:  # hueco final: residual pegado a la voz anterior
            cs, ce = avail_s + residual, avail_e
        if ce - cs < min_cut:
            continue
        for ps, pe in subtract([(cs, ce)], protected):
            if pe - ps >= min_cut:
                proposals.append(
                    {"start_us": ps, "end_us": pe, "gap_start_us": gs, "gap_end_us": ge}
                )
    return proposals


def removed_ranges(timeline: Dict) -> List[Range]:
    """Rangos efectivamente eliminados: cortes manuales + propuestas aceptadas,
    menos intervalos protegidos (la protección siempre gana)."""
    duration = int(timeline.get("duration_us") or 0)
    cuts: List[Range] = [(c["start_us"], c["end_us"]) for c in timeline.get("manual_cuts", [])]
    cuts += [
        (p["start_us"], p["end_us"])
        for p in timeline.get("proposals", [])
        if p.get("decision") == "accepted"
    ]
    prot = [(p["start_us"], p["end_us"]) for p in timeline.get("protected", [])]
    return subtract(normalize(cuts, duration), prot)


def keep_ranges(timeline: Dict) -> List[Range]:
    duration = int(timeline.get("duration_us") or 0)
    return complement(removed_ranges(timeline), duration)


def source_to_project(t_us: int, keeps: Sequence[Range]) -> Optional[int]:
    """Mapea tiempo del original -> tiempo del proyecto. None si cae en un corte."""
    acc = 0
    for s, e in keeps:
        if s <= t_us < e:
            return acc + (t_us - s)
        acc += e - s
    if keeps and t_us == keeps[-1][1]:
        return acc
    return None


def project_to_source(t_us: int, keeps: Sequence[Range]) -> Optional[int]:
    acc = 0
    for s, e in keeps:
        length = e - s
        if t_us < acc + length:
            return s + (t_us - acc)
        acc += length
    if keeps and t_us == acc:
        return keeps[-1][1]
    return None


def summary(timeline: Dict) -> Dict:
    duration = int(timeline.get("duration_us") or 0)
    keeps = keep_ranges(timeline)
    final = total(keeps)
    short = [k for k in keeps if (k[1] - k[0]) < PROFILES["conservador"]["min_clip_us"]]
    return {
        "original_us": duration,
        "final_us": final,
        "removed_us": duration - final,
        "segments": len(keeps),
        "short_segments": len(short),
    }


def validate(timeline: Dict) -> List[str]:
    """Errores estructurales que impedirían un render correcto."""
    errors: List[str] = []
    duration = int(timeline.get("duration_us") or 0)
    if duration <= 0:
        errors.append("Duración del proyecto inválida.")
    for key in ("manual_cuts", "proposals", "protected"):
        for item in timeline.get(key, []):
            s, e = int(item["start_us"]), int(item["end_us"])
            if e <= s:
                errors.append(f"{key}: rango con duración nula o negativa ({s}–{e}).")
            if s < 0 or e > duration:
                errors.append(f"{key}: rango fuera del medio ({s}–{e}).")
    if duration > 0 and not keep_ranges(timeline):
        errors.append("La edición elimina todo el video.")
    return errors
