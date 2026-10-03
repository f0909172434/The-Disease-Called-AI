"""
    python3 -m unittest discover -s music/diffsinger/tests -v

Unit tests run anywhere (no voicebank needed). The smoke test at the end renders real
audio through bin/ourender when DIFFSINGER_TEST_VOICEBANKS points at the test bank
(see tests/testbank.py and README.md); otherwise it is skipped.
"""
from __future__ import annotations

import json
import os
import sys
import tempfile
import unittest

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
DS = os.path.dirname(HERE)
VOCAL = os.path.normpath(os.path.join(DS, "..", "vocal"))
for p in (HERE, DS, VOCAL):
    if p not in sys.path:
        sys.path.insert(0, p)

import banks as bk  # noqa: E402
import phonemes as phm  # noqa: E402
import score_to_ustx as su  # noqa: E402

VOCALS = os.path.normpath(os.path.join(DS, "..", "build", "vocals.json"))
with open(VOCALS) as fh:
    VOC = json.load(fh)
LINES = {l["id"]: l for l in VOC["lines"]}
SUNG = [l for l in VOC["lines"] if l["mode"] == "sung"]

ARPA = sorted(phm.ARPA_VOWELS | {"b", "ch", "d", "dh", "dx", "f", "g", "hh", "jh", "k", "l", "m", "n",
                                  "ng", "p", "r", "s", "sh", "t", "th", "v", "w", "y", "z", "zh",
                                  "SP", "AP", "cl", "q"})


def fake_bank(inventory=ARPA, prefix="", key="tiger", dur=True) -> bk.Bank:
    syms = {f"{prefix}{p}": ("vowel" if p in phm.ARPA_VOWELS else "consonant") for p in inventory}
    return bk.Bank(bk.PROFILES[key], f"{key}_test", "/nonexistent", key, set(syms),
                   set(syms) if dur else None, syms, {"every": ["eh", "v", "r", "iy"]},
                   ["Disco", "Fresh"], dur, False, False, "nsf_hifigan",
                   bk.PROFILES[key].phonemizer)


class Phonemes(unittest.TestCase):
    def test_every_syllable_has_one_vowel_or_is_melisma(self):
        for line in SUNG:
            lp = phm.line_phonemes(line)
            self.assertEqual(len(lp.syllables), len(line["syllables"]), line["id"])
            for s in lp.syllables:
                nv = sum(p.is_vowel for p in s.phones)
                self.assertEqual(nv, 0 if s.shares_prev else 1, (line["id"], s.text, s.phones))

    def test_known_words(self):
        lp = phm.line_phonemes(LINES["V1_1"])
        got = [[p.arpa for p in s.phones] for s in lp.syllables]
        self.assertEqual(got[:2], [["s", "eh"], ["v", "ax", "n"]])            # Sev | en
        self.assertEqual(got[5], ["b", "l", "ay", "n", "d", "z"])              # blinds
        lp = phm.line_phonemes(LINES["C1_4"])
        self.assertIn(["v", "er"], [[p.arpa for p in s.phones] for s in lp.syllables])  # nev-er

    def test_sources_cover_the_string(self):
        lp = phm.line_phonemes(LINES["C1_3"])
        for s in lp.syllables:
            for p in s.phones:
                self.assertTrue(p.src and all(0 <= i < len(lp.ps) for i in p.src))

    def test_syllabify_arpa(self):
        # "vr" is no English onset: ev | ry
        self.assertEqual(phm.syllabify_arpa(["eh", "v", "r", "iy"]),
                         [([], "eh", ["v"]), (["r"], "iy", [])])
        self.assertEqual(phm.syllabify_arpa(["d", "ih", "f", "s", "ih", "ng", "er"]),
                         [(["d"], "ih", ["f"]), (["s"], "ih", ["ng"]), ([], "er", [])])
        parts = phm.syllabify_arpa(["s", "t", "r", "ey", "n", "jh", "er"])
        self.assertEqual(parts[0], (["s", "t", "r"], "ey", ["n"]))


