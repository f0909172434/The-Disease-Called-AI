// ourender — headless DiffSinger renderer on OpenUtau.Core (MIT).
//
//   ourender version
//   ourender singers   [--voicebanks DIR]
//   ourender phonemize --project X.ustx --out DIR                   phoneme timing only
//   ourender render    --project X.ustx --out DIR [--pitch ustx|bank] [--parts A,B]
//                      [--steps N] [--depth D] [--save-ustx Y.ustx]
//   ourender example   --out X.ustx                                   reference ustx (schema check)
//
// For every voice part `render` writes DIR/<part>.wav (mono float32, 44.1 kHz, sample 0 at
// `start_ms` song time) and DIR/<part>.json (notes, phonemes with absolute start/end ms, the
// pitch curve the acoustic model was given, render time); `phonemize` writes only the JSON.
// One JSON line summarising the run goes to stdout; diagnostics go to stderr.
//
// Determinism: phonemization, the duration/pitch/variance models and the mel->wave vocoder are
// deterministic; the diffusion sampler draws noise inside the ONNX graph. OpenUtau's tensor
// cache (--data DIR/cache, on by default) stores every model output keyed by its inputs, so a
// phrase is sampled once and every later render of the same input is bit-identical. ONNX
// Runtime uses its default CPU thread pool (one intra-op thread per physical core); OpenUtau
// serialises DiffSinger phrases with a global lock, so one process saturates the CPU — run one
// ourender at a time and give it a batch of parts.
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using OpenUtau.Api;
using OpenUtau.Core;
using OpenUtau.Core.Editing;
using OpenUtau.Core.Format;
using OpenUtau.Core.Render;
using OpenUtau.Core.Ustx;
using OpenUtau.Core.Util;
using Serilog;

namespace Ourender {

    /// The Avalonia UI thread, emulated: OpenUtau posts phonemizer results, phrase builds and
    /// edits to the main scheduler; the main thread runs them while it pumps.
    sealed class UiScheduler : TaskScheduler {
        readonly BlockingCollection<Action> queue = new BlockingCollection<Action>();
        readonly Thread main;
        public UiScheduler(Thread main) { this.main = main; }
        protected override void QueueTask(Task task) => queue.Add(() => TryExecuteTask(task));
        protected override bool TryExecuteTaskInline(Task task, bool previouslyQueued) =>
            Thread.CurrentThread == main && TryExecuteTask(task);
        protected override IEnumerable<Task> GetScheduledTasks() => Enumerable.Empty<Task>();
        public override int MaximumConcurrencyLevel => 1;
        public void Post(Action a) => queue.Add(a);

        /// Run posted work until `done` holds (checked between work items) or the timeout.
        public bool PumpUntil(Func<bool> done, TimeSpan timeout) {
            var deadline = DateTime.UtcNow + timeout;
            while (true) {
                Drain();
                if (done()) return true;
                var left = deadline - DateTime.UtcNow;
                if (left <= TimeSpan.Zero) return false;
                if (queue.TryTake(out var a, TimeSpan.FromMilliseconds(Math.Min(50, left.TotalMilliseconds)))) {
                    Run(a);
                }
            }
        }
        void Drain() { while (queue.TryTake(out var a)) Run(a); }
        static void Run(Action a) {
            try { a(); } catch (Exception e) { Sink.Inst.Errors.Add($"ui: {e.GetType().Name}: {e.Message}"); }
        }
    }

