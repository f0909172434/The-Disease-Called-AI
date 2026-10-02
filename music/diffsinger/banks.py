"""
DiffSinger voicebanks: where they are, what phonemes they accept, how our ARPAbet maps
onto them, and who to credit.

Banks live in music/diffsinger/voicebanks/ (git-ignored; fetch_voicebanks.sh). A bank is
found by scanning for an OpenUtau DiffSinger root (dsconfig.yaml + character.txt/.yaml) whose
name matches the profile; its OpenUtau singer id is the folder path relative to
voicebanks/ (that is how OpenUtau names singers found on an additional singer path).

Everything bank-specific is read from the installed files: the acoustic and duration models'
phoneme lists (phonemes.txt / .json, with or without a language prefix such as "en/"), the
symbol types and word entries of dsdict(-en).yaml, the subbank (voice colour) names in
character.yaml. Our ARPAbet is mapped 1:1 onto that inventory with per-phoneme fallbacks
(ax -> ah, dx -> d, ...): never split or dropped, so two banks singing the same line stay
phoneme-aligned (the her->him morph depends on it).
"""
from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass, field
from functools import lru_cache

HERE = os.path.dirname(os.path.abspath(__file__))
VOICEBANKS = os.environ.get("DIFFSINGER_VOICEBANKS", os.path.join(HERE, "voicebanks"))

SUBMODEL_DIRS = {"Dependencies", "dsdur", "dspitch", "dsvariance", "dsvocoder", "dsmain"}

# ARPAbet -> candidates, tried in order (after the phoneme itself)
FALLBACKS = {
    "ax": ["ah", "eh"], "dx": ["d", "t"], "er": ["ah"], "ao": ["aa"], "hh": ["h"], "y": ["j", "i"],
    "q": ["cl"], "cl": ["q"], "zh": ["sh", "z"], "dh": ["d", "th"], "th": ["s", "f"], "ng": ["n"],
    "oy": ["ow"], "aw": ["aa"], "uh": ["uw"], "ih": ["iy"], "ae": ["eh", "aa"], "jh": ["ch", "zh"],
}


@dataclass
class Profile:
    """What we know about a bank before it is installed (for defaults, credits and tests)."""
    key: str
    pattern: str                       # regex on the bank's display name / folder
    display: str
    credit: str
    licence: str
    url: str
    family: str                        # "her" | "him"
    range_midi: tuple[float, float]    # comfortable sung range (score MIDI)
    color: str | None = None           # preferred voice colour (subbank), matched by substring
    phonemizer: str = "OpenUtau.Core.DiffSinger.DiffSingerEnglishPhonemizer"
    phoneme_map: dict = field(default_factory=dict)    # ARPAbet -> bank symbol, tried first


PROFILES = {
    "tiger": Profile(
        "tiger", r"tiger", "TIGER (DiffSinger) v106", "TIGER voicebank by tigermeat",
        "CC BY-NC-ND 4.0 + Commons Clause (non-commercial; no redistribution or derivatives "
        "of the models; character usage ToS)",
        "https://github.com/spicytigermeat/tiger_diffsinger", "him", (43.0, 69.0), color="fresh"),
    "hanami": Profile(
        "hanami", r"hanami", "Hoshino Hanami ~AI❤dol~ for DiffSinger v1.0",
        "Hoshino Hanami voicebank by Lotte V (Team L❤VE)",
        "Team L❤VE voicebank / character licences (lottev.moe); terms forbid re-uploading",
        "https://lottev.moe/2024/09/hoshino-hanami-ai%e2%9d%a4dol-for-diffsinger-v1-0-is-out/",
        "her", (55.0, 81.0), color="root",
        # her English data has no [dx] and only German [ax] (readme): use the English ones
        phoneme_map={"ax": "ah", "dx": "d"}),
}


