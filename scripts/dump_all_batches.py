import os
import sys
from analyze_messages import TelegramHTMLParser

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

html_path = os.path.join("ChatExport_2026-10-06", "messages.html")
with open(html_path, "r", encoding="utf-8") as f:
    content = f.read()

parser = TelegramHTMLParser()
parser.feed(content)

for i, msg in enumerate(parser.messages):
    if msg['text'] or msg['photos']:
        text_preview = msg['text'].replace('\n', ' ')
        photos = msg['photos']
        print(f"[{msg['id']}] joined={msg['joined']} | Photos: {len(photos)} | Text: {text_preview}")
