"""Diff SSR html vs client-rendered html for the prod and dev builds."""
import urllib.request, time, re, difflib
from playwright.sync_api import sync_playwright

CHROME = "/home/ubuntu/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome"

def norm(s):
    # strip tags, collapse whitespace
    s = re.sub(r"<[^>]+>", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s

def main():
    for name, url in [("PROD", "http://127.0.0.1:8765/"), ("DEV", "http://127.0.0.1:8766/")]:
        ssr = urllib.request.urlopen(url, timeout=15).read().decode("utf-8", "ignore")
        with sync_playwright() as pw:
            b = pw.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
            p = b.new_page(viewport={"width": 420, "height": 860})
            p.goto(url, wait_until="networkidle")
            time.sleep(1.5)
            client = p.evaluate("() => document.body.innerHTML")
            b.close()
        a, c = norm(ssr), norm(client)
        print(f"== {name} == ssr_len={len(a)} client_len={len(c)} match={a == c}")
        if a != c:
            sm = difflib.SequenceMatcher(None, a, c)
            for tag, i1, i2, j1, j2 in sm.get_opcodes():
                if tag != "equal":
                    print(f"  [{tag}] ssr:{a[i1:i2][:150]!r} -> client:{c[j1:j2][:150]!r}")

main()