class Banks(unittest.TestCase):
    def test_fallbacks_and_prefix(self):
        b = fake_bank([p for p in ARPA if p not in ("ax", "dx")])
        self.assertEqual(b.map_phoneme("ax"), "ah")
        self.assertEqual(b.map_phoneme("dx"), "d")
        b = fake_bank(prefix="en/")
        self.assertEqual(b.map_phoneme("aa"), "en/aa")
        with self.assertRaises(KeyError):
            fake_bank(["aa"]).map_phoneme("zh")

    def test_color_index_is_sorted_position(self):
        b = fake_bank()
        self.assertEqual(b.color_index("fresh"), 1)
        self.assertIsNone(b.color_index("vinyl"))

    def test_voice_blend_to_banks(self):
        import diffsinger_backend as dsb
        w = {v: dsb.bank_weights(VOC["voices"][v]["blend"]) for v in VOC["voices"]}
        self.assertEqual(w["you"], [("tiger", 1.0)])
        self.assertEqual(w["ai_him"], [("tiger", 1.0)])
        self.assertEqual(w["ai_0"], [("hanami", 1.0)])
        self.assertEqual(w["ai_1"], [("hanami", 0.85), ("tiger", 0.15)])
        self.assertEqual(w["ai_2"][0][1], 0.5)

    def test_scan_finds_nested_banks(self):
        with tempfile.TemporaryDirectory() as d:
            root = os.path.join(d, "TIGER_DS", "TIGER")
            os.makedirs(os.path.join(root, "dsdur"))
            for f in ("dsconfig.yaml", "dsdur/dsconfig.yaml"):
                with open(os.path.join(root, f), "w") as fh:
                    fh.write("phonemes: phonemes.txt\nacoustic: acoustic.onnx\nvocoder: v\n")
            with open(os.path.join(root, "character.txt"), "w") as fh:
                fh.write("name=TIGER\n")
            with open(os.path.join(root, "phonemes.txt"), "w") as fh:
                fh.write("SP\nAP\naa\nen/aa\n")
            found = bk.scan(d)
            self.assertEqual([f["singer_id"] for f in found], [os.path.join("TIGER_DS", "TIGER")])
            b = bk.load(bk.PROFILES["tiger"], root, d)
            self.assertTrue(b.has_dur)
            self.assertIn("en/aa", b.acoustic_phonemes)


class Ustx(unittest.TestCase):
    def setUp(self):
        self.bank = fake_bank()

    def test_bank_timing_lyrics(self):
        line = LINES["C1_2"]
        lp = phm.line_phonemes(line)
        part = su.part_for_line(line, lp, self.bank, 0)
        self.assertEqual(len(part.notes), sum(len(s["notes"]) for s in line["syllables"]))
        self.assertTrue(part.notes[1].lyric.startswith("fe[f iy]"), part.notes[1].lyric)
        self.assertLess(part.position, part.notes[0].pos)

    def test_melisma_notes_extend(self):
        line = next(l for l in SUNG if any(len(s["notes"]) > 1 for s in l["syllables"]))
        part = su.part_for_line(line, phm.line_phonemes(line), self.bank, 0)
        self.assertIn("+~", [n.lyric for n in part.notes])

    def test_timed_lyrics_and_yaml(self):
        import yaml
        line = LINES["V1_1"]
        lp = phm.line_phonemes(line)
        times = su.ours_times(line, lp)
        part = su.part_for_line(line, lp, self.bank, 0, times=times)
        first = part.notes[0].lyric            # Sev[s@-xx eh@0]
        self.assertRegex(first, r"^Sev\[s@-\d+ eh@0\]$")
        doc = yaml.safe_load(su.project_yaml([su.track_for(self.bank, True)], [part]))
        t = doc["tracks"][0]
        self.assertEqual(t["phonemizer"], su.TIMED_PHONEMIZER)
        self.assertEqual(t["renderer_settings"]["renderer"], "DIFFSINGER")
        vp = doc["voice_parts"][0]
        self.assertEqual(vp["notes"][0]["position"], part.notes[0].pos - part.position)
        # the preferred colour (Fresh = index 1 of the sorted colours) on every phoneme
        self.assertEqual(vp["notes"][0]["phoneme_expressions"],
                         [{"index": 0, "abbr": "clr", "value": 1}, {"index": 1, "abbr": "clr", "value": 1}])

    def test_ours_timing_vowel_on_the_note(self):
        line = LINES["C1_3"]
        lp = phm.line_phonemes(line)
        times = su.ours_times(line, lp)
        for s in lp.syllables:
            if s.shares_prev:
                continue
            k = next(i for i, p in enumerate(s.phones) if p.is_vowel)
            self.assertAlmostEqual(times[s.index][k][0], s.notes[0]["tb"] * 60 / 172, places=6)
            starts = [a for a, _ in times[s.index]]
            self.assertEqual(starts, sorted(starts))

    def test_pitd_reproduces_the_contour(self):
        line = LINES["C1_4"]
        lp = phm.line_phonemes(line)
        for tr in (0, -12):
            part = su.part_for_line(line, lp, self.bank, 0, transpose=tr)
            t = np.linspace(part.position * su.SEC_PER_TICK, part.end * su.SEC_PER_TICK, 400)
            midi = 60 + 2 * np.sin(t * 3)
            xs, ys = su.pitd_curve(part, t, midi, transpose=tr)
            ends = np.array([n.pos + n.dur for n in part.notes])
            base = np.array([part.notes[min(np.searchsorted(ends, x, side="right"), len(ends) - 1)].tone
                             for x in xs])
            got = base + np.array(ys) / 100.0
            want = np.interp(np.array(xs) * su.SEC_PER_TICK, t, midi) + tr
            self.assertLess(np.max(np.abs(got - want)), 0.006)


