"""TẠO GIỌNG ĐỌC TỰ NHIÊN (Microsoft Neural, miễn phí, không cần khóa) CHO GAME
Cần: Python 3.9+, Node.js, ffmpeg  ·  pip install edge-tts
Chạy:  python tools/tao_giong_doc.py            (tạo đủ 4 giọng, chỉ tạo câu còn thiếu)
       python tools/tao_giong_doc.py thay       (chỉ một giọng)
Kết quả: audio/voice/<giọng>/*.mp3 + manifest.json, audio/voice/voices.json — game tự nhận.
Thêm truyện / câu tụng mới thì chạy lại, chỉ những câu mới được tạo."""
import asyncio, hashlib, json, os, subprocess, sys, tempfile, unicodedata, re
import edge_tts

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOICES = [  # id, tên hiện trong game, giọng gốc, tốc độ, cao độ
    ('thay', 'Thầy trụ trì · nam trầm ấm', 'vi-VN-NamMinhNeural', -12, '-8Hz'),
    ('nisu', 'Ni sư · nữ hiền từ', 'vi-VN-HoaiMyNeural', -10, '-4Hz'),
    ('phattu', 'Cô Phật tử · nữ trong trẻo', 'vi-VN-HoaiMyNeural', -2, '+2Hz'),
    ('chutieu', 'Chú tiểu · nam trẻ', 'vi-VN-NamMinhNeural', -3, '+8Hz'),
]
EXTRA = ['Nam mô A Di Đà Phật', 'A Di Đà Phật. Chào mừng quý Phật tử về thăm chùa.']
key = lambda t: re.sub(r'\s+', ' ', unicodedata.normalize('NFC', t)).strip()

def texts():
    js = r"""const vm=require('vm'),fs=require('fs'),p=require('path');const ctx={};ctx.window=ctx;vm.createContext(ctx);
for(const f of ['config.js','content.js','stories.js','temples.js'])vm.runInContext(fs.readFileSync(p.join(process.argv[1],'js',f),'utf8'),ctx);
const C=ctx.CBA,o=[];Object.values(C.texts).forEach(a=>a.forEach(t=>o.push(t)));
C.stories.forEach(s=>{s.scenes.forEach(t=>o.push(t));o.push('🪷 '+s.moral);if(s.quiz)o.push('Câu đố. '+s.quiz.q)});
C.temples.forEach(t=>t.intro&&o.push(t.intro));console.log(JSON.stringify(o));"""
    out = subprocess.run(['node', '-e', js, ROOT], capture_output=True, text=True, encoding='utf-8', check=True).stdout
    seen, res = set(), []
    for t in EXTRA + json.loads(out):
        k = key(t)
        if k and k not in seen: seen.add(k); res.append(k)
    return res

async def one(sem, vid, voice, rate, pitch, text, outdir, man, px):
    spoken = re.sub(r'^🪷\s*', '', text)
    mantra = bool(re.match(r'^(Nam [Mm]ô|Án |Ma ha|Yết đế)', spoken))
    name = hashlib.md5(text.encode('utf-8')).hexdigest()[:12] + '.mp3'
    async with sem:
        for attempt in range(4):
            try:
                with tempfile.TemporaryDirectory() as td:
                    raw = os.path.join(td, 'a.mp3')
                    await edge_tts.Communicate(spoken, voice, rate=f'{rate - (8 if mantra else 0):+d}%', pitch=pitch, proxy=px).save(raw)
                    # nén giọng nói: mono 24 kbps (đủ trong, nhẹ mạng)
                    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', raw, '-ac', '1', '-ar', '22050', '-b:a', '24k', os.path.join(outdir, name)], check=True)
                man[text] = name
                return True
            except Exception as e:
                await asyncio.sleep(2 + attempt * 3)
        print('  ! bỏ qua:', text[:50])
        return False

async def main():
    want = sys.argv[1:] or [v[0] for v in VOICES]
    px = os.environ.get('HTTPS_PROXY') or os.environ.get('https_proxy')
    all_t = texts(); print(f'{len(all_t)} câu cần đọc')
    base = os.path.join(ROOT, 'audio', 'voice'); os.makedirs(base, exist_ok=True)
    for vid, label, voice, rate, pitch in VOICES:
        if vid not in want: continue
        outdir = os.path.join(base, vid); os.makedirs(outdir, exist_ok=True)
        mp = os.path.join(outdir, 'manifest.json')
        man = json.load(open(mp, encoding='utf-8')) if os.path.exists(mp) else {}
        todo = [t for t in all_t if not (t in man and os.path.exists(os.path.join(outdir, man[t])))]
        print(f'== {label}: tạo {len(todo)} câu mới')
        sem = asyncio.Semaphore(6); done = 0
        for i in range(0, len(todo), 30):
            r = await asyncio.gather(*[one(sem, vid, voice, rate, pitch, t, outdir, man, px) for t in todo[i:i + 30]])
            done += sum(r); json.dump(man, open(mp, 'w', encoding='utf-8'), ensure_ascii=False)
            print(f'   … {done}/{len(todo)}')
        # câu "🪷 lời dạy" và "lời dạy" dùng chung một file
        for t in list(man):
            if t.startswith('🪷 '): man.setdefault(key(t[2:]), man[t])
        json.dump(man, open(mp, 'w', encoding='utf-8'), ensure_ascii=False)
    json.dump([{'id': v[0], 'name': v[1]} for v in VOICES], open(os.path.join(base, 'voices.json'), 'w', encoding='utf-8'), ensure_ascii=False)
    print('Xong.')

asyncio.run(main())
