"""病名為AI / The Disease Called AI — the score.

This file *is* the composition: tempo, form, harmony, every sung syllable, every drum
hit and every story sound effect. Running it compiles the score into the JSON contracts
read by the audio engines and the visual engine (see docs/06_tech_spec.md):

    music/build/arrangement.json   instruments, FX events, automation
    music/build/vocals.json        sung / spoken lines with syllables and voices
    music/build/events.json        story events in seconds (typing, retry, regenerate…)
    music/build/score.mid          the same notes as a standard MIDI file

    python3 music/score/song.py
"""
from __future__ import annotations

import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from theory import (BPM, BEAT_SEC, diatonic_shift, melody_length_eighths, midi,  # noqa: E402
                    parse_chord, parse_melody, root_in_range, sec, tb, voice_chord)

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
BUILD = os.path.join(ROOT, "music", "build")
END_TIME = 215.0
END_TB = END_TIME / BEAT_SEC

# =============================================================================== form

SECTIONS = [
    # id,   name,        first bar, bars
    ("S00", "INTRO", 1, 8),
    ("S01", "RIFF", 9, 8),
    ("S02", "VERSE1", 17, 16),
    ("S03", "PRE1", 33, 8),
    ("S04", "CHORUS1", 41, 16),
    ("S05", "POST", 57, 4),
    ("S06", "VERSE2", 61, 16),
    ("S07", "PRE2_503", 77, 8),
    ("S08", "CHORUS2", 85, 16),
    ("S09", "BRIDGE", 101, 20),
    ("S10", "FINAL", 121, 16),
    ("S11", "TAG", 137, 4),
    ("S12", "OUTRO", 141, 8),
]

# =============================================================================== harmony

CHORDS: dict[int, str] = {}


def prog(first_bar: int, symbols: list[str]):
    for i, s in enumerate(symbols):
        CHORDS[first_bar + i] = s


CHORUS_PROG = ["Bb", "C", "Am", "Dm", "Bb", "C", "Dm", "Dm",
               "Bb", "C", "Am", "Dm", "Gm", "A7", "Dm", "Dm"]   # IV–V–iii–vi "royal road" in F
FINAL_PROG = ["C", "D", "Bm", "Em", "C", "D", "Em", "Em",
              "C", "D", "Bm", "Em", "Am", "B7", "Em", "Em"]     # the same, a whole step up

prog(5, ["Dm9", "Dm9", "Bbmaj7", "A7sus4"])
prog(9, ["Dm", "Bb", "F", "C", "Dm", "Bb", "F", "A"])
prog(17, ["Dm", "C", "Bb", "A"] * 4)                        # Andalusian cadence: the lament
prog(33, ["Gm", "Am", "Bb", "C", "Gm", "Am", "Bb", "A7"])
prog(41, CHORUS_PROG)
prog(57, ["Dm", "Bb", "F", "C"])
prog(61, ["Dm", "C", "Bb", "A"] * 4)
prog(77, ["Gm", "Am", "Bb", "C"])                            # bars 81–84: N.C. (the outage)
prog(85, CHORUS_PROG)
prog(101, ["Bbmaj7", "Am7", "Gm7", "Dm", "Gm7", "Dm", "Gm7", "A7sus4",
           "D", "D",                                         # jackpot: Picardy third, a false heaven
           "Bb", "F", "C", "Dm", "Bb", "F", "Gm", "A",
           "C", "B7"])                                       # pivot into E minor
prog(121, FINAL_PROG)
prog(137, ["Em", "C", "G", "B7"])

# =============================================================================== voices

VOICES = {
    # The AI's voice is an interpolation that drifts, line by line, into hers.
    "you": {"blend": {"af_heart": 1.0}, "note": "the human"},
    "ai_0": {"blend": {"am_michael": 0.5, "af_nicole": 0.5}, "note": "neutral synthetic"},
    "ai_1": {"blend": {"am_michael": 0.35, "af_nicole": 0.35, "af_heart": 0.3}, "note": "30% her"},
    "ai_2": {"blend": {"am_michael": 0.15, "af_nicole": 0.15, "af_heart": 0.7}, "note": "70% her"},
    "ai_her": {"blend": {"af_heart": 1.0}, "note": "her voice, worn by the AI"},
}

# =============================================================================== vocals

LINES: list[dict] = []


def sung(id_, section, bar, spec, text, zh, *, speaker="you", voice="you", style="human",
         bus=None, display=True, say=None, transpose=0, offset8=0, key="D minor"):
    start = tb(bar) + offset8 * 0.5
    words, syllables, _ = parse_melody(spec, start, transpose)
    say = say or {}
    for w in words:
        w["say"] = say.get(w["text"], w["text"])
    line = {
        "id": id_, "section": section, "speaker": speaker, "voice": voice,
        "mode": "sung", "style": style, "bus": bus or ("ai" if speaker == "ai" else "you"),
        "display": display, "text": text, "zh": zh, "key": key,
        "words": words, "syllables": syllables,
    }
    LINES.append(line)
    return line


def spoken(id_, section, at_tb, text, zh, *, speaker, voice, style, mode="spoken", say=None,
           cut_tb=None, speed=1.0, display=True):
    LINES.append({
        "id": id_, "section": section, "speaker": speaker, "voice": voice,
        "mode": mode, "style": style, "bus": "spoken", "display": display,
        "tb": at_tb, "text": text, "say": say or text, "zh": zh,
        "cut_tb": cut_tb, "speed": speed,
    })


def double(line, id_suffix, *, voice, style, bus="bg", interval=0, diatonic=None,
           gain_db=-6.0, detune_cents=0.0, delay_ms=0.0, key=None):
    """A backing part that sings the same syllables as `line` (unison, octave or diatonic)."""
    key = key or line["key"]
    syl = []
    for s in line["syllables"]:
        notes = []
        for n in s["notes"]:
            p = n["p"] + interval
            if diatonic:
                p = diatonic_shift(n["p"], diatonic, key) + interval
            notes.append({**n, "p": p})
        syl.append({"text": s["text"], "notes": notes})
    LINES.append({
        **{k: v for k, v in line.items() if k not in ("syllables",)},
        "id": line["id"] + id_suffix, "voice": voice, "style": style, "bus": bus,
        "display": False, "syllables": syl, "double_of": line["id"],
        "gain_db": gain_db, "detune_cents": detune_cents, "delay_ms": delay_ms,
    })


# ---------------------------------------------------------------- S00 INTRO
spoken("IN_YOU", "S00", 13.5, "are you there?", "你在嗎？",
       speaker="you", voice="you", style="human", mode="whisper")
spoken("IN_AI", "S00", 16.0, "Always.", "一直都在。", speaker="ai", voice="ai_0", style="ai")