    /// OpenUtau's log (Serilog) to a file; warnings and errors are also kept for the report.
    sealed class LogSink : Serilog.Core.ILogEventSink {
        readonly StreamWriter w;
        // expected on a headless CPU build: no GPU probe, no classic-UTAU builtin plugin dll
        static bool Noise(string m) => m.Contains("[CUDA DETECTOR]") || m.Contains("OpenUtau.Plugin.Builtin.dll");
        public LogSink(string path) {
            // several ourender processes may share one data dir: append, never lock
            var fs = new FileStream(path, FileMode.Append, FileAccess.Write, FileShare.ReadWrite | FileShare.Delete);
            w = new StreamWriter(fs, Encoding.UTF8) { AutoFlush = true };
        }
        public void Emit(Serilog.Events.LogEvent e) {
            var msg = e.RenderMessage(CultureInfo.InvariantCulture);
            lock (w) w.WriteLine($"{e.Timestamp:O} [{e.Level}] {msg}{(e.Exception != null ? " :: " + e.Exception.Message : "")}");
            if (e.Level >= Serilog.Events.LogEventLevel.Warning && !Noise(msg)) {
                lock (Sink.Inst.Warnings) Sink.Inst.Warnings.Add(msg + (e.Exception != null ? " :: " + e.Exception.Message : ""));
            }
        }
    }

    sealed class Sink : ICmdSubscriber {
        public static readonly Sink Inst = new Sink();
        public readonly List<string> Errors = new List<string>();
        public readonly List<string> Warnings = new List<string>();
        public void OnNext(UCommand cmd, bool isUndo) {
            if (cmd is ErrorMessageNotification err) {
                var msg = $"{err.message} {err.e?.Message}".Trim();
                Errors.Add(string.IsNullOrEmpty(msg) ? err.e?.GetType().Name ?? "error" : msg);
            }
        }
    }

    /// Phonemes and their timing written out explicitly in the lyric:
    ///     lyric[ph@ticks ph@ticks ...]
    /// `ticks` is the phoneme start relative to the note start (480 per beat; negative = before
    /// the note). Used when the timing comes from elsewhere — our planner, or another bank's
    /// duration model (the her->him morph renders both banks on one timeline). Phonemes must be
    /// in the singer's phoneme set (checked here, so a typo is an error, not a silent skip).
    [Phonemizer("Ourender Timed Phonemizer", "OUR TIMED", "ourender")]
    public class TimedPhonemizer : Phonemizer {
        HashSet<string> vocab;
        public override void SetSinger(USinger singer) {
            // DiffSingerSinger is internal to OpenUtau.Core; its phoneme list is a public field
            var list = singer?.GetType().GetField("phonemes")?.GetValue(singer) as List<string>;
            vocab = list?.ToHashSet();
        }
        public override Result Process(Note[] notes, Note? prev, Note? next, Note? prevNeighbour,
                                       Note? nextNeighbour, Note[] prevs) {
            var spec = notes[0].phoneticHint;
            if (string.IsNullOrWhiteSpace(spec)) spec = notes[0].lyric;
            var tokens = spec.Split((char[])null, StringSplitOptions.RemoveEmptyEntries);
            var result = new List<Phoneme>();
            foreach (var tok in tokens) {
                int at = tok.LastIndexOf('@');
                string ph = at > 0 ? tok.Substring(0, at) : tok;
                int pos = 0;
                if (at > 0 && !int.TryParse(tok.Substring(at + 1), NumberStyles.Integer, CultureInfo.InvariantCulture, out pos)) {
                    throw new Exception($"bad timed phoneme \"{tok}\"");
                }
                if (at <= 0 && tokens.Length > 1) {
                    throw new Exception($"timed phoneme without @ticks: \"{tok}\" in \"{spec}\"");
                }
                if (vocab != null && vocab.Count > 0 && !vocab.Contains(ph)) {
                    throw new Exception($"phoneme \"{ph}\" is not in the singer's phoneme set");
                }
                result.Add(new Phoneme { phoneme = ph, position = pos });
            }
            if (result.Count == 0) throw new Exception("no phonemes");
            for (int i = 1; i < result.Count; i++) {
                if (result[i].position <= result[i - 1].position) {
                    throw new Exception($"phoneme positions must increase: \"{spec}\"");
                }
            }
            return new Result { phonemes = result.ToArray() };
        }
    }

