import json, re, sys, os

S = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(S, "..", "..", "shared", "asas-data-phase8.js")
AR = "٠١٢٣٤٥٦٧٨٩"

def parse(path, title_fn=None, note_fn=None):
    items, cur = [], None
    for raw in open(os.path.join(S, path), encoding="utf-8"):
        line = raw.strip()
        if not line:
            continue
        if line.startswith("## "):
            cur = {"title": line[3:].strip(), "story": [], "comprehension": [], "answers": [], "options": []}
            items.append(cur)
        elif line.startswith("Q "):
            parts = [p.strip() for p in line[2:].split("|")]
            q, opts = parts[0], parts[1:]
            correct = [o[1:].strip() for o in opts if o.startswith("*")]
            assert len(correct) == 1, (path, cur["title"], q)
            opts = [o.lstrip("*").strip() for o in opts]
            assert len(set(opts)) == len(opts) and len(opts) >= 2, (path, q)
            cur["comprehension"].append(q); cur["answers"].append(correct[0]); cur["options"].append(opts)
        elif line.startswith("DS "):
            cur["dictationSentence"] = line[3:].strip()
        elif line.startswith("D "):
            cur["dictationWords"] = [w.strip() for w in line[2:].split("،") if w.strip()]
        elif line.startswith("N "):
            cur["skillNote"] = line[2:].strip()
        elif line.startswith("X "):
            cur.setdefault("extract", []).append(line[2:].strip())
        else:
            cur["story"].append(line)
    for i, it in enumerate(items):
        it["story"] = "\n".join(it["story"])
        if title_fn: it["title"] = title_fn(i, it["title"])
        if note_fn: it["skillNote"] = note_fn(i, it)
        for k in ("comprehension", "answers", "options"):
            if not it[k]: del it[k]
    return items

def ar(n): return "".join(AR[int(d)] for d in str(n))

namazej = parse("namazej.txt")
nafs = parse("nafs.txt",
             title_fn=lambda i, t: f"تدريب نافس {ar(i+1)} — " + re.sub(r"^T\d+\s*", "", t),
             note_fn=lambda i, it: "اقرأ النص جيدًا، ثم أجب عن الأسئلة باختيار الإجابة الصحيحة. (إعداد أ. ذاكر الشمري)")
markaziya = parse("markaziya.txt")

for name, items in (("namazej", namazej), ("nafs", nafs), ("markaziya", markaziya)):
    print(name, len(items), "items,", sum(len(it.get("comprehension", [])) for it in items), "questions")

def js(v): return "[\n  " + ",\n  ".join(json.dumps(x, ensure_ascii=False) for x in v) + "\n]"

src = f"""/* أساس القراءة — Phase 8: ملفات لغتي للصف الثالث الابتدائي (أرسلها محمد 2026-09-29)
   ثلاث مراحل بنفس عناوين الملفات الأصلية:
   ٤٣ نماذج ثالث لغتي (اختبار تشخيصي — ٣ نماذج) · ٤٤ مذكرة نافس لغتي (١٤ تدريبًا، إعداد أ. ذاكر الشمري)
   ٤٥ ملزمة الاختبارات المركزية لغتي ف١ (منصة استعد — النموذج المجاني)
   كل سؤال له خياراته الأصلية من الملف (options) بدل المشتتات العشوائية، والإجابة الصحيحة في answers.
   المراحل مفتوحة دائمًا (free) — مستقلة عن التسلسل، للاستعداد للاختبارات. مولّد من content-source/lughati3/build.py — لا تعدّله يدويًا بدون تحديث المصدر. */

const ASAS_LUGHATI3_NAMAZEJ = {js(namazej)};

const ASAS_LUGHATI3_NAFS = {js(nafs)};

const ASAS_LUGHATI3_MARKAZIYA = {js(markaziya)};

ASAS_STAGES.push(
  {{ id: 43, key: "lughati3-namazej", title: "نماذج ثالث لغتي", icon: "📝", kind: "passage", free: true, items: ASAS_LUGHATI3_NAMAZEJ }},
  {{ id: 44, key: "lughati3-nafs", title: "مذكرة نافس لغتي — الصف الثالث الابتدائي", icon: "🎯", kind: "passage", free: true, items: ASAS_LUGHATI3_NAFS }},
  {{ id: 45, key: "lughati3-markaziya", title: "ملزمة الاختبارات المركزية لغتي — الصف الثالث ف١", icon: "🏅", kind: "passage", free: true, items: ASAS_LUGHATI3_MARKAZIYA }}
);
"""
open(OUT, "w", encoding="utf-8").write(src)
print("wrote", OUT)