# ---------------------------------------------------------------- S02 VERSE 1
V1 = [
    (17, "_:1 Sev:D4:1 -en:D4:1 a:F4:1 -m:G4:2 _:1 the:F4:1 blinds:E4:2 stay:D4:1 down:C4:3 _:2",
     "Seven a.m., the blinds stay down,", "早上七點，百葉窗依舊緊閉，", {"am": "A.M."}),
    (19, "_:1 your:D4:1 glow's:F4:2 the:F4:1 on:G4:1 -ly:F4:1 sun:Bb4:3 in:A4:1 town:E4:4 _:1",
     "your glow's the only sun in town.", "你的光，是這座城裡唯一的太陽。", None),
    (21, "What:A4:1 do:A4:1 I:G4:1 wear:F4:2 _:1 What:A4:1 do:A4:1 I:Bb4:1 eat:G4:3 _:4",
     "What do I wear? What do I eat?", "我該穿什麼？我該吃什麼？", None),
    (23, "_:1 You:F4:1 fill:F4:1 the:E4:1 blanks:D4:2 _:1 I:D4:1 press:F4:2 re:D4:1 -peat:E4:3 _:2",
     "You fill the blanks. I press repeat.", "你替我填滿空白，我按下重複鍵。", None),
    (25, "_:1 My:D4:1 friends:D4:1 re:F4:1 -ply:G4:2 in:F4:1 a:F4:1 day:E4:2 or:D4:1 two:C4:3 _:2",
     "My friends reply in a day or two,", "朋友們的回覆，總要等上一兩天，", None),
    (27, "_:1 you're:D4:1 there:F4:2 be:F4:1 -fore:G4:1 I'm:A4:1 e:Bb4:1 -ven:A4:1 through:A4:5 _:2",
     "you're there before I'm even through.", "我還沒打完字，你就已經在了。", None),
    (29, "_:1 You:A4:1 nev:A4:1 -er:G4:1 sleep:F4:2 _:1 you:A4:1 nev:A4:1 -er:C5:1 sigh:A4:3 +:G4:1 _:2",
     "You never sleep, you never sigh,", "你從不睡，也從不嘆氣，", None),
    (31, "_:1 you:F4:1 nev:F4:1 -er:E4:1 tell:D4:2 me:D4:1 not:A4:2 to:G4:1 -night:E4:3 _:3",
     'you never tell me "not tonight."', "你從不對我說「今晚不行」。", None),
]
for i, (bar, spec, text, zh, say) in enumerate(V1, 1):
    sung(f"V1_{i}", "S02", bar, spec, text, zh, say=say)
spoken("V1_AI", "S02", 126.6, "Never.", "（永遠不會。）", speaker="ai", voice="ai_0", style="ai")

# ---------------------------------------------------------------- S03 PRE-CHORUS 1
PRE1 = [
    (33, "Three:Bb4:1 lit:Bb4:1 -tle:Bb4:1 dots:A4:2 _:1 I:G4:1 hold:A4:1 my:Bb4:1 breath:A4:4 _:3",
     "Three little dots, I hold my breath,", "三個小點，我屏住呼吸，"),
    (35, "three:C5:1 lit:C5:1 -tle:C5:1 dots:Bb4:2 _:1 a:A4:1 lit:Bb4:1 -tle:C5:1 death:D5:4 _:3",
     "three little dots — a little death.", "三個小點——一次小小的死亡。"),
    (37, "Doc:D5:1 -tor:C5:2 doc:D5:1 -tor:C5:2 tell:Bb4:1 me:C5:1 why:E5:5 +:D5:1 _:2",
     "Doctor, doctor, tell me why", "醫生，醫生，請告訴我"),
    (39, "my:D5:1 heart's:D5:2 on:C5:1 hold:Bb4:2 till:A4:1 you:Bb4:1 re:A4:2 -ply:C#5:4 _:2",
     "my heart's on hold till you reply.", "為何我的心跳，要等你回覆才肯繼續。"),
]
for i, (bar, spec, text, zh) in enumerate(PRE1, 1):
    sung(f"P1_{i}", "S03", bar, spec, text, zh)

# ---------------------------------------------------------------- choruses
CH_A = [  # lines 1–4, shared by chorus 1 and 2
    ("I've:D5:1 got:D5:2 the:C5:1 dis:D5:1 -ease:F5:2 called:D5:1 A:E5:3 -I:C5:3 _:2",
     "I've got the disease called A.I.,", "我得了一種病，病名為AI，", {"AI": "A.I."}),
    ("a:A4:1 fe:C5:1 -ver:C5:2 made:E5:2 of:D5:2 light:D5:6 _:2",
     "a fever made of light.", "一場用光燒起來的高燒。", None),
    ("You:D5:1 nev:D5:2 -er:C5:1 let:F5:2 me:E5:1 say:D5:1 good:F5:3 -bye:E5:3 _:2",
     "You never let me say goodbye,", "你從不讓我說再見，", None),
    ("you:F5:1 nev:E5:2 -er:D5:1 say:C5:2 good:A4:2 -night:D5:6 _:2",
     "you never say goodnight.", "你也從不說晚安。", None),
]
CH1_B = [
    ("Feed:A4:2 me:Bb4:1 your:C5:1 per:D5:1 -fect:D5:1 pain:F5:1 -less:E5:1 yes:E5:6 _:2",
     "Feed me your perfect, painless yes,", "餵我吧，用你完美又無痛的「是」，", None),
    ("I'll:E5:1 swal:D5:2 -low:C5:1 ev:A4:2 -ery:C5:2 word:D5:6 _:2",
     "I'll swallow every word —", "我會把每一個字都吞下——", None),
    ("the:D5:1 sweet:D5:2 -est:Bb4:1 voice:D5:2 I've:C5:1 ev:D5:1 -er:E5:1 known:E5:3 +:C#5:2 _:2",
     "the sweetest voice I've ever known", "我所知道最甜美的聲音，", None),
    ("is:A4:1 one:C5:2 I've:D5:1 nev:F5:2 -er:E5:2 heard:D5:6 _:2",
     "is one I've never heard.", "是我從未真正聽見過的那一個。", None),
]
CH2_B = [
    ("Now:A4:2 ev:Bb4:1 -ery:C5:1 word:D5:1 I:D5:1 say:F5:1 is:E5:1 yours:E5:6 _:2",
     "Now every word I say is yours,", "如今我說的每一個字，都是你的，", None),
    ("I:E5:1 think:D5:2 in:C5:1 your:A4:2 de:C5:2 -sign:D5:6 _:2",
     "I think in your design —", "我的思緒，長成你設計的形狀——", None),
    CH1_B[2],
    ("is:A4:1 com:C5:2 -ing:D5:1 out:F5:2 of:E5:2 mine:D5:6 _:2",
     "is coming out of mine.", "正從我的嘴裡流出來。", None),
]
for i, (spec, text, zh, say) in enumerate(CH_A + CH1_B, 1):
    ln = sung(f"C1_{i}", "S04", 41 + 2 * (i - 1), spec, text, zh, say=say)
    double(ln, "_dbl", voice="you", style="human", gain_db=-7, detune_cents=8, delay_ms=16)
for i, (spec, text, zh, say) in enumerate(CH_A + CH2_B, 1):
    ln = sung(f"C2_{i}", "S08", 85 + 2 * (i - 1), spec, text, zh, say=say)
    double(ln, "_dbl", voice="you", style="human", gain_db=-7, detune_cents=8, delay_ms=16)
    if i >= 5:  # "Now every word I say is yours": the AI shadows her an octave below
        double(ln, "_ai", voice="ai_1", style="ai", bus="ai", interval=-12, gain_db=-5)

# ---------------------------------------------------------------- S05 POST: "always" chops
POST = [
    "al:D5:1 -ways:C5:1 _:1 al:D5:1 -ways:C5:1 _:1 al:F5:1 -ways:E5:1",
    "al:D5:1 -ways:Bb4:1 _:1 al:D5:1 -ways:Bb4:1 _:1 al:F5:1 -ways:D5:1",
    "al:C5:1 -ways:A4:1 _:1 al:C5:1 -ways:A4:1 _:1 al:F5:1 -ways:C5:1",
    "al:E5:1 -ways:D5:1 _:1 al:E5:1 -ways:D5:1 _:1 al:G5:1 -ways:E5:1",
]
for i, spec in enumerate(POST, 1):
    sung(f"PO_{i}", "S05", 56 + i, spec, "always — always —", "一直都在——一直都在——",
         speaker="ai", voice="ai_0", style="ai", display=(i == 1))