@dataclass
class Bank:
    profile: Profile
    singer_id: str                     # OpenUtau singer id (path relative to voicebanks/)
    location: str
    name: str
    acoustic_phonemes: set[str]
    dur_phonemes: set[str] | None
    symbols: dict[str, str]            # dsdict symbol -> type (vowel, stop, ...)
    entries: dict[str, list[str]]      # dsdict word -> phonemes
    colors: list[str]                  # subbank colours as OpenUtau orders them (sorted)
    has_dur: bool
    has_pitch: bool
    has_variance: bool
    vocoder: str | None
    phonemizer: str
    extra_map: dict[str, str] = field(default_factory=dict)

    @property
    def key(self) -> str:
        return self.profile.key

    def accepts(self, ph: str, timed: bool) -> bool:
        if ph not in self.acoustic_phonemes:
            return False
        if timed:
            return True
        if self.dur_phonemes is not None and ph not in self.dur_phonemes:
            return False
        return not self.symbols or ph in self.symbols

    def map_phoneme(self, arpa: str, timed: bool = False) -> str:
        """Our ARPAbet phoneme -> this bank's symbol (1:1)."""
        cands = [self.extra_map.get(arpa, arpa)] + FALLBACKS.get(arpa, [])
        for c in cands:
            for name in (c, f"en/{c}"):
                if self.accepts(name, timed):
                    return name
        raise KeyError(f"{self.name}: no symbol for ARPAbet '{arpa}' (tried {cands})")

    def is_vowel(self, sym: str) -> bool:
        t = self.symbols.get(sym)
        if t is not None:
            return t == "vowel"
        from phonemes import ARPA_VOWELS
        return sym.split("/")[-1] in ARPA_VOWELS

    @property
    def color(self) -> str | None:
        """The voice colour to sing with: DIFFSINGER_COLOR_<KEY> (e.g. DIFFSINGER_COLOR_HANAMI=
        nectar) or the profile's default; matched as a substring of the subbank names."""
        return os.environ.get(f"DIFFSINGER_COLOR_{self.key.upper()}") or self.profile.color

    def color_index(self, want: str | None) -> int | None:
        """Index of the voice colour (CLR expression value) whose name contains `want`."""
        if not want or not self.colors:
            return None
        for i, c in enumerate(self.colors):
            if want.lower() in c.lower():
                return i
        return None

    def fingerprint(self) -> dict:
        """What identifies this bank's sound (for render caches)."""
        def stat(p):
            try:
                st = os.stat(p)
                return [st.st_size, int(st.st_mtime)]
            except OSError:
                return None
        cfg = _yaml(os.path.join(self.location, "dsconfig.yaml")) or {}
        return {"id": self.singer_id, "acoustic": stat(os.path.join(self.location, str(cfg.get("acoustic")))),
                "dsconfig": stat(os.path.join(self.location, "dsconfig.yaml")), "vocoder": self.vocoder,
                "color": self.color, "map": self.extra_map}


# ----------------------------------------------------------------------------- file readers

def _yaml(path: str):
    import yaml
    try:
        with open(path, encoding="utf-8-sig") as fh:
            return yaml.safe_load(fh)
    except (OSError, yaml.YAMLError):
        return None


def read_phonemes(path: str) -> set[str] | None:
    if not os.path.exists(path):
        return None
    if path.endswith(".json"):
        with open(path, encoding="utf-8") as fh:
            return set(json.load(fh))
    with open(path, encoding="utf-8-sig") as fh:
        return {l.rstrip("\r\n") for l in fh if l.strip()}


def read_dsdict(folder: str) -> tuple[dict[str, str], dict[str, list[str]]]:
    """Symbols and entries of dsdict-en.yaml (preferred) or dsdict.yaml in `folder`."""
    for name in ("dsdict-en.yaml", "dsdict.yaml"):
        d = _yaml(os.path.join(folder, name))
        if isinstance(d, dict) and d.get("symbols"):
            syms = {str(s["symbol"]): str(s.get("type", "")) for s in d.get("symbols") or []}
            ents = {}
            for e in d.get("entries") or []:
                g = str(e.get("grapheme", "")).lower()
                if g and g not in ents:
                    ents[g] = [str(p) for p in e.get("phonemes") or []]
            return syms, ents
    return {}, {}


