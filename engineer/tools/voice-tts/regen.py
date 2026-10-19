"""regen.py ids...: regenerate with candidate variants, pick best by whisper small.en match."""
import json,re,os,sys,subprocess,difflib,numpy as np
import importlib.util
from kokoro_onnx import Kokoro
from faster_whisper import WhisperModel
K='/workspace/little-engineer-v2/kokoro'; OUT='/workspace/little-engineer/audio/voice'
k=Kokoro(f'{K}/kokoro-v1.0.onnx', f'{K}/voices-v1.0.bin')
m=WhisperModel('small.en',device='cpu',compute_type='int8')
L={l['id']:l['text'] for l in json.load(open(f'{OUT}/lines.json'))}
VOICE='am_michael'; SPEED=0.8; PAUSE=0.45; EDGE=0.12; SR=24000
def prep(t):
    t=re.sub(r"\b([A-Z]{2,})\b", lambda m_: m_.group(1) if m_.group(1) in ('OK','LED','TV') else m_.group(1).lower(), t.strip())
    t=re.sub(r'\s+([!?.,;:])', r'\1', t); t=re.sub(r'([!?])\s*\.', r'\1', t)
    if t and t[-1] not in '.!?': t+='.'
    return t
raw=subprocess.run(['ffmpeg','-loglevel','error','-f','lavfi','-i','anoisesrc=color=pink:duration=0.6:sample_rate=24000:amplitude=0.45','-af','highpass=f=2200,lowpass=f=6500,afade=t=in:d=0.12,afade=t=out:st=0.38:d=0.22','-f','f32le','-ac','1','-'],capture_output=True,check=True).stdout
SHH=np.frombuffer(raw,np.float32).copy()
def segs_of(text,merge):
    t=re.sub(r'\bShh[,!.]?\s*','Shh. ',prep(text))
    ss=[s for s in re.split(r'(?<=[.!?])\s+',t) if s.strip()]
    if merge:
        out=[]; carry=''
        for i,s in enumerate(ss):
            if s=='Shh.': 
                if carry: out.append(carry); carry=''
                out.append(s); continue
            s=(carry+' '+s).strip() if carry else s; carry=''
            if len(s.split())<=2 and i<len(ss)-1 and ss[i+1]!='Shh.': carry=s
            else: out.append(s)
        if carry: out.append(carry)
        # a short last segment joins the previous one
        if len(out)>1 and len(out[-1].split())<=2 and out[-2]!='Shh.': last=out.pop(); out[-1]=out[-1]+' '+last
        ss=out
    return ss
def tts(x,prefix,speed):
    ph=k.tokenizer.phonemize(x,'en-us').replace('sˈælə','səlˈɑː').replace('jˈuːs ','jˈuːz ').replace('jˈuːs!','jˈuːz!').replace('jˈuːsᵻz','jˈuːzᵻz')
    a,_=k.create((', ' if prefix else '')+ph,voice=VOICE,speed=speed,is_phonemes=True)
    idx=np.where(np.abs(a)>0.01)[0]
    if len(idx): a=a[max(0,idx[0]-int(SR*0.03)):idx[-1]+int(SR*0.08)]
    return a
def synth(text,mode,prefix):
    speed=0.9 if text.strip()=='Tap Go!' else SPEED
    ss=segs_of(text,True) if mode=='merge' else [x for x in re.split(r'\s*(Shh\.)\s*',re.sub(r'\bShh[,!.]?\s*','Shh. ',prep(text))) if x.strip()]
    out=[]; first=True
    for x in ss:
        if x=='Shh.': out+=[SHH,np.zeros(int(SR*0.3),np.float32)]; continue
        out+=[tts(x,prefix and first,speed),np.zeros(int(SR*PAUSE),np.float32)]; first=False
    s=np.concatenate(out[:-1]); pad=np.zeros(int(SR*EDGE),np.float32)
    return np.concatenate([pad,s,pad])
NUM={'0':'zero','1':'one','2':'two','3':'three','4':'four','5':'five','6':'six','7':'seven','8':'eight','9':'nine','21':'twentyone'}
HOM={'steal':'steel','around':'round','salaam':'salah','salah':'salah'}
def norm(t):
    t=re.sub(r"[-’']"," ",t.lower()).replace(',000','000').replace('twenty one','21').replace('can not','cannot'); w=re.sub(r"[^a-z0-9 ]","",t).split()
    return [HOM.get(NUM.get(x,x),NUM.get(x,x)) for x in w if x not in ('shh','sh','shush','shhh')]
def score(s,text):
    a16=np.interp(np.arange(0,len(s),1.5),np.arange(len(s)),s).astype(np.float32)
    p=np.concatenate([np.zeros(16000,np.float32),a16,np.zeros(16000,np.float32)])
    h=' '.join(x.text.strip() for x in m.transcribe(p,language='en',condition_on_previous_text=False,temperature=0)[0])
    return difflib.SequenceMatcher(None,norm(text),norm(h)).ratio(),h
for id in sys.argv[1:]:
    text=L[id]; best=None
    for mode,prefix in [('merge',False),('merge',True),('whole',False),('whole',True)]:
        s=synth(text,mode,prefix); r,h=score(s,text)
        if best is None or r>best[0]+1e-9: best=(r,h,s,mode,prefix)
        if r>=0.999: break
    r,h,s,mode,prefix=best
    pcm=(np.clip(s,-1,1)*32767).astype(np.int16).tobytes(); p=f'{OUT}/{id}.mp3'
    subprocess.run(['ffmpeg','-loglevel','error','-y','-f','s16le','-ar',str(SR),'-ac','1','-i','-','-af','loudnorm=I=-16:TP=-1.5:LRA=11','-ar','24000','-ac','1','-b:a','64k',p+'.tmp.mp3'],input=pcm,check=True)
    os.replace(p+'.tmp.mp3',p)
    print('%.2f %s %s%s | %s | %s'%(r,id,mode,'+comma' if prefix else '',text,h),flush=True)