    static class Program {
        static UiScheduler ui;
        static readonly JsonSerializerOptions JsonOpts = new JsonSerializerOptions { WriteIndented = false };
        static readonly FieldInfo GateField = typeof(UVoicePart).GetField("phraseGate", BindingFlags.NonPublic | BindingFlags.Instance);
        static readonly FieldInfo GenField = typeof(UVoicePart).GetField("phraseGeneration", BindingFlags.NonPublic | BindingFlags.Instance);
        static readonly FieldInfo AppliedField = typeof(UVoicePart).GetField("phraseAppliedGeneration", BindingFlags.NonPublic | BindingFlags.Instance);

        static int Main(string[] args) {
            Console.OutputEncoding = Encoding.UTF8;
            CultureInfo.DefaultThreadCurrentCulture = CultureInfo.InvariantCulture;
            CultureInfo.CurrentCulture = CultureInfo.InvariantCulture;
            if (args.Length == 0 || args[0] is "-h" or "--help") {
                Console.Error.WriteLine("usage: ourender <version|singers|phonemize|render|example> [options]");
                return 2;
            }
            var cmd = args[0];
            var opt = ParseOpts(args.Skip(1).ToArray());
            var timeoutMin = double.Parse(Get(opt, "timeout", "60"), CultureInfo.InvariantCulture);
            using var watchdog = new Timer(_ => {
                Console.Error.WriteLine("ourender: watchdog timeout");
                Emit(new Dictionary<string, object> { ["ok"] = false, ["errors"] = new[] { "watchdog timeout" } });
                Environment.Exit(3);
            }, null, TimeSpan.FromMinutes(timeoutMin + 1), Timeout.InfiniteTimeSpan);
            var result = new Dictionary<string, object> { ["command"] = cmd };
            var sw = Stopwatch.StartNew();
            try {
                if (cmd == "version") {
                    result["openutau_core"] = typeof(DocManager).Assembly.GetName().Version?.ToString();
                    result["onnxruntime"] = typeof(Microsoft.ML.OnnxRuntime.InferenceSession).Assembly.GetName().Version?.ToString();
                    result["ok"] = true;
                    Emit(result);
                    return 0;
                }
                Boot(opt);
                switch (cmd) {
                    case "singers": result["singers"] = Singers(); break;
                    case "phonemize": Process(opt, render: false, result); break;
                    case "render": Process(opt, render: true, result); break;
                    case "example": Example(Req(opt, "out")); break;
                    default: throw new ArgumentException($"unknown command {cmd}");
                }
                result["seconds"] = Math.Round(sw.Elapsed.TotalSeconds, 2);
                result["errors"] = Sink.Inst.Errors.Distinct().ToArray();
                result["warnings"] = Sink.Inst.Warnings.Distinct().ToArray();
                result["ok"] = Sink.Inst.Errors.Count == 0;
                Emit(result);
                return Sink.Inst.Errors.Count == 0 ? 0 : 1;
            } catch (Exception e) {
                Sink.Inst.Errors.Add($"fatal: {e.GetType().Name}: {e.Message}");
                Console.Error.WriteLine(e);
                result["ok"] = false;
                result["errors"] = Sink.Inst.Errors.ToArray();
                Emit(result);
                return 1;
            }
        }

        // ------------------------------------------------------------------ boot