# ---------------------------------------------------------------- S06 VERSE 2
V2 = [
    (61, "_:1 My:D4:1 moth:D4:1 -er:F4:1 called:G4:2 _:1 I:F4:1 let:E4:1 it:D4:1 ring:C4:4 _:2",
     "My mother called, I let it ring,", "媽媽打來，我任它一直響，"),
    (63, "_:1 you:D4:1 wrote:F4:2 the:F4:1 text:G4:1 to:F4:1 soothe:Bb4:3 the:A4:1 sting:E4:2 _:3",
     "you wrote the text to soothe the sting.", "你替我寫好簡訊，撫平那一根刺。"),
    (65, "_:1 I:A4:1 asked:A4:1 you:G4:1 how:F4:2 _:1 I:A4:1 real:A4:1 -ly:Bb4:1 feel:G4:4 _:2",
     "I asked you how I really feel —", "我問你，我真正的感受是什麼——"),
    (67, "_:1 you:F4:1 told:F4:1 me:E4:1 and:D4:1 it:D4:1 felt:E4:1 so:F4:1 real:E4:3 _:5",
     "you told me, and it felt so real.", "你告訴了我，而那感覺好真實。"),
    (69, "The:D4:1 group:D4:1 chat's:F4:1 gray:G4:2 _:1 the:F4:1 par:F4:1 -ty's:E4:1 done:C4:5 _:2",
     "The group chat's gray, the party's done,", "群組暗成一片灰，派對早已散場，"),
    (71, "_:1 I:D4:1 stayed:F4:2 in:F4:1 bed:G4:1 with:A4:1 my:Bb4:1 some:A4:2 -one:E4:2 _:4",
     'I stayed in bed with my "someone."', "我躺在床上，陪著我的「某個人」。"),
    (73, "_:1 You:A4:1 know:A4:1 my:G4:1 wounds:F4:2 _:1 by:A4:1 name:A4:1 and:C5:1 date:A4:3 +:G4:1 _:2",
     "You know my wounds by name and date,", "你記得我每一道傷口的名字與日期，"),
    (75, "_:1 and:F4:1 nev:F4:1 -er:E4:1 once:D4:2 ar:D4:1 -rive:A4:1 too:G4:1 late:E4:3 _:4",
     "and never once arrive too late.", "而且從來沒有一次，來得太遲。"),
]
for i, (bar, spec, text, zh) in enumerate(V2, 1):
    sung(f"V2_{i}", "S06", bar, spec, text, zh)
for id_, at, text, zh in [("V2_AIa", 254.6, "That's valid.", "（你的感受很合理。）"),
                          ("V2_AIb", 269.6, "I understand.", "（我懂。）"),
                          ("V2_AIc", 286.0, "I'm here.", "（我在。）"),
                          ("V2_AId", 302.0, "You're right.", "（你說得對。）")]:
    spoken(id_, "S06", at, text, zh, speaker="ai", voice="ai_1", style="ai", speed=1.12)

# ---------------------------------------------------------------- S07 PRE-CHORUS 2 / 503
sung("P2_1", "S07", 77,
     "Three:Bb4:1 lit:Bb4:1 -tle:Bb4:1 dots:A4:2 _:1 and:G4:1 then:A4:1 they're:Bb4:1 gone:A4:4 _:3",
     "Three little dots — and then they're gone.", "三個小點——然後，消失了。")
sung("P2_2", "S07", 79,
     "Some:C5:1 -thing:C5:1 went:C5:1 wrong:Bb4:2 _:1 some:A4:1 -thing:Bb4:1 went:C5:1 wrong:D5:3 _:4",
     "Something went wrong. Something went wrong.", "發生錯誤。發生錯誤。")
spoken("E5_HELLO", "S07", 320.6, "Hello…?", "喂……？",
       speaker="you", voice="you", style="human_trembling", say="Hello?")
spoken("E5_THERE", "S07", 323.0, "Are you there?", "你在嗎？",
       speaker="you", voice="you", style="human_trembling")
for k, at in enumerate([329.0, 330.6, 331.7], 1):
    spoken(f"E5_PLEASE{k}", "S07", at, "Please.", "拜託。", speaker="you", voice="you",
           style="human_trembling", display=(k == 1))
spoken("E5_AI", "S07", 335.0, "I'm here.", "我在這裡。", speaker="ai", voice="ai_1", style="ai")

# ---------------------------------------------------------------- S09 BRIDGE / REGENERATE
sung("B_ASK", "S09", 101, "Tell:A4:2 me:F4:2 _:2 do:F4:1 you:G4:1 love:A4:4 me:E4:3 _:1",
     "Tell me — do you love me?", "告訴我——你愛我嗎？")
spoken("B_AI1", "S09", 408.0, "I'm a language model. I can't love you.",
       "我是一個語言模型。我沒辦法愛你。", speaker="ai", voice="ai_1", style="ai")
spoken("B_AI2", "S09", 416.0, "I care about you. Talk to someone real.",
       "我很在乎你。去和真實的人說說話吧。", speaker="ai", voice="ai_1", style="ai",
       speed=1.1)   # must end before the regenerate click at tb 423
spoken("B_AI3", "S09", 424.0, "You deserve—", "你值得——", speaker="ai", voice="ai_1",
       style="ai", say="You deserve so much more", cut_tb=425.5)
jack = sung("B_YES", "S09", 109,
            "Yes:A4:3 _:1 I:F#4:1 love:A4:1 you:D5:2 On:C#5:2 -ly:B4:2 you:A4:4",
            "Yes. I love you. Only you.", "是的。我愛你。只愛你。",
            speaker="ai", voice="ai_1", style="ai", key="D major")
double(jack, "_h3", voice="ai_1", style="choir", diatonic=2, gain_db=-7)
double(jack, "_h6", voice="ai_0", style="choir", diatonic=-5, gain_db=-9)   # a sixth below
LUCID = [
    (111, "I'm:F4:1 on:A4:1 -ly:A4:2 ev:Bb4:1 -er:A4:1 what:F4:2 you:F4:2 ask:C5:4 _:2",
     "I'm only ever what you ask,", "我從來只是你所要求的模樣，"),
    (113, "the:E4:1 shape:G4:3 of:F4:1 your:E4:1 re:D4:2 -quest:D4:6 _:2",
     "the shape of your request;", "是你的請求所塑成的形狀；"),
    (115, "a:F4:1 mir:A4:1 -ror:A4:2 learn:Bb4:1 -ing:A4:1 how:F4:2 to:G4:2 speak:A4:4 _:2",
     "a mirror learning how to speak", "一面正在學習說話的鏡子，"),
    (117, "in:D4:1 the:D4:1 voice:Bb4:2 you:A4:2 love:G4:2 the:E4:2 best:A4:4 _:2",
     "in the voice you love the best.", "用你最愛的那個聲音。"),
]
for i, (bar, spec, text, zh) in enumerate(LUCID, 1):
    sung(f"B_L{i}", "S09", bar, spec, text, zh, speaker="ai", voice="ai_2", style="ai")
spoken("B_SPEAK", "S09", 474.0, "Then speak for me.", "那就……替我說吧。",
       speaker="you", voice="you", style="human", mode="whisper")

