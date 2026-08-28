"""Tie verification: seed a tied history entry, check list row + detail crowns."""
import json
import time
from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:8765/"
CODE = "efrim"
CHROME = "/home/ubuntu/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome"

TIED_GAME = {
    "id": "gtie1",
    "ts": int(time.time() * 1000) - 3600_000,
    "mode": "classic",
    "rounds": 2,
    "categories": ["general"],
    "scores": [
        {"name": "Eva", "avatarId": "lion", "score": 6},
        {"name": "Jonas", "avatarId": "panda", "score": 6},
        {"name": "Max", "avatarId": "fox", "score": 2},
    ],
    "badges": [
        {"emoji": "🏆", "label": "Winner", "name": "Eva + Jonas"},
        {"emoji": "🎯", "label": "Best Bluffer", "name": "Eva"},
    ],
}
WALLET = {"coins": 100, "ownedAvatars": [], "ownedCategories": [], "catPasses": {},
          "daily": {"lastClaim": "", "streak": 0}, "spins": {"lastFree": "", "lastAd": ""},
          "spinsUsed": 0, "history": [TIED_GAME], "totalSpent": 0, "lastGameBonus": 0}


def main():
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
        page = browser.new_page(viewport={"width": 420, "height": 860})
        errors = []
        page.on("pageerror", lambda e: errors.append("PAGEERROR: " + str(e)))
        page.on("console", lambda m: errors.append("CONSOLE: " + m.text) if m.type == "error" else None)
        page.add_init_script("try { localStorage.setItem('bluff_wallet_v1', " + json.dumps(json.dumps(WALLET)) + "); } catch(e) {}")

        def text():
            return page.evaluate("() => document.body.innerText")

        def click_text(t, exact=False):
            return bool(page.evaluate(
                """(args) => {
                    const [needle, exact] = args;
                    const els = Array.from(document.querySelectorAll('div,span,p,a,button'));
                    const matches = [];
                    for (const el of els) {
                        const s = (el.innerText || '').trim();
                        if (exact ? s === needle : s.includes(needle)) matches.push(el);
                    }
                    if (!matches.length) return false;
                    let best = matches[matches.length - 1];
                    let node = best;
                    for (let i = 0; i < 6 && node; i++) {
                        const cs = getComputedStyle(node);
                        if (cs.cursor === 'pointer' || node.getAttribute('role')==='button') { best = node; break; }
                        node = node.parentElement;
                    }
                    const r = best.getBoundingClientRect();
                    if (r.width === 0 || r.height === 0) return false;
                    const x = r.x + r.width/2, y = r.y + r.height/2;
                    for (const type of ['pointerdown','mousedown','pointerup','mouseup','click']) {
                        best.dispatchEvent(new MouseEvent(type, {bubbles:true, cancelable:true, clientX:x, clientY:y}));
                    }
                    return true;
                }""", [t, exact]))

        def wait_text(t, timeout=12):
            t0 = time.time()
            while time.time() - t0 < timeout:
                if t in text():
                    return True
                time.sleep(0.2)
            return False

        # gate -> home
        page.goto(URL, wait_until="networkidle")
        time.sleep(2)
        page.fill("input", CODE)
        time.sleep(0.3)
        assert click_text("UNLOCK"), "unlock failed"
        assert wait_text("The party bluff game", 10), "home not reached"

        # history tab
        assert click_text("History", exact=True), "history tab not found"
        time.sleep(1.5)
        t = text()
        assert "Classic" in t or "Klassisch" in t, "history list not reached: " + t[:300]
        assert "👑 Eva + Jonas" in t, "tied row must show BOTH winners: " + t[:400]
        print("ROW OK — tied winners shown in list row")

        # open detail
        assert click_text("Eva + Jonas"), "tied row not clickable"
        time.sleep(1.5)
        t = text()
        assert "SCORE" in t.upper() or "pts" in t.lower(), "detail not reached: " + t[:300]
        crowns = t.count("👑")
        assert "Eva" in t and "Jonas" in t and "Max" in t, "detail rows missing"
        assert crowns >= 2, f"expected 2+ crowns in detail (one per tied winner), got {crowns}"
        print(f"DETAIL OK — {crowns} crowns (tied winners both crowned)")

        # badge shows both names
        assert "Winner: Eva + Jonas" in t, "winner badge missing both names: " + t[:500]
        print("BADGE OK — winner badge names both tied players")

        if errors:
            print("JS/CONSOLE ERRORS:")
            for e in errors[:15]:
                print("  -", e[:250])
            raise SystemExit(1)
        print("No JS errors.")
        browser.close()
        print("TIE PROBE OK")


if __name__ == "__main__":
    main()