        static void Boot(Dictionary<string, string> opt) {
            string exeDir = AppContext.BaseDirectory;
            string root = Path.GetFullPath(Path.Combine(exeDir, ".."));     // music/diffsinger
            string data = Path.GetFullPath(Get(opt, "data", Path.Combine(root, "oudata")));
            string banks = Path.GetFullPath(Get(opt, "voicebanks", Path.Combine(root, "voicebanks")));
            Directory.CreateDirectory(data);
            // PathManager reads these on first use (Linux): DataPath = $XDG_DATA_HOME/OpenUtau,
            // CachePath = $XDG_CACHE_HOME/OpenUtau. Keep everything inside music/diffsinger.
            Environment.SetEnvironmentVariable("XDG_DATA_HOME", data);
            Environment.SetEnvironmentVariable("XDG_CACHE_HOME", Path.Combine(data, "cache"));
            Directory.CreateDirectory(PathManager.Inst.DataPath);
            Directory.CreateDirectory(PathManager.Inst.CachePath);
            // vocoder/rhythmizer dependencies (.oudep) are installed next to the voicebanks
            var deps = Path.Combine(banks, "Dependencies");
            if (Directory.Exists(deps) && !Directory.Exists(PathManager.Inst.DependencyPath)) {
                try {
                    Directory.CreateSymbolicLink(PathManager.Inst.DependencyPath, deps);
                } catch (IOException) { }                  // a parallel ourender made it first
            }

            System.Text.Encoding.RegisterProvider(System.Text.CodePagesEncodingProvider.Instance);
            Log.Logger = new LoggerConfiguration().MinimumLevel.Information()
                .WriteTo.Sink(new LogSink(Path.Combine(data, "ourender.log")))
                .CreateLogger();

            var p = Preferences.Default;
            p.AdditionalSingerPath = banks;
            p.LoadDeepFolderSinger = true;
            p.OnnxRunner = "CPU";
            p.PreRender = false;
            p.RealTimePitchMode = 0;                        // LivePitchMode.Off
            p.DiffSingerMergeNearbyPhrases = false;
            p.SkipRenderingMutedTracks = false;
            p.DiffSingerTensorCache = Get(opt, "tensor-cache", "true") != "false";
            p.DiffSingerSteps = int.Parse(Get(opt, "steps", "20"), CultureInfo.InvariantCulture);
            p.DiffSingerDepth = double.Parse(Get(opt, "depth", "1.0"), CultureInfo.InvariantCulture);
            p.DiffSingerStepsVariance = int.Parse(Get(opt, "steps-variance", "20"), CultureInfo.InvariantCulture);
            p.DiffSingerStepsPitch = int.Parse(Get(opt, "steps-pitch", "10"), CultureInfo.InvariantCulture);

            ui = new UiScheduler(Thread.CurrentThread);
            DocManager.Inst.PostOnUIThread = a => ui.Post(a);
            DocManager.Inst.AddSubscriber(Sink.Inst);
            DocManager.Inst.Initialize(Thread.CurrentThread, ui);
            PhonemizerFactory.Get(typeof(TimedPhonemizer));
            PhonemizerFactory.BuildList();
            SingerManager.Inst.SearchAllSingers();
            Console.Error.WriteLine($"ourender: {SingerManager.Inst.Singers.Count} singer(s) in {banks}");
        }

        static object Singers() {
            return SingerManager.Inst.Singers.Values.OrderBy(s => s.Id).Select(s => {
                bool Has(string p) => s.GetType().GetProperty(p)?.GetValue(s) as bool? ?? false;
                return new Dictionary<string, object> {
                    ["id"] = s.Id, ["name"] = s.Name, ["type"] = s.SingerType.ToString(),
                    ["location"] = s.Location, ["version"] = s.Version, ["author"] = s.Author,
                    ["default_phonemizer"] = s.DefaultPhonemizer,
                    ["subbanks"] = s.Subbanks?.Select(b => new { color = b.Color, suffix = b.Suffix }).ToArray(),
                    ["has_pitch"] = Has("HasPitchPredictor"),
                    ["has_variance"] = Has("HasVariancePredictor"),
                };
            }).ToArray();
        }

        // ------------------------------------------------------------------ load / wait

        static UProject Load(string path) {
            var project = Formats.ReadProject(new[] { Path.GetFullPath(path) })
                ?? throw new Exception($"cannot read {path}");
            DocManager.Inst.ExecuteCmd(new LoadProjectNotification(project));
            DocManager.Inst.ExecuteCmd(new ValidateProjectNotification());
            WaitReady(project, "load");
            foreach (var track in project.tracks) {
                if (track.Singer == null || !track.Singer.Found) {
                    Sink.Inst.Errors.Add($"track {track.TrackNo} '{track.TrackName}': singer not found");
                }
            }
            return project;
        }

