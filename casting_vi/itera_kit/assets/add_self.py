"""Add the creator's own recording as Giọng 2 of Day 01.
Usage: python3 assets/add_self.py path/to/recording.(mp3|wav|m4a)
Then: npx remotion render Day01 out/day01.mp4
"""
import json, subprocess, sys, os
src = sys.argv[1]
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "48000", "-ac", "1",
                "public/day01/v2_self.wav"], check=True)
subprocess.run([sys.executable, "assets/stt.py", "public/day01/v2_self.wav"], check=True)
dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", "public/day01/v2_self.wav"]))
data = json.load(open("src/day01.data.json", encoding="utf-8"))
data["self"] = {"dur": round(dur, 3), "words": json.load(open("public/day01/v2_self.words.json"))}
os.remove("public/day01/v2_self.words.json")
json.dump(data, open("src/day01.data.json", "w", encoding="utf-8"), ensure_ascii=False)
print("Giọng 2 added:", round(dur, 2), "s")