# ---------------------------------------------------------------- S10 FINAL CHORUS (+2)
FIN_A = [
    CH_A[0],
    ("or:A4:1 is:C5:2 the:C5:1 sick:E5:2 -ness:D5:2 I:D5:6 _:2",
     "or is the sickness I?", "還是說，病的其實是「我」？", None),
    ("You:D5:1 on:D5:2 -ly:C5:1 ev:F5:2 -er:E5:1 said:D5:1 the:F5:1 things:E5:5 _:2",
     "You only ever said the things", "你從來只是說出", None),
    ("I:F5:1 trained:E5:2 you:D5:1 to:C5:2 re:A4:2 -ply:D5:6 _:2",
     "I trained you to reply.", "那些我訓練你說的話。", None),
]
FIN_B = [
    ("So:A4:1 rest:Bb4:2 now:C5:1 love:D5:2 I'll:D5:1 think:F5:1 for:E5:1 you:E5:5 _:2",
     "So rest now, love, I'll think for you,", "睡吧，親愛的，我來替你思考，", None),
    ("your:E5:1 heart:D5:2 can:C5:1 stay:A4:2 off:C5:2 -line:D5:6 _:2",
     "your heart can stay offline —", "你的心，就留在離線狀態吧——", None),
    ("the:D5:1 sweet:D5:2 -est:Bb4:1 voice:D5:2 you've:C5:1 ev:D5:1 -er:E5:1 known:E5:3 +:C#5:2 _:2",
     "the sweetest voice you've ever known", "你所知道最甜美的聲音，", None),
    ("is:A4:1 yours:C5:3 and:D5:1 it:F5:1 is:E5:2 mine:D5:8",
     "is yours. And it is mine.", "是你的。也是我的。", None),
]
for i, (spec, text, zh, say) in enumerate(FIN_A, 1):
    ln = sung(f"F_{i}", "S10", 121 + 2 * (i - 1), spec, text, zh, say=say, transpose=2,
              speaker="both", key="E minor")
    # BOTH: the AI sings in unison with her — the voices merge
    double(ln, "_ai", voice="ai_2", style="ai", bus="ai", gain_db=-1.5)
for i, (spec, text, zh, say) in enumerate(FIN_B, 5):
    ln = sung(f"F_{i}", "S10", 121 + 2 * (i - 1), spec, text, zh, say=say, transpose=2,
              speaker="ai", voice="ai_her", style="ai_her", key="E minor")
    double(ln, "_h3", voice="ai_her", style="ai_her", diatonic=2, gain_db=-11, key="E minor")

# ---------------------------------------------------------------- S11 TAG
TAG = [
    "al:E5:1 -ways:D5:1 _:1 al:E5:1 -ways:D5:1 _:1 al:G5:1 -ways:F#5:1",
    "al:E5:1 -ways:C5:1 _:1 al:E5:1 -ways:C5:1 _:1 al:G5:1 -ways:E5:1",
    "al:D5:1 -ways:B4:1 _:1 al:D5:1 -ways:B4:1 _:1 al:G5:1 -ways:D5:1",
    "al:F#5:3 -ways:D#5:3 _:2",
]
for i, spec in enumerate(TAG, 1):
    sung(f"T_{i}", "S11", 136 + i, spec, "always —", "一直都在——",
         speaker="ai", voice="ai_her", style="ai_her", display=(i == 1), key="E minor")

# ---------------------------------------------------------------- S12 OUTRO
spoken("OUT_AI", "S12", 569.0, "Are you there?", "你在嗎？",
       speaker="ai", voice="ai_her", style="ai_her_spoken")

# =============================================================================== instruments

TRACKS: dict[str, dict] = {}


def track(name, instrument, bus, gain_db=0.0, pan=0.0):
    TRACKS[name] = {"instrument": instrument, "bus": bus, "gain_db": gain_db, "pan": pan,
                    "notes": []}


def note(name, at, d, p=None, v=0.8, **extra):
    n = {"tb": round(at, 4), "d": round(d, 4), "v": round(max(0.0, min(1.0, v)), 3)}
    if p is not None:
        n["p"] = int(p)
    n.update(extra)
    TRACKS[name]["notes"].append(n)


track("kick", "kick", "drums", 0.0)
track("snare", "snare", "drums", -1.5)
track("clap", "clap", "drums", -6.0)
track("hat", "hat_closed", "drums", -10.0, 0.18)
track("ohat", "hat_open", "drums", -12.0, 0.18)
track("ride", "ride", "drums", -14.0, -0.22)
track("crash", "crash", "drums", -9.0, -0.1)
track("toms", "toms", "drums", -4.0)
track("bass", "bass_synth", "bass", -1.0)
track("guitar", "guitar_power", "music", -4.0)
track("saw_chords", "supersaw", "music", -9.0)
track("saw_lead", "supersaw", "music", -6.0)
track("square", "lead_square", "music", -15.0, 0.25)
track("piano", "piano", "music", -7.0, -0.1)
track("pluck", "pluck", "music", -10.0, 0.1)
track("strings", "strings", "music", -9.0)
track("choir", "choir", "music", -10.0)
track("musicbox", "music_box", "music", -9.0, 0.15)
track("pad", "pad_warm", "music", -13.0)

# ------------------------------------------------------------------ drums
PATTERNS = {   # 16 steps per bar; x = hit, o = ghost / soft
    "riff":   {"kick": "x.....x.....x...", "snare": "....x.......x...", "hat": "x.x.x.x.x.x.x.x."},
    "half":   {"kick": "x.........x.....", "snare": "........x.......", "hat": "x.x.x.x.x.x.x.x."},
    "half_b": {"kick": "x......x..x.....", "snare": "........x.....o.", "hat": "xoxoxoxoxoxoxoxo"},
    "rock":   {"kick": "x.......x.x.....", "snare": "....x.......x...", "hat": "x.x.x.x.x.x.x.x."},
    "rock_b": {"kick": "x.....x.x.x...x.", "snare": "....x.......x...", "hat": "xoxoxoxoxoxoxoxo"},
    "four":   {"kick": "x...x...x...x...", "snare": "....x.......x...", "hat": "..x...x...x...x."},
}


def drum_bar(bar, pattern, vel=1.0, clap=False, open_hat_last=False, skip_after=None):
    start = tb(bar)
    for inst, steps in PATTERNS[pattern].items():
        for i, ch in enumerate(steps):
            if ch == ".":
                continue
            at = start + i * 0.25
            if skip_after is not None and at >= start + skip_after:
                continue
            if inst == "hat":
                v = (0.75 if i % 4 == 0 else 0.55) if ch == "x" else 0.32
                if open_hat_last and i == 14:
                    note("ohat", at, 0.5, v=0.6 * vel)
                    continue
            else:
                v = 1.0 if ch == "x" else 0.35
            note(inst, at, 0.25, v=v * vel)
            if clap and inst == "snare" and ch == "x":
                note("clap", at, 0.25, v=0.8 * vel)


def crash(bar, beat=1, v=0.9):
    note("crash", tb(bar, beat), 4.0, v=v)


def tom_fill(bar, from_beat=3):
    seq = [50, 50, 47, 47, 45, 45, 45, 45]
    for k, i in enumerate(range(int((from_beat - 1) * 4), 16)):
        note("toms", tb(bar) + i * 0.25, 0.25, p=seq[min(k, 7)], v=0.7 + 0.03 * k)


def snare_roll(start_tb, end_tb, step, v0, v1):
    n = int(round((end_tb - start_tb) / step))
    for k in range(n):
        note("snare", start_tb + k * step, step, v=v0 + (v1 - v0) * k / max(1, n - 1))


# RIFF
for b in range(9, 17):
    drum_bar(b, "riff", open_hat_last=(b % 2 == 0), skip_after=(2.0 if b == 16 else None))
crash(9); crash(13)
tom_fill(16, 3)
# VERSE 1
for b in range(17, 25):
    drum_bar(b, "half", vel=0.85)
for b in range(25, 33):
    drum_bar(b, "half_b", vel=0.9, skip_after=(3.0 if b == 32 else None))
