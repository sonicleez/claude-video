import re
def ts(s):
    h,m,r=s.split(":");sec,ms=r.split(",");return int(h)*3600+int(m)*60+int(sec)+int(ms)/1000
def a(t):
    t=max(t,0);h=int(t//3600);m=int(t%3600//60);s=t%60;return f"{h}:{m:02d}:{s:05.2f}"
subs=[]
for blk in open("voice.srt",encoding="utf-8").read().strip().split("\n\n"):
    l=blk.split("\n");st,en=l[1].split(" --> ");txt=" ".join(l[2:])
    txt=txt.replace("Itera không chín","ITERA09").replace("Itera","ITERA").replace("mười video","10 video")
    subs.append((ts(st),ts(en),txt))
END=24.3
head="""[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Big,Inter,104,&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,1,0,0,0,100,100,0,0,1,6,0,5,80,80,0,1
Style: Accent,Inter,92,&H0047D7FF,&H0047D7FF,&H00000000,&H64000000,1,0,0,0,100,100,0,0,1,6,0,5,80,80,0,1
Style: Mid,Inter,60,&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,1,0,0,0,100,100,0,0,1,4,0,5,90,90,0,1
Style: Box,Inter,44,&H00B4B4B4,&H00B4B4B4,&H00000000,&H00000000,0,1,0,0,100,100,0,0,1,0,0,5,90,90,0,1
Style: Sub,Inter,58,&H00FFFFFF,&H00FFFFFF,&H00000000,&HA0000000,1,0,0,0,100,100,0,0,3,14,0,2,90,90,330,1
Style: Corner,Inter,34,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,3,10,0,9,40,40,70,1
Style: Tag,Inter,40,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,1,0,0,0,100,100,0,0,1,0,0,8,40,40,170,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
pop=r"{\fad(120,0)\t(0,180,\fscx108\fscy108)\t(180,320,\fscx100\fscy100)}"
ev=[]
def E(s,e,style,t,layer=1): ev.append(f"Dialogue: {layer},{a(s)},{a(e)},{style},,0,0,0,,{t}")
# corner + day tag through whole video
E(0,END,"Corner","Voice by ITERA")
E(0,END,"Tag",r"{\alpha&H40&}NGÀY 9 · AFFILIATE")
# Scene 1 hook (0 - 4.7)
E(0.0,4.7,"Big",pop+r"{\pos(540,620)}Video affiliate")
E(0.5,4.7,"Accent",pop+r"{\pos(540,770)}KHÔNG lộ mặt")
E(1.6,4.7,"Accent",pop+r"{\pos(540,900)}KHÔNG cần nói")
# Scene 2 product (4.7 - 12.8)
E(4.7,12.8,"Box",r"{\pos(540,560)}[ CẢNH QUAY: cận tay cầm bình giữ nhiệt ]")
E(6.1,12.8,"Mid",pop+r"{\pos(540,720)}Đá còn nguyên sáng → chiều")
E(9.3,12.8,"Mid",pop+r"{\pos(540,830)}Giá < 1 ly trà sữa")
E(11.3,12.8,"Accent",pop+r"{\pos(540,960)}Link ở giỏ hàng")
# Scene 3 reveal (12.8 - 19.4)
E(12.9,19.4,"Big",pop+r"{\pos(540,600)}Giọng này là AI")
E(14.0,19.4,"Mid",pop+r"{\pos(540,740)}An Nhiên · ITERA")
E(15.6,19.4,"Accent",pop+r"{\pos(540,880)}24 giây = 433 credit")
# Scene 4 CTA (19.4 - end)
E(19.4,END,"Mid",pop+r"{\pos(540,560)}Nhập mã")
E(19.6,END,"Big",pop+r"{\fs150\pos(540,720)}ITERA09")
E(20.8,END,"Mid",pop+r"{\pos(540,880)}Link ở bio")
for s,e,t in subs: E(s,e,"Sub",t,2)
open("overlay.ass","w",encoding="utf-8").write(head+"\n".join(ev)+"\n")
