# Synthesizes original SFX + a light beat bed (no third-party samples).
import numpy as np, wave
SR=44100
rng=np.random.default_rng(7)
def save(name,x,peak=0.9):
    x=x/ (np.max(np.abs(x))+1e-9)*peak
    if x.ndim==1: x=np.stack([x,x],1)
    with wave.open(f"public/{name}.wav","wb") as w:
        w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes((x*32767).astype(np.int16).tobytes())
def env(n,a,d): t=np.arange(n)/SR; return np.minimum(t/a,1)*np.exp(-t/d)
def lp(x,alpha):
    y=np.zeros_like(x);acc=0.
    for i,v in enumerate(x): acc+=alpha*(v-acc); y[i]=acc
    return y
def sweep_noise(dur,f0,f1,rev=False):
    n=int(SR*dur);x=rng.standard_normal(n);a=np.linspace(f0,f1,n)
    y=np.zeros(n);acc=0.;acc2=0.
    for i in range(n): acc+=a[i]*(x[i]-acc); acc2+=a[i]*(acc-acc2); y[i]=acc-acc2*0.5
    e=np.sin(np.linspace(0,np.pi,n))**2
    return y*e
save("whoosh",sweep_noise(0.45,0.02,0.6))
save("riser",sweep_noise(1.2,0.01,0.5)*np.linspace(0.2,1,int(SR*1.2)),0.6)
t=np.arange(int(SR*0.18))/SR
save("pop",np.sin(2*np.pi*(900-2500*t)*t)*env(len(t),0.002,0.04))
t=np.arange(int(SR*0.05))/SR
save("click",(rng.standard_normal(len(t))*0.4+np.sin(2*np.pi*2200*t))*env(len(t),0.0005,0.008),0.5)
t=np.arange(int(SR*1.4))/SR
boom=np.sin(2*np.pi*(55+90*np.exp(-t*18))*t)*env(len(t),0.003,0.35)+lp(rng.standard_normal(len(t)),0.08)*env(len(t),0.001,0.08)
save("impact",boom)
t=np.arange(int(SR*0.9))/SR
save("ding",(np.sin(2*np.pi*1318.5*t)+0.6*np.sin(2*np.pi*1975.5*t)+0.3*np.sin(2*np.pi*2637*t))*env(len(t),0.002,0.25),0.6)
t=np.arange(int(SR*0.25))/SR
save("glitch",np.sign(np.sin(2*np.pi*180*t))*rng.random(len(t))*env(len(t),0.001,0.08)*0.6,0.5)
# beat bed 30s, 112bpm: kick, clap, hats, sub bass + soft pad
bpm=112;beat=60/bpm;L=30;N=int(SR*L);mix=np.zeros(N)
def add(x,at,g=1.):
    i=int(at*SR);j=min(N,i+len(x));mix[i:j]+=x[:j-i]*g
kt=np.arange(int(SR*0.4))/SR;kick=np.sin(2*np.pi*(48+110*np.exp(-kt*30))*kt)*env(len(kt),0.002,0.12)
ht=np.arange(int(SR*0.05))/SR;hat=np.diff(np.concatenate([[0],rng.standard_normal(len(ht))]))*env(len(ht),0.0005,0.012)
ct=np.arange(int(SR*0.2))/SR;clap=lp(rng.standard_normal(len(ct)),0.35)*env(len(ct),0.001,0.05)
chords=[(57,60,64),(53,57,60),(48,52,55),(55,59,62)]  # Am F C G
mid=lambda m:440*2**((m-69)/12)
nb=int(L/beat)
for b in range(nb):
    tb=b*beat
    if b%4 in(0,2) or (b%8==7): add(kick,tb,1.0)
    if b%4 in(1,3): add(clap,tb,0.35)
    add(hat,tb+beat/2,0.18); add(hat,tb,0.08)
for bar in range(int(nb/4)+1):
    ch=chords[bar%4];tb=bar*4*beat;dur=4*beat;tt=np.arange(int(SR*dur))/SR
    pad=sum(np.sin(2*np.pi*mid(m)*tt)+0.3*np.sin(2*np.pi*mid(m)*2.003*tt) for m in ch)
    pad*=np.minimum(tt/0.4,1)*np.minimum((dur-tt)/0.4,1)
    add(pad,tb,0.05)
    bass=np.sin(2*np.pi*mid(ch[0]-24)*tt)*np.minimum(tt/0.02,1)*np.minimum((dur-tt)/0.1,1)
    add(bass,tb,0.22)
fade=np.ones(N);fade[-int(SR*1.5):]=np.linspace(1,0,int(SR*1.5))
save("beat",np.tanh(mix*1.4)*fade,0.8)
print("ok")