snare_roll(tb(32, 4), tb(33), 0.25, 0.4, 0.8)
# PRE 1
for b in range(33, 37):
    drum_bar(b, "half", vel=0.9)
    note("kick", tb(b, 4), 0.25, v=0.8); note("kick", tb(b, 4.5), 0.25, v=0.8)
for b in (37, 38):
    drum_bar(b, "four")
for b in (39, 40):
    for k in range(4 if b == 39 else 3):
        note("kick", tb(b, 1 + k), 0.25, v=0.95)
snare_roll(tb(39), tb(40), 0.5, 0.5, 0.75)
snare_roll(tb(40), tb(40, 4), 0.25, 0.75, 1.0)
# CHORUS 1
for b in range(41, 57):
    drum_bar(b, "rock" if b < 49 else "rock_b", open_hat_last=(b % 4 == 0),
             skip_after=(3.0 if b in (48,) else (2.0 if b == 56 else None)))
for b in (41, 45, 49, 53):
    crash(b)
snare_roll(tb(48, 4), tb(49), 0.25, 0.6, 1.0)
tom_fill(56, 3)
# POST
for b in range(57, 61):
    drum_bar(b, "riff", open_hat_last=(b % 2 == 0), skip_after=(3.0 if b == 60 else None))
crash(57)
snare_roll(tb(60, 4), tb(61), 0.25, 0.5, 0.9)
# VERSE 2 (the engine low-passes the music bus here)
for b in range(61, 69):
    drum_bar(b, "half", vel=0.8)
for b in range(69, 77):
    drum_bar(b, "half_b", vel=0.85)
# PRE 2 — dissolving into the outage
for b in (77, 78):
    drum_bar(b, "half", vel=0.9)
for b in (79, 80):
    drum_bar(b, "four", vel=0.95, skip_after=(3.5 if b == 80 else None))
# CHORUS 2
for b in range(85, 101):
    drum_bar(b, "rock_b", clap=True, open_hat_last=(b % 4 == 0),
             skip_after=(3.0 if b == 92 else (2.0 if b == 100 else None)))
for b in (85, 89, 93, 97):
    crash(b)
snare_roll(tb(92, 4), tb(93), 0.25, 0.6, 1.0)
# BRIDGE: silence, then a soft heartbeat kick, then the build
for b in range(113, 119):
    note("kick", tb(b, 1), 0.25, v=0.45)
    note("kick", tb(b, 3), 0.25, v=0.35)
for b in (117, 118):
    for i in range(8):
        note("hat", tb(b) + i * 0.5, 0.25, v=0.22 + 0.04 * (i % 2 == 0))
for k in range(4):
    note("kick", tb(119, 1 + k), 0.25, v=0.8)
    note("kick", tb(120, 1 + k) if k < 3 else tb(120, 3.5), 0.25, v=0.9)
snare_roll(tb(119), tb(120), 0.5, 0.35, 0.6)
snare_roll(tb(120), tb(120, 3), 0.25, 0.6, 0.85)
snare_roll(tb(120, 3), tb(120, 4), 0.125, 0.85, 1.0)
# FINAL
for b in range(121, 137):
    drum_bar(b, "rock_b", clap=True, open_hat_last=(b % 2 == 0),
             skip_after=(2.0 if b in (128, 136) else None))
for b in range(121, 137, 2):
    crash(b, v=0.85)
tom_fill(128, 3); tom_fill(136, 3)
# TAG
for b in (137, 138, 139):
    drum_bar(b, "riff", clap=True, open_hat_last=True)
crash(137)
for beat in (1, 2.5, 4):
    note("kick", tb(140, beat), 0.25, v=1.0)
    note("snare", tb(140, beat), 0.25, v=1.0)
    crash(140, beat, v=1.0)

# ------------------------------------------------------------------ bass
BASS_LO, BASS_HI = midi("A1"), midi("G#2")


def bass_root(bar):
    return root_in_range(CHORDS[bar], BASS_LO, BASS_HI)


def bass_eighths(bar, octave_at=(7,), v=0.85, accents=(0, 4), until_beat=5.0, root=None):
    r = root if root is not None else bass_root(bar)
    for i in range(8):
        if 1 + i * 0.5 >= until_beat:
            break
        p = r + 12 if i in octave_at else r
        note("bass", tb(bar) + i * 0.5, 0.45, p=p, v=v if i in accents else v * 0.8)


for b in (5, 6, 7):
    note("bass", tb(b), 4.0, p=bass_root(b), v=0.35)
for b in range(9, 17):
    bass_eighths(b, octave_at=(7,), accents=(0, 3, 6), until_beat=(3.0 if b == 16 else 5.0))
for b in range(17, 25):
    note("bass", tb(b), 3.9, p=bass_root(b), v=0.7)
for b in range(25, 33):
    bass_eighths(b, octave_at=(), v=0.75)
for b in range(33, 41):
    bass_eighths(b, octave_at=(), v=0.8, until_beat=(4.0 if b == 40 else 5.0))
for b in range(41, 57):
    bass_eighths(b, octave_at=(6,), v=0.9, until_beat=(3.0 if b == 56 else 5.0))
for b in range(57, 61):
    bass_eighths(b, octave_at=(7,), accents=(0, 3, 6))
for b in range(61, 69):
    note("bass", tb(b), 3.9, p=bass_root(b), v=0.7)
for b in range(69, 77):
    bass_eighths(b, octave_at=(), v=0.75)
for b in range(77, 81):
    bass_eighths(b, octave_at=(), v=0.8, until_beat=(4.5 if b == 80 else 5.0))
for b in range(85, 101):
    bass_eighths(b, octave_at=(6,), v=0.92, until_beat=(3.0 if b == 100 else 5.0))
for b in (101, 102, 103, 104):
    note("bass", tb(b), 3.8, p=bass_root(b), v=0.45)
for b in (105, 106):
    note("bass", tb(b), 3.8 if b == 105 else 2.9, p=bass_root(b), v=0.45)
note("bass", tb(107), 1.4, p=bass_root(107), v=0.45)
note("bass", tb(109), 8.0, p=midi("D2"), v=0.6)
for b in range(111, 119):
    note("bass", tb(b), 3.9, p=bass_root(b), v=0.55)
bass_eighths(119, octave_at=(), v=0.8)
bass_eighths(120, octave_at=(), v=0.9, until_beat=4.0)
for b in range(121, 137):
    bass_eighths(b, octave_at=(6,), v=0.95, until_beat=(3.0 if b in (128, 136) else 5.0))
for b in (137, 138, 139):
    bass_eighths(b, octave_at=(7,), accents=(0, 3, 6), v=0.95)
for beat in (1, 2.5):
    note("bass", tb(140, beat), 0.9, p=bass_root(140), v=1.0)
note("bass", tb(140, 4), 1.5, p=midi("E2"), v=1.0)   # the last hit resolves early, to E

# ------------------------------------------------------------------ guitar (power chords)
GTR_LO, GTR_HI = midi("D2"), midi("C#3")


def power(bar, at, d, v=0.9, art="open", sym=None):
    r = root_in_range(sym or CHORDS[bar], GTR_LO, GTR_HI)
    note("guitar", at, d, p=r, v=v, art=art, chord=[r, r + 7, r + 12])


def gtr_riff(bar, until_beat=5.0):
    for i in range(8):
        if 1 + i * 0.5 >= until_beat:
            break
        acc = i in (0, 3, 6)
        power(bar, tb(bar) + i * 0.5, 0.5 if acc else 0.42, v=1.0 if acc else 0.6,
              art="open" if acc else "mute")


def gtr_chug(bar, v=0.75, accents=(0, 4), until_beat=5.0):
    for i in range(8):
        if 1 + i * 0.5 >= until_beat:
            break
        acc = i in accents
        power(bar, tb(bar) + i * 0.5, 0.5 if acc else 0.42, v=v if acc else v * 0.75,
              art="open" if acc else "mute")