        static bool PartReady(UVoicePart part) {
            if (!part.PhonemesUpToDate) return false;
            long gen = (long)GenField.GetValue(part);
            long applied = (long)AppliedField.GetValue(part);
            var gate = (OpenUtau.Core.Pipeline.PhraseBuildGate)GateField.GetValue(part);
            return gate.IsCurrent(gen) && (applied == gen || part.notes.Count == 0);
        }

        static void WaitReady(UProject project, string stage, double timeoutSec = 600) {
            var parts = project.parts.OfType<UVoicePart>().ToArray();
            var sw = Stopwatch.StartNew();
            bool ok = ui.PumpUntil(() => parts.All(PartReady), TimeSpan.FromSeconds(timeoutSec));
            Console.Error.WriteLine($"ourender: {stage}: {parts.Count(PartReady)}/{parts.Length} parts ready in {sw.Elapsed.TotalSeconds:f1} s");
            if (!ok) throw new TimeoutException($"{stage}: parts not ready after {timeoutSec} s");
        }

        static List<string> Problems(UProject project, IEnumerable<UVoicePart> parts) {
            var list = new List<string>();
            foreach (var part in parts) {
                foreach (var n in part.notes.Where(n => n.Error)) {
                    list.Add($"{part.name}: note '{n.lyric}' at {n.position}{(n.OverlapError ? " overlaps" : "")}");
                }
                foreach (var ph in part.phonemes.Where(ph => ph.Error)) {
                    list.Add($"{part.name}: phoneme '{ph.phoneme}' at {ph.position}: {ph.ErrorException?.Message}");
                }
            }
            return list;
        }

        // ------------------------------------------------------------------ phonemize / render

        static void Process(Dictionary<string, string> opt, bool render, Dictionary<string, object> result) {
            var project = Load(Req(opt, "project"));
            var outDir = Path.GetFullPath(Req(opt, "out"));
            Directory.CreateDirectory(outDir);
            var only = Get(opt, "parts", "").Split(',', StringSplitOptions.RemoveEmptyEntries).ToHashSet();
            var parts = project.parts.OfType<UVoicePart>()
                .Where(p => only.Count == 0 || only.Contains(p.name)).ToList();
            var problems = Problems(project, parts);
            if (problems.Count > 0) {
                Sink.Inst.Errors.AddRange(problems);
                return;
            }
            string pitch = Get(opt, "pitch", "ustx");
            if (render && pitch == "bank") {
                // the bank's pitch model, exactly like "Load rendered pitch" in the piano roll
                foreach (var part in parts) {
                    new LoadRenderedPitch().Run(project, part, new List<UNote>(), DocManager.Inst);
                }
                ui.PumpUntil(() => false, TimeSpan.FromMilliseconds(200));
                DocManager.Inst.ExecuteCmd(new ValidateProjectNotification());
                WaitReady(project, "bank pitch");
            }
            if (opt.TryGetValue("save-ustx", out var savePath)) {
                Ustx.Save(Path.GetFullPath(savePath), project);
            }
            var rendered = new List<object>();
            double audioSec = 0, renderSec = 0;
            foreach (var part in parts) {
                var info = render ? RenderPart(project, part, outDir) : Describe(project, part);
                var name = SafeName(part.name);
                File.WriteAllText(Path.Combine(outDir, name + ".json"), JsonSerializer.Serialize(info, JsonOpts));
                if (info.TryGetValue("render_seconds", out var rs)) renderSec += (double)rs;
                if (info.TryGetValue("audio_seconds", out var aus)) audioSec += (double)aus;
                rendered.Add(name);
            }
            result["parts"] = rendered;
            if (render) {
                result["audio_seconds"] = Math.Round(audioSec, 3);
                result["render_seconds"] = Math.Round(renderSec, 3);
                result["realtime_factor"] = audioSec > 0 ? Math.Round(renderSec / audioSec, 3) : 0;
            }
        }

