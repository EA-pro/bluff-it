import re
for name in ["/tmp/ssr-dev.html", "/tmp/ssr-prod.html"]:
    html = open(name, encoding="utf-8", errors="ignore").read()
    root = html.split('id="root">')[1][:2000] if 'id="root">' in html else ""
    non_tag = re.sub(r"<[^>]+>", "", root)
    print(f"== {name} ==")
    print("  len:", len(html))
    print("  BLUFF in html:", "BLUFF" in html)
    print("  suspense empty templates:", root.count("<template></template>"))
    print("  root non-tag text:", repr(non_tag.strip()[:120]))
    print()
