"""genall.py <shard> <nshards> [ids...]: Kokoro am_michael, speed 0.8, 0.45s sentence pause -> audio/voice/<id>.mp3"""
import json, re, os, sys, subprocess, numpy as np
from kokoro_onnx import Kokoro
K='/workspace/little-engineer-v2/kokoro'
k=Kokoro(f'{K}/kokoro-v1.0.onnx', f'{K}/voices-v1.0.bin')
OUT='/workspace/little-engineer/audio/voice'
lines=json.load(open(f'{OUT}/lines.json'))
shard,n=int(sys.argv[1]),int(sys.argv[2]); only=set(sys.argv[3:])
VOICE='am_michael'; SPEED=0.8; PAUSE=0.45; EDGE=0.12
def prep(t):
    t=re.sub(r"\b([A-Z]{2,})\b", lambda m: m.group(1) if m.group(1) in ('OK','LED','TV') else m.group(1).lower(), t.strip())
    t=re.sub(r'\s+([!?.,;:])', r'\1', t); t=re.sub(r'([!?])\s*\.', r'\1', t)
    if t and t[-1] not in '.!?': t+='.'
    return t
_shh=None
def shh():
    global _shh
    if _shh is None:
        raw=subprocess.run(['ffmpeg','-loglevel','error','-f','lavfi','-i','anoisesrc=color=pink:duration=0.6:sample_rate=24000:amplitude=0.25','-af','highpass=f=2200,lowpass=f=6500,afade=t=in:d=0.12,afade=t=out:st=0.38:d=0.22','-f','f32le','-ac','1','-'],capture_output=True,check=True).stdout
        _shh=np.frombuffer(raw,np.float32).copy()
    return _shh
SPEED_OVERRIDE={'Tap Go!':0.9,'Up!':1.0,'Stuck? Now I can show you how!':0.95}
def synth(text):
    out=[]; sr=24000
    t=re.sub(r'\bShh[,!.]?\s*', 'Shh. ', prep(text))
    for x in [s for s in re.split(r'(?<=[.!?])\s+', t) if s.strip()]:
        if x=='Shh.': out+=[shh(),np.zeros(int(sr*0.3),np.float32)]; continue
        ph=k.tokenizer.phonemize(x,'en-us').replace('sˈælə','səlˈɑː').replace('jˈuːs ','jˈuːz ').replace('jˈuːs!','jˈuːz!').replace('jˈuːsᵻz','jˈuːzᵻz')
        a,sr=k.create(ph,voice=VOICE,speed=SPEED_OVERRIDE.get(text.strip(),SPEED),is_phonemes=True)
        # trim internal leading/trailing silence of each sentence
        idx=np.where(np.abs(a)>0.01)[0]
        if len(idx): a=a[max(0,idx[0]-int(sr*0.03)):idx[-1]+int(sr*0.08)]
        out+=[a,np.zeros(int(sr*PAUSE),np.float32)]
    s=np.concatenate(out[:-1]); pad=np.zeros(int(sr*EDGE),np.float32)
    return np.concatenate([pad,s,pad]),sr
for i,l in enumerate(lines):
    if i%n!=shard or (only and l['id'] not in only): continue
    p=f"{OUT}/{l['id']}.mp3"
    if os.path.exists(p) and not only: continue
    s,sr=synth(l['text'])
    pcm=(np.clip(s,-1,1)*32767).astype(np.int16).tobytes()
    subprocess.run(['ffmpeg','-loglevel','error','-y','-f','s16le','-ar',str(sr),'-ac','1','-i','-','-af','loudnorm=I=-16:TP=-1.5:LRA=11','-ar','24000','-ac','1','-b:a','64k',p+'.tmp.mp3'],input=pcm,check=True)
    os.replace(p+'.tmp.mp3',p); print(l['id'],flush=True)