class Plan(unittest.TestCase):
    def test_plan_from_times_matches_planner(self):
        import diffsinger_backend as dsb
        import planner as pl
        line = LINES["C1_5"]
        lp = phm.line_phonemes(line)
        times = su.ours_times(line, lp)
        plan = dsb.plan_from_times(line, lp, times, pl.TimingStyle())
        for s in plan.syllables:
            if not s.shares_prev:
                self.assertAlmostEqual(s.vowel_start, s.notes[0].start, places=6)
            self.assertLessEqual(s.start, s.vowel_start + 1e-9)
        starts = [p.start for p in plan.phones]
        self.assertEqual(starts, sorted(starts))
        # voicing comes from the phones: an /s/ onset is unvoiced, its vowel voiced
        import contour as ct
        con = ct.design(plan, ct.AI, 1)
        self.assertGreater(con.voiced.mean(), 0.5)
        self.assertLess(con.voiced.mean(), 1.0)


class Morph(unittest.TestCase):
    def _env(self, scale, n=40):
        import world_voice as wv
        f = np.linspace(0, wv.FS / 2, 513)
        env = np.zeros_like(f)
        for F, B in ((700, 120), (1200, 150), (2600, 200), (3400, 250)):
            env += np.exp(-0.5 * ((f - F * scale) / B) ** 2)
        sp = (1e-3 + env)[None, :] ** 2 * np.exp(-f / 4000)[None, :]
        return np.repeat(sp, n, axis=0)

    def test_formant_ratio_and_endpoints(self):
        import diffsinger_backend as dsb
        her, him = self._env(1.18), self._env(1.0)
        r = dsb.formant_ratio(her, him)
        self.assertAlmostEqual(r, 1.18, delta=0.03)
        ap = np.full_like(her, 0.2)
        sp0, ap0, _ = dsb.blend_envelopes(her, ap, him, ap * 2, 0.0)
        self.assertTrue(np.allclose(sp0, her, rtol=1e-6))
        sp1, ap1, _ = dsb.blend_envelopes(her, ap, him, ap * 2, 1.0)
        self.assertTrue(np.allclose(ap1, 0.4))
        # half way: the first formant sits between his and hers (geometric mean of the scales)
        sph, _, rr = dsb.blend_envelopes(her, ap, him, ap, 0.5)
        f = np.linspace(0, 12000, 513)
        band = (f > 500) & (f < 1000)
        peak = f[band][np.argmax(sph[0][band])]
        self.assertAlmostEqual(peak, 700 * rr ** 0.5, delta=40)


def _real_banks() -> bool:
    import runner
    try:
        bk.find("tiger"), bk.find("hanami")
    except (FileNotFoundError, KeyError):
        return False
    return runner.available()