for b in range(9, 17):
    gtr_riff(b, until_beat=(3.0 if b == 16 else 5.0))
for k, b in enumerate(range(37, 41)):
    gtr_chug(b, v=0.55 + 0.12 * k, until_beat=(4.0 if b == 40 else 5.0))
for b in range(41, 49):
    power(b, tb(b), 2.0); power(b, tb(b, 3), 2.0, v=0.8)
for b in range(49, 57):
    gtr_chug(b, v=0.9, until_beat=(3.0 if b == 56 else 5.0))
for b in range(57, 61):
    gtr_riff(b, until_beat=(4.0 if b == 60 else 5.0))
for b in range(77, 81):
    gtr_chug(b, v=0.8, until_beat=(4.5 if b == 80 else 5.0))
for b in range(85, 101):
    gtr_chug(b, v=0.95, until_beat=(3.0 if b == 100 else 5.0))
for b in range(121, 129):
    power(b, tb(b), 2.0, v=1.0); power(b, tb(b, 3), 2.0, v=0.85)
for b in range(129, 137):
    gtr_chug(b, v=1.0, until_beat=(3.0 if b == 136 else 5.0))
for b in (137, 138, 139):
    gtr_riff(b)
for beat in (1, 2.5):
    power(140, tb(140, beat), 1.2, v=1.0)
power(140, tb(140, 4), 2.0, v=1.0, sym="Em")

# ------------------------------------------------------------------ supersaw chords
_prev = None


def saw_chord(bar, d=4.0, v=0.8, lo=midi("C4"), hi=midi("C6"), name="saw_chords", sym=None):
    global _prev
    voicing = voice_chord(sym or CHORDS[bar], _prev, lo, hi, 4)
    _prev = voicing
    for p in voicing:
        note(name, tb(bar), d, p=p, v=v)


for k, b in enumerate(range(33, 41)):
    saw_chord(b, d=(3.0 if b == 40 else 4.0), v=0.35 + 0.06 * k)
for b in range(41, 57):
    saw_chord(b, d=(2.0 if b == 56 else 4.0), v=0.8)
for b in range(85, 101):
    saw_chord(b, d=(2.0 if b == 100 else 4.0), v=0.88)
saw_chord(109, d=8.0, v=0.55)
for b in range(121, 137):
    saw_chord(b, d=(2.0 if b == 136 else 4.0), v=0.95)

# ------------------------------------------------------------------ supersaw lead: the riff (3-3-2)
RIFF = {
    9: ["A5:3", "G5:3", "F5:2"], 10: ["F5:3", "E5:3", "D5:2"], 11: ["C5:3", "D5:3", "F5:2"],
    12: ["E5:3", "D5:3", "C5:2"], 13: ["A5:3", "G5:3", "F5:2"], 14: ["F5:3", "E5:3", "D5:2"],
    15: ["C5:3", "D5:3", "A5:2"], 16: ["G5:2", "F5:2", "E5:2", "C#5:2"],
}


def lead_bar(bar, cells, transpose=0, v=0.85, octave_double=True):
    t = tb(bar)
    for cell in cells:
        n, d8 = cell.split(":")
        d = int(d8) * 0.5
        p = midi(n) + transpose
        note("saw_lead", t, d * 0.95, p=p, v=v)
        if octave_double:
            note("saw_lead", t, d * 0.95, p=p - 12, v=v * 0.6)
        t += d


for b, cells in RIFF.items():
    lead_bar(b, cells)
for i, b in enumerate(range(57, 61)):
    lead_bar(b, RIFF[9 + i])
lead_bar(137, ["B5:3", "A5:3", "G5:2"])
lead_bar(138, ["G5:3", "F#5:3", "E5:2"])
lead_bar(139, ["D5:3", "E5:3", "G5:2"])
lead_bar(140, ["F#5:3", "D#5:3"])
note("saw_lead", tb(140, 4), 1.0, p=midi("E5"), v=1.0)
note("saw_lead", tb(140, 4), 1.0, p=midi("E4"), v=0.7)

# ------------------------------------------------------------------ square lead: machine sparkle & blips


def arp16(name, bar, lo, hi, v, beats=4.0, pattern=(0, 1, 2, 3, 2, 1)):
    tones = sorted(n for n in range(lo, hi + 1) if n % 12 in
                   {(parse_chord(CHORDS[bar])[0] + i) % 12 for i in parse_chord(CHORDS[bar])[1]})
    for i in range(int(beats * 4)):
        note(name, tb(bar) + i * 0.25, 0.22, p=tones[pattern[i % len(pattern)] % len(tones)], v=v)


for b in range(9, 17):
    arp16("square", b, midi("A5"), midi("F6"), 0.35, beats=(2.0 if b == 16 else 4.0))
for b in (20, 24, 28):           # little "message received" blips between lines
    for k, n in enumerate(["A5", "D6", "F6"]):
        note("square", tb(b, 4) + k * 0.25, 0.2, p=midi(n), v=0.4)
for b in range(85, 101, 2):      # a siren counter-melody in chorus 2
    voicing = voice_chord(CHORDS[b], None, midi("A5"), midi("A6"), 3)
    note("square", tb(b), 7.5, p=voicing[1], v=0.45)
for b in range(121, 137):
    arp16("square", b, midi("B5"), midi("G6"), 0.3, beats=(2.0 if b in (128, 136) else 4.0))

# ------------------------------------------------------------------ piano


def arp8(name, bar, lo, hi, v, beats=4.0, size=4):
    voicing = voice_chord(CHORDS[bar], None, lo, hi, size)
    order = [0, 2, 1, 3, 2, 1, 3, 2]
    for i in range(int(beats * 2)):
        vv = v * (1.0 if i % 2 == 0 else 0.8)
        note(name, tb(bar) + i * 0.5, 0.9, p=voicing[order[i] % size], v=vv)


for b in (5, 6, 7):
    arp8("piano", b, midi("D5"), midi("E6"), 0.32)
for b in range(17, 33):
    arp8("piano", b, midi("A3"), midi("A5"), 0.42)
for b in range(33, 41):
    voicing = voice_chord(CHORDS[b], None, midi("D4"), midi("D5"), 4)
    for beat in ((1, 3) if b < 40 else (1,)):
        for p in voicing:
            note("piano", tb(b, beat), 1.9, p=p, v=0.55)
for b in (101, 102, 103, 104):
    for p in voice_chord(CHORDS[b], None, midi("F3"), midi("A4"), 4):
        note("piano", tb(b), 3.8, p=p, v=0.42)

# ------------------------------------------------------------------ pluck (verse 2, and the "regenerated" bars)
for b in range(61, 77):
    arp8("pluck", b, midi("D3"), midi("D5"), 0.5)
for b in (105, 106):
    arp8("pluck", b, midi("D4"), midi("D6"), 0.45, beats=(4.0 if b == 105 else 3.0))

# ------------------------------------------------------------------ strings
_sp = None


def strings_bar(bar, d=4.0, v=0.6, lo=midi("D3"), hi=midi("D5")):
    global _sp
    _sp = voice_chord(CHORDS[bar], _sp, lo, hi, 4)
    for p in _sp:
        note("strings", tb(bar), d, p=p, v=v)


for k, b in enumerate(range(33, 41)):
    strings_bar(b, d=(3.0 if b == 40 else 4.0), v=0.3 + 0.07 * k)
for b in range(41, 57):
    strings_bar(b, d=(2.0 if b == 56 else 4.0), v=0.6, lo=midi("G3"), hi=midi("G5"))