        static Dictionary<string, object> Describe(UProject project, UVoicePart part) {
            var track = project.tracks[part.trackNo];
            var ax = project.timeAxis;
            var notes = part.notes.ToList();
            return new Dictionary<string, object> {
                ["part"] = part.name,
                ["comment"] = part.comment,
                ["track"] = track.TrackName,
                ["singer"] = track.Singer?.Id,
                ["phonemizer"] = track.Phonemizer?.GetType().FullName,
                ["position_ms"] = ax.TickPosToMsPos(part.position),
                ["notes"] = notes.Select((n, i) => new Dictionary<string, object> {
                    ["index"] = i, ["lyric"] = n.lyric, ["tone"] = n.tone,
                    ["start_ms"] = Math.Round(ax.TickPosToMsPos(part.position + n.position), 3),
                    ["end_ms"] = Math.Round(ax.TickPosToMsPos(part.position + n.End), 3),
                }).ToArray(),
                ["phonemes"] = part.phonemes.Select(ph => new Dictionary<string, object> {
                    ["note"] = notes.IndexOf(ph.Parent), ["index"] = ph.index, ["phoneme"] = ph.phoneme,
                    ["tick"] = ph.position,
                    ["start_ms"] = Math.Round(ph.PositionMs, 3), ["end_ms"] = Math.Round(ph.EndMs, 3),
                }).ToArray(),
            };
        }

        static Dictionary<string, object> RenderPart(UProject project, UVoicePart part, string outDir) {
            var info = Describe(project, part);
            var ax = project.timeAxis;
            var phrases = part.renderPhrases.ToArray();
            const int sr = 44100;
            var sw = Stopwatch.StartNew();
            var chunks = new List<(double startMs, float[] samples)>();
            var phraseInfo = new List<object>();
            var f0 = new List<object>();
            using var cts = new CancellationTokenSource();
            var renderer = project.tracks[part.trackNo].RendererSettings.Renderer
                ?? throw new Exception($"{part.name}: track has no renderer");
            foreach (var phrase in phrases) {
                var t = Stopwatch.StartNew();
                // OpenUtau keeps a 16-bit copy of every rendered phrase; reading that back would
                // make a second render differ (quantised) from the first. The tensor cache below
                // it holds the exact model outputs, so drop the phrase copy and go through it.
                foreach (var f in Directory.GetFiles(PathManager.Inst.CachePath, $"ds-{phrase.hash:x16}-*.wav")) {
                    File.Delete(f);
                }
                var task = renderer.Render(phrase, new Progress(phrase.phones.Length), part.trackNo, cts, false);
                // the renderer runs on the thread pool; keep pumping in case it posts back
                ui.PumpUntil(() => task.IsCompleted, TimeSpan.FromMinutes(30));
                var res = task.Result;
                if (res.samples == null) throw new Exception($"{part.name}: phrase at {phrase.position} rendered nothing");
                double startMs = phrase.positionMs - phrase.leadingMs;
                chunks.Add((startMs, res.samples));
                phraseInfo.Add(new Dictionary<string, object> {
                    ["start_ms"] = Math.Round(startMs, 3), ["position_ms"] = Math.Round(phrase.positionMs, 3),
                    ["leading_ms"] = Math.Round(phrase.leadingMs, 3), ["samples"] = res.samples.Length,
                    ["render_seconds"] = Math.Round(t.Elapsed.TotalSeconds, 3),
                    ["phonemes"] = string.Join(" ", phrase.phones.Select(p => p.phoneme)),
                });
                // the pitch curve given to the acoustic model (5-tick grid from position - leading)
                int tick0 = phrase.position - phrase.leading;
                f0.Add(new Dictionary<string, object> {
                    ["t_ms"] = phrase.pitches.Select((_, i) => Math.Round(ax.TickPosToMsPos(tick0 + 5 * i), 3)).ToArray(),
                    ["midi"] = phrase.pitches.Select(c => Math.Round(c / 100.0, 4)).ToArray(),
                });
            }
            double partMs = ax.TickPosToMsPos(part.position);
            double origin = chunks.Count == 0 ? partMs : Math.Min(partMs, chunks.Min(c => c.startMs));
            int total = chunks.Count == 0 ? 0 : chunks.Max(c => (int)Math.Round((c.startMs - origin) * sr / 1000.0) + c.samples.Length);
            var mix = new float[total];
            foreach (var (startMs, samples) in chunks) {
                int o = (int)Math.Round((startMs - origin) * sr / 1000.0);
                for (int i = 0; i < samples.Length; i++) mix[o + i] += samples[i];
            }
            var name = SafeName(part.name);
            WriteWavFloat(Path.Combine(outDir, name + ".wav"), mix, sr);
            info["wav"] = name + ".wav";
            info["sample_rate"] = sr;
            info["start_ms"] = Math.Round(origin, 3);
            info["phrases"] = phraseInfo;
            info["f0"] = f0;
            info["audio_seconds"] = Math.Round(total / (double)sr, 3);
            info["render_seconds"] = Math.Round(sw.Elapsed.TotalSeconds, 3);
            Console.Error.WriteLine($"ourender: {part.name}: {total / (double)sr:f2} s audio in {sw.Elapsed.TotalSeconds:f2} s");
            return info;
        }

