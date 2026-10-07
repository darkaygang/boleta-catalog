import os
import sys
import re
from html.parser import HTMLParser

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

class TelegramHTMLParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.messages = []
        self.current_msg = None
        self.in_text = False
        self.text_buffer = []
        self.in_from_name = False
        self.from_name_buffer = []
        self.in_media_poll = False

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        classes = attrs_dict.get('class', '').split()

        if tag == 'div' and 'message' in classes:
            msg_id = attrs_dict.get('id', '')
            is_joined = 'joined' in classes
            is_service = 'service' in classes
            self.current_msg = {
                'id': msg_id,
                'joined': is_joined,
                'service': is_service,
                'from_name': '',
                'text': '',
                'photos': [],
                'is_poll': False,
                'is_video': False
            }
            self.messages.append(self.current_msg)

        if self.current_msg:
            if tag == 'div' and 'from_name' in classes:
                self.in_from_name = True
                self.from_name_buffer = []
            elif tag == 'div' and 'text' in classes:
                self.in_text = True
                self.text_buffer = []
            elif tag == 'div' and 'media_poll' in classes:
                self.current_msg['is_poll'] = True
            elif tag == 'div' and 'media_video' in classes:
                self.current_msg['is_video'] = True
            elif tag == 'a' and 'photo_wrap' in classes:
                href = attrs_dict.get('href', '')
                if href:
                    self.current_msg['photos'].append(href)

    def handle_endtag(self, tag):
        if tag == 'div' and self.in_from_name:
            self.in_from_name = False
            if self.current_msg:
                self.current_msg['from_name'] = "".join(self.from_name_buffer).strip()
        elif tag == 'div' and self.in_text:
            self.in_text = False
            if self.current_msg:
                self.current_msg['text'] = "".join(self.text_buffer).strip()

    def handle_data(self, data):
        if self.in_from_name:
            self.from_name_buffer.append(data)
        elif self.in_text:
            self.text_buffer.append(data)

def analyze():
    html_path = os.path.join("ChatExport_2026-10-06", "messages.html")
    with open(html_path, "r", encoding="utf-8") as f:
        content = f.read()

    parser = TelegramHTMLParser()
    parser.feed(content)

    print(f"Total messages parsed: {len(parser.messages)}")
    author = ""
    messages_with_photos = 0
    messages_with_text = 0

    for msg in parser.messages:
        if msg['from_name']:
            author = msg['from_name']
        msg['resolved_author'] = author
        if msg['photos']:
            messages_with_photos += 1
        if msg['text']:
            messages_with_text += 1

    print(f"Messages with photos: {messages_with_photos}")
    print(f"Messages with text: {messages_with_text}")

    # Inspect messages with text or photos
    for i, msg in enumerate(parser.messages):
        if msg['text'] or msg['photos']:
            text_preview = msg['text'].replace('\n', ' ')[:70]
            photos_str = f"Photos: {len(msg['photos'])} ({msg['photos'][:1]})" if msg['photos'] else "No photos"
            print(f"[{msg['id']}] (joined={msg['joined']}) {photos_str} | Text: {text_preview}")

if __name__ == "__main__":
    analyze()
