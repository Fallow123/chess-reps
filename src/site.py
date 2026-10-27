import sys, shutil, subprocess, os
here=os.path.dirname(os.path.abspath(__file__)); site=os.path.join(here,'..')
subprocess.run([sys.executable, os.path.join(here,'build.py'), os.path.join(site,'body.html')], check=True, stdout=subprocess.DEVNULL)
body=open(os.path.join(site,'body.html')).read(); os.remove(os.path.join(site,'body.html'))
body=body.replace('<script src="https://cdn.jsdelivr.net/npm/chess.js@0.10.3/chess.js"></script>','<script src="vendor/chess.js"></script>')
title_end=body.index('</title>')+8
head=body[:title_end]
html='<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'+head+'\n<style>*,*::before,*::after{box-sizing:border-box}body{margin:0}img{max-width:100%}</style>\n</head>\n<body>\n'+body[title_end:]+'\n</body>\n</html>\n'
open(os.path.join(site,'index.html'),'w').write(html)
print('ok', len(html))