        // ------------------------------------------------------------------ example ustx

        static void Example(string outPath) {
            var project = Ustx.Create();
            project.name = "ourender example";
            project.tempos = new List<UTempo> { new UTempo(0, 172) };
            project.timeSignatures = new List<UTimeSignature> { new UTimeSignature(0, 4, 4) };
            var track = new UTrack(project) { TrackNo = 0, TrackName = "example" };
            project.tracks = new List<UTrack> { track };
            var part = new UVoicePart { name = "L1", comment = "example", trackNo = 0, position = 960 };
            var note = UNote.Create();
            note.position = 480; note.duration = 480; note.tone = 60; note.lyric = "la[l aa]";
            note.pitch.data.Add(new PitchPoint(0, 0));
            note.GetPhonemeOverride(0).offset = -30;
            part.notes.Add(note);
            var curve = new UCurve(project.expressions[Ustx.PITD]);
            curve.Set(480, 10, 480, 0);
            curve.Set(600, -15, 480, 0);
            part.curves.Add(curve);
            project.parts = new List<UPart> { part };
            project.ValidateFull();
            Ustx.Save(Path.GetFullPath(outPath), project);
        }

        // ------------------------------------------------------------------ helpers

        static string SafeName(string s) {
            var bad = Path.GetInvalidFileNameChars();
            return new string(s.Select(c => bad.Contains(c) || c == ' ' ? '_' : c).ToArray());
        }

        static void WriteWavFloat(string path, float[] x, int sr) {
            using var fs = new FileStream(path, FileMode.Create);
            using var w = new BinaryWriter(fs);
            int dataBytes = x.Length * 4;
            w.Write(Encoding.ASCII.GetBytes("RIFF")); w.Write(36 + dataBytes);
            w.Write(Encoding.ASCII.GetBytes("WAVE"));
            w.Write(Encoding.ASCII.GetBytes("fmt ")); w.Write(16); w.Write((short)3); w.Write((short)1);
            w.Write(sr); w.Write(sr * 4); w.Write((short)4); w.Write((short)32);
            w.Write(Encoding.ASCII.GetBytes("data")); w.Write(dataBytes);
            foreach (var v in x) w.Write(v);
        }

        static Dictionary<string, string> ParseOpts(string[] args) {
            var d = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            for (int i = 0; i < args.Length; i++) {
                if (!args[i].StartsWith("--")) throw new ArgumentException($"unexpected argument {args[i]}");
                var key = args[i].Substring(2);
                d[key] = i + 1 < args.Length && !args[i + 1].StartsWith("--") ? args[++i] : "true";
            }
            return d;
        }
        static string Get(Dictionary<string, string> o, string k, string dflt) => o.TryGetValue(k, out var v) ? v : dflt;
        static string Req(Dictionary<string, string> o, string k) =>
            o.TryGetValue(k, out var v) && !string.IsNullOrEmpty(v) ? v : throw new ArgumentException($"missing --{k}");
        static void Emit(object o) => Console.WriteLine(JsonSerializer.Serialize(o, JsonOpts));
    }
}