@unittest.skipUnless(_real_banks(), "TIGER / Hanami not installed (fetch_voicebanks.sh)")
class RealBanks(unittest.TestCase):
    """Bank timing through OpenUtau's DiffSinger English phonemizer + the banks' duration
    models (phonemize only: seconds, no audio)."""

    def test_bank_timing_maps_back(self):
        import diffsinger_backend as dsb
        import planner as pl
        import runner
        cases = [("V1_1", "tiger"), ("C2_5_ai", "hanami")]
        with tempfile.TemporaryDirectory() as d:
            tracks, parts, lps = [], [], {}
            for k, (lid, key) in enumerate(cases):
                b = bk.find(key)
                tracks.append(su.track_for(b, False))
                lps[lid] = phm.line_phonemes(LINES[lid])
                parts.append(su.part_for_line(LINES[lid], lps[lid], b, k))
            proj = su.write_ustx(os.path.join(d, "t.ustx"), tracks, parts)
            runner.run("phonemize", proj, os.path.join(d, "out"), log=None)
            for (lid, key), part in zip(cases, parts):
                info = runner.load_part(os.path.join(d, "out"), part.name, audio=False)
                times = dsb.times_from_render(part, info, lps[lid], bk.find(key), False)
                plan = dsb.plan_from_times(LINES[lid], lps[lid], times, pl.TimingStyle())
                for s, ps in zip(lps[lid].syllables, plan.syllables):
                    if s.shares_prev or (len(s.onset) >= 2 and s.onset[-1].arpa in ("w", "y", "l", "r")):
                        continue          # OpenUtau starts a C-glide-V note on the glide/liquid
                    self.assertAlmostEqual(ps.vowel_start, ps.notes[0].start, delta=0.002, msg=(lid, s.text))
                    self.assertLessEqual(ps.start, ps.vowel_start)


    def test_seeded_renders_are_bit_identical(self):
        """Two renders with empty caches (fresh OpenUtau data dirs) give the same samples;
        another take gives another performance."""
        import runner
        line = LINES["PO_1"]
        b = bk.find("hanami")
        lp = phm.line_phonemes(line)
        with tempfile.TemporaryDirectory() as d:
            outs = []
            for run, take in (("a", 0), ("b", 0), ("c", 3)):
                part = su.part_for_line(line, lp, b, 0, times=su.ours_times(line, lp), take=take)
                proj = su.write_ustx(os.path.join(d, f"{run}.ustx"), [su.track_for(b, True)], [part])
                runner.run("render", proj, os.path.join(d, run), data=os.path.join(d, f"data_{run}"),
                           steps=8, log=None)
                outs.append(runner.load_part(os.path.join(d, run), part.name)["audio"])
            self.assertTrue(np.array_equal(outs[0], outs[1]))
            n = min(len(outs[0]), len(outs[2]))
            self.assertFalse(np.array_equal(outs[0][:n], outs[2][:n]))


@unittest.skipUnless(os.environ.get("DIFFSINGER_TEST_VOICEBANKS"), "test bank not configured")
class Smoke(unittest.TestCase):
    """Real renders through bin/ourender with the opencpopJPN test bank (timed phonemizer)."""

    def setUp(self):
        self._profiles, self._root = dict(bk.PROFILES), bk.VOICEBANKS
        self._env = os.environ.get("VOCAL_DS_TIMING")

    def tearDown(self):
        bk.PROFILES.clear()
        bk.PROFILES.update(self._profiles)
        bk.VOICEBANKS = self._root
        bk.find.cache_clear()
        if self._env is None:
            os.environ.pop("VOCAL_DS_TIMING", None)
        else:
            os.environ["VOCAL_DS_TIMING"] = self._env

    def test_backend_end_to_end(self):
        import testbank
        import runner
        if not (testbank.available() and runner.available()):
            self.skipTest("test bank or ourender missing")
        testbank.stand_in_for_real_banks()
        os.environ["VOCAL_DS_TIMING"] = "ours"
        import cache
        import diffsinger_backend as dsb
        import qa
        import soxr
        with tempfile.TemporaryDirectory() as d:
            cache.CACHE_DIR = d
            ids = ["C1_2", "PO_1", "B_L1"]
            st = dsb.prepare([LINES[i] for i in ids], VOC["voices"], log=lambda *_: None)
            self.assertEqual(st["rendered"], 3)
            for i in ids:
                r = dsb.render_sung(LINES[i], VOC["voices"])
                self.assertGreater(float(np.sqrt(np.mean(r.audio ** 2))), 0.01, i)
                x24 = soxr.resample(r.audio, 48000, 24000)
                err, n = qa.pitch_error_cents(x24, 24000, r.start, r.qa["frames_t"],
                                              r.qa["score_midi"], r.qa["vowel"])
                self.assertLess(err, 15 if LINES[i]["style"] == "ai" else 35, i)
                off = qa.timing_offset_ms(r.audio, 48000, r.start, r.timing)
                self.assertLess(abs(off), 30, i)


if __name__ == "__main__":
    unittest.main()