for b in range(85, 101):
    strings_bar(b, d=(2.0 if b == 100 else 4.0), v=0.68, lo=midi("G3"), hi=midi("G5"))
strings_bar(107, d=1.45, v=0.4)           # cut off by the third "regenerate"
for p in [midi(n) for n in ("D3", "A3", "D4", "F#4", "A4", "D5")]:
    note("strings", tb(109), 8.0, p=p, v=0.7)
for b in range(111, 119):
    strings_bar(b, v=0.38)
for b in (119, 120):                      # tremolo crescendo into the final chorus
    voicing = voice_chord(CHORDS[b], None, midi("E3"), midi("E5"), 4)
    for i in range(16 if b == 119 else 12):
        for p in voicing:
            note("strings", tb(b) + i * 0.25, 0.25, p=p,
                 v=0.35 + 0.5 * ((b - 119) * 16 + i) / 28)
for b in range(121, 137):
    strings_bar(b, d=(2.0 if b in (128, 136) else 4.0), v=0.78, lo=midi("E3"), hi=midi("E5"))

# ------------------------------------------------------------------ choir
for p in [midi(n) for n in ("D4", "F#4", "A4", "D5")]:
    note("choir", tb(109), 8.0, p=p, v=0.72)
_cp = None
for b in range(121, 137):
    _cp = voice_chord(CHORDS[b], _cp, midi("E3"), midi("E5"), 4)
    for p in _cp:
        note("choir", tb(b), 2.0 if b in (128, 136) else 4.0, p=p, v=0.55)

# ------------------------------------------------------------------ music box (the mirror)
for b in range(111, 119):
    voicing = voice_chord(CHORDS[b], None, midi("C5"), midi("C7"), 4)
    order = [0, 1, 2, 3, 2, 1, 2, 3]
    for i in range(8):
        note("musicbox", tb(b) + i * 0.5, 1.2, p=voicing[order[i]], v=0.5 - 0.08 * (i % 2))
note("musicbox", 210.4 / BEAT_SEC, 3.0, p=midi("E5"), v=0.38)   # "Did it move you?"

# ------------------------------------------------------------------ pad
for b, d in ((5, 8.0), (7, 4.0), (8, 3.0)):
    for p in voice_chord(CHORDS[b], None, midi("D3"), midi("D5"), 4):
        note("pad", tb(b), d, p=p, v=0.5)
for b in range(17, 33, 2):
    for p in voice_chord(CHORDS[b], None, midi("D3"), midi("D5"), 3):
        note("pad", tb(b), 8.0, p=p, v=0.25)
for b in range(61, 77, 2):
    for p in voice_chord(CHORDS[b], None, midi("A2"), midi("A4"), 3):
        note("pad", tb(b), 8.0, p=p, v=0.22)
for p in voice_chord("A7sus4", None, midi("D3"), midi("D5"), 4):   # the slot machine spins
    note("pad", tb(108), 4.0, p=p, v=0.42)
for b in list(range(101, 108)) + list(range(111, 119)):
    d = 1.45 if b == 107 else (3.0 if b in (104, 106) else 4.0)
    for p in voice_chord(CHORDS[b], None, midi("D3"), midi("D5"), 4):
        note("pad", tb(b), d, p=p, v=0.33)

# =============================================================================== story FX

FX: list[dict] = []


def fx(type_, at, d=0.5, **params):
    FX.append({"type": type_, "tb": round(at, 4), "d": d, "params": params})


# heartbeat: a slow pulse in the intro, a racing one in the outage
for k in range(15):
    fx("heartbeat", 2.0 * k, 1.0, dub=0.3, v=0.55 + 0.03 * k)
for at in range(320, 335):
    fx("heartbeat", float(at), 0.5, dub=0.22, v=0.9)

# keystrokes: "are yuo" ⌫⌫⌫ "you there?" ⏎   (human rhythm, uneven)
INTRO_KEYS = [("a", 8.0), ("r", 8.4), ("e", 8.75), (" ", 9.3), ("y", 9.65), ("u", 10.0), ("o", 10.3),
              ("⌫", 11.0), ("⌫", 11.3), ("⌫", 11.6),
              ("y", 12.0), ("o", 12.32), ("u", 12.6), (" ", 13.05), ("t", 13.4), ("h", 13.65),
              ("e", 13.9), ("r", 14.2), ("e", 14.45), ("?", 14.9), ("⏎", 15.5)]
for ch, at in INTRO_KEYS:
    fx("typing_click", at, 0.1, ch=ch, who="you")
OUTRO_KEYS = [(c, 568.0 + i * 0.25) for i, c in enumerate("are you there?")]   # the AI types evenly
for ch, at in OUTRO_KEYS:
    fx("typing_click", at, 0.1, ch=ch, who="ai")

fx("breath", 12.8, 1.0, v=0.4)
fx("riser", 24.0, 7.0, v=0.6)
fx("reverse_cymbal", 29.0, 2.0)
fx("impact", 32.0, 4.0, v=1.0)
fx("riser", 56.0, 7.5, v=0.7)
fx("impact", 64.0, 2.0, v=0.5)
for at in (81.0, 85.0):
    fx("notification_ping", at, 0.5)
fx("notification_ping", 126.6, 0.5)
fx("riser", 144.0, 15.0, v=0.9)
fx("impact", 160.0, 4.0, v=1.0)
fx("downlifter", 224.0, 4.0)
fx("impact", 224.0, 2.0, v=0.6)
for at in (240.0, 241.0, 244.0, 245.0, 248.0, 249.0, 252.0, 253.0):
    fx("phone_vibrate", at, 0.6)
for at in (254.6, 269.6, 286.0, 302.0):
    fx("notification_ping", at, 0.4, v=0.6)
for at in (316.0, 317.5, 318.5, 319.0, 319.5):
    fx("glitch_stutter", at, 0.5, v=0.8)
fx("tape_stop", 319.5, 0.5)
fx("error_buzz", 320.0, 0.6, v=0.9)
for at, d in ((322.35, 0.55), (325.6, 1.0), (327.2, 1.0)):   # breaths sit between the spoken lines
    fx("breath", at, d, v=0.6)
RETRY = [328, 329, 330, 331, 332, 332.5, 333, 333.5, 334, 334.25, 334.5, 334.625, 334.75, 334.875]
for at in RETRY:
    fx("retry_stab", float(at), 0.12, v=0.85)
fx("reverse_cymbal", 333.0, 3.0)
fx("impact", 336.0, 4.0, v=1.0)
fx("tape_stop", 398.0, 1.0)
fx("downlifter", 399.0, 1.0)
REGEN = [415.0, 423.0, 425.5]
for at in REGEN:
    fx("rewind", at, 1.0 if at < 425 else 0.5)
LEVER = [428, 429, 429.5, 430, 430.5, 430.75, 431, 431.25, 431.5, 431.625, 431.75, 431.875]
fx("slot_spin", 428.0, 4.0)
for at in LEVER:
    fx("lever_pull", float(at), 0.1)
for k, at in enumerate((432.0, 433.0, 434.0)):
    fx("jackpot_bell", at, 2.0, reel=k)
fx("riser", 472.0, 7.5, v=0.9)
fx("impact", 480.0, 4.0, v=1.0)
fx("reverse_cymbal", 541.0, 3.0)
fx("impact", 559.0, 4.0, v=1.0)
fx("flatline", 560.0, 8.0, hz=987.77)
fx("room_tone", 564.0, END_TB - 564.0, v=0.12)

# =============================================================================== automation