def _character(folder: str) -> tuple[str, list[str], str | None]:
    name, colors, phonemizer = os.path.basename(folder), [], None
    txt = os.path.join(folder, "character.txt")
    if os.path.exists(txt):
        with open(txt, encoding="utf-8-sig", errors="replace") as fh:
            for l in fh:
                if l.lower().startswith("name="):
                    name = l.split("=", 1)[1].strip()
    y = _yaml(os.path.join(folder, "character.yaml")) or {}
    name = str(y.get("name") or name)
    phonemizer = y.get("default_phonemizer")
    for sb in y.get("subbanks") or []:
        c = sb.get("color")
        if c is not None and str(c) not in colors:
            colors.append(str(c))
    return name, sorted(colors), phonemizer


def scan(root: str = None) -> list[dict]:
    """Every DiffSinger root under `root`: {folder, singer_id, name}."""
    root = root or VOICEBANKS
    out = []
    if not os.path.isdir(root):
        return out
    for dirpath, dirnames, filenames in os.walk(root, followlinks=True):
        dirnames[:] = sorted(d for d in dirnames if d not in SUBMODEL_DIRS and not d.startswith("."))
        if "dsconfig.yaml" in filenames and ("character.txt" in filenames or "character.yaml" in filenames):
            name, _, _ = _character(dirpath)
            out.append({"folder": dirpath, "singer_id": os.path.relpath(dirpath, root), "name": name})
    return out


@lru_cache(maxsize=None)
def find(key: str, root: str = None) -> Bank:
    """The installed bank for profile `key` ('tiger' | 'hanami' | a custom key registered
    with register()). Raises FileNotFoundError with the fetch instructions."""
    root = root or VOICEBANKS
    prof = PROFILES[key]
    for b in scan(root):
        if re.search(prof.pattern, b["name"], re.I) or re.search(prof.pattern, b["singer_id"], re.I):
            return load(prof, b["folder"], root)
    raise FileNotFoundError(
        f"DiffSinger voicebank '{prof.display}' is not installed in {root}. "
        f"Run music/diffsinger/fetch_voicebanks.sh (see music/diffsinger/README.md).")


def load(prof: Profile, folder: str, root: str = None) -> Bank:
    root = root or VOICEBANKS
    cfg = _yaml(os.path.join(folder, "dsconfig.yaml")) or {}
    ac = read_phonemes(os.path.join(folder, str(cfg.get("phonemes", "phonemes.txt")))) or set()
    dur_dir = os.path.join(folder, "dsdur")
    dcfg = _yaml(os.path.join(dur_dir, "dsconfig.yaml"))
    dur = read_phonemes(os.path.join(dur_dir, str(dcfg.get("phonemes", "phonemes.txt")))) if dcfg else None
    syms, ents = read_dsdict(dur_dir if dcfg else folder)
    if not syms:
        syms, ents = read_dsdict(folder)
    name, colors, phonemizer = _character(folder)
    return Bank(prof, os.path.relpath(folder, root), folder, name, ac, dur, syms, ents, colors,
                has_dur=bool(dcfg), has_pitch=os.path.exists(os.path.join(folder, "dspitch", "dsconfig.yaml")),
                has_variance=os.path.exists(os.path.join(folder, "dsvariance", "dsconfig.yaml")),
                vocoder=cfg.get("vocoder"), phonemizer=prof.phonemizer,
                extra_map=dict(prof.phoneme_map))


def register(prof: Profile) -> None:
    """Add a profile (tests, other banks)."""
    PROFILES[prof.key] = prof
    find.cache_clear()


def credits(keys) -> list[str]:
    return [f"{PROFILES[k].display}: {PROFILES[k].credit} — {PROFILES[k].licence}" for k in keys]