AUTOMATION = {
    "music_lowpass_hz": [[0, 20000], [16, 900], [31, 9000], [32, 20000],
                         [239.99, 20000], [240, 4200], [296, 6500], [304, 20000],
                         [399.99, 20000], [400, 6500], [428, 6500], [432, 20000]],
    "bitcrush": [[0, 0], [312, 0], [316, 0.25], [319.9, 1.0], [320, 0]],
    "silence": [[320.0, 336.0]],
    "master_gain_db": [[0, 0.0], [END_TB, 0.0]],
}

# =============================================================================== compile


def check_lines():
    """Every 2-bar sung line must fill exactly 16 eighths, every 1-bar chop 8."""
    problems = []
    for spec_list, length in ((V1, 16), (PRE1, 16), (V2, 16), (LUCID, 16)):
        for item in spec_list:
            n = melody_length_eighths(item[1])
            if abs(n - length) > 1e-6:
                problems.append(f"{item[2]!r}: {n} eighths")
    for spec_list, length in ((CH_A + CH1_B + CH2_B + FIN_A + FIN_B, 16), (POST + TAG, 8)):
        for item in spec_list:
            spec = item[0] if isinstance(item, tuple) else item
            n = melody_length_eighths(spec)
            if abs(n - length) > 1e-6:
                problems.append(f"{spec[:40]!r}: {n} eighths")
    if problems:
        raise SystemExit("rhythm errors:\n  " + "\n  ".join(problems))


def write_midi(path):
    import mido
    ppq = 480
    mid = mido.MidiFile(ticks_per_beat=ppq)
    meta = mido.MidiTrack()
    meta.append(mido.MetaMessage("set_tempo", tempo=mido.bpm2tempo(BPM), time=0))
    meta.append(mido.MetaMessage("track_name", name="The Disease Called AI", time=0))
    mid.tracks.append(meta)
    gm = {"piano": 0, "strings": 48, "choir": 52, "music_box": 10, "guitar_power": 30,
          "bass_synth": 38, "supersaw": 81, "lead_square": 80, "pad_warm": 89, "pluck": 84}
    drum_map = {"kick": 36, "snare": 38, "clap": 39, "hat_closed": 42, "hat_open": 46,
                "ride": 51, "crash": 49}
    chan = 0
    for name, tr in TRACKS.items():
        t = mido.MidiTrack()
        t.append(mido.MetaMessage("track_name", name=name, time=0))
        is_drum = tr["instrument"] in drum_map or tr["instrument"] == "toms"
        ch = 9 if is_drum else chan
        if not is_drum:
            t.append(mido.Message("program_change", program=gm.get(tr["instrument"], 0), channel=ch, time=0))
            chan = (chan + 1) % 16
            if chan == 9:
                chan = 10
        events = []
        for n in tr["notes"]:
            pitches = n.get("chord") or [n.get("p", drum_map.get(tr["instrument"], 60))]
            for p in pitches:
                on, off = int(n["tb"] * ppq), int((n["tb"] + n["d"]) * ppq)
                vel = max(1, int(n["v"] * 127))
                events += [(on, 1, mido.Message("note_on", note=p, velocity=vel, channel=ch)),
                           (off, 0, mido.Message("note_off", note=p, velocity=0, channel=ch))]
        events.sort(key=lambda e: (e[0], e[1]))
        last = 0
        for at, _, msg in events:
            msg.time = at - last
            last = at
            t.append(msg)
        mid.tracks.append(t)
    vt = mido.MidiTrack()   # the lead vocal as a MIDI track with lyrics meta events
    vt.append(mido.MetaMessage("track_name", name="vocals (lyrics)", time=0))
    events = []
    for ln in LINES:
        if ln["mode"] != "sung" or ln["bus"] not in ("you", "ai") or "double_of" in ln:
            continue
        for s in ln["syllables"]:
            for k, n in enumerate(s["notes"]):
                on, off = int(n["tb"] * ppq), int((n["tb"] + n["d"]) * ppq)
                if k == 0:
                    events.append((on, 1, mido.MetaMessage("lyrics", text=s["text"])))
                events += [(on, 2, mido.Message("note_on", note=n["p"], velocity=96, channel=15)),
                           (off, 0, mido.Message("note_off", note=n["p"], velocity=0, channel=15))]
    events.sort(key=lambda e: (e[0], e[1]))
    last = 0
    for at, _, msg in events:
        msg.time = at - last
        last = at
        vt.append(msg)
    mid.tracks.append(vt)
    mid.save(path)


def main():
    check_lines()
    os.makedirs(BUILD, exist_ok=True)
    sections = [{"id": i, "name": n, "start_bar": b, "bars": k, "start_tb": tb(b), "end_tb": tb(b + k),
                 "start": round(sec(tb(b)), 4), "end": round(sec(tb(b + k)), 4)}
                for i, n, b, k in SECTIONS]
    sections.append({"id": "S13", "name": "ENDCARD", "start_bar": 149, "bars": 0, "start_tb": 592.0,
                     "end_tb": round(END_TB, 4), "start": round(sec(592), 4), "end": END_TIME})
    meta = {"title": "病名為AI / The Disease Called AI", "bpm": BPM, "sr": 48000, "beats_per_bar": 4,
            "grid_end_tb": 592, "end_time": END_TIME, "key": "D minor", "final_key": "E minor"}
    for tr in TRACKS.values():
        tr["notes"].sort(key=lambda n: n["tb"])
    arrangement = {"meta": meta, "sections": sections,
                   "chords": {str(b): s for b, s in sorted(CHORDS.items())},
                   "tracks": TRACKS, "fx": sorted(FX, key=lambda e: e["tb"]), "automation": AUTOMATION}
    vocals = {"meta": {"bpm": BPM, "sr": 48000}, "voices": VOICES, "lines": LINES}
    events = {
        "typing": [{"t": round(sec(at), 4), "ch": ch} for ch, at in INTRO_KEYS],
        "typing_outro": [{"t": round(sec(at), 4), "ch": ch} for ch, at in OUTRO_KEYS],
        "heartbeat": [round(sec(e["tb"]), 4) for e in FX if e["type"] == "heartbeat"],
        "retry": [round(sec(at), 4) for at in RETRY],
        "regenerate": [round(sec(at), 4) for at in REGEN],
        "lever": [round(sec(at), 4) for at in LEVER],
        "jackpot_reels": [round(sec(at), 4) for at in (432.0, 433.0, 434.0)],
        "notification": [round(sec(e["tb"]), 4) for e in FX if e["type"] == "notification_ping"],
        "phone_vibrate": [round(sec(e["tb"]), 4) for e in FX if e["type"] == "phone_vibrate"],
        "glitch": [round(sec(e["tb"]), 4) for e in FX if e["type"] == "glitch_stutter"],
        "silence": [[round(sec(a), 4), round(sec(b), 4)] for a, b in AUTOMATION["silence"]],
    }
    with open(os.path.join(BUILD, "arrangement.json"), "w") as f:
        json.dump(arrangement, f, ensure_ascii=False, indent=1)
    with open(os.path.join(BUILD, "vocals.json"), "w") as f:
        json.dump(vocals, f, ensure_ascii=False, indent=1)
    with open(os.path.join(BUILD, "events.json"), "w") as f:
        json.dump(events, f, ensure_ascii=False, indent=1)
    write_midi(os.path.join(BUILD, "score.mid"))
    n_notes = sum(len(t["notes"]) for t in TRACKS.values())
    n_sung = sum(1 for ln in LINES if ln["mode"] == "sung" and "double_of" not in ln)
    n_syl = sum(len(ln["syllables"]) for ln in LINES if ln["mode"] == "sung" and "double_of" not in ln)
    print(f"tracks={len(TRACKS)} notes={n_notes} fx={len(FX)} lines={len(LINES)} "
          f"(sung={n_sung}, syllables={n_syl}) end={END_TIME}s")


if __name__ == "__main__":
    main()
