"""Runtime probe: visit Shop + Loot Box tabs, crack a box, claim the daily bonus."""
import json
import time
from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:8765/"
CODE = "efrim"
CHROME = "/home/ubuntu/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome"

WALLET = {"coins": 500, "ownedAvatars": [], "ownedCategories": [], "catPasses": {},
          "daily": {"lastClaim": "", "streak": 0}, "spins": {"lastFree": "", "lastAd": ""},
          "spinsUsed": 0, "history": []}

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

        def snap(label):
            print(f"--- {label} ---")
            print(text()[:600].replace("\n", " | "))
            print()

        # gate
        page.goto(URL, wait_until="networkidle")
        time.sleep(2)
        page.fill("input", CODE)
        time.sleep(0.3)
        assert click_text("UNLOCK"), "unlock failed"
        assert wait_text("The party bluff game", 10), "home not reached"
        snap("HOME")
        t = text()
        assert "Daily bonus" not in t, "daily card still on home!"
        assert "🪙 500" not in t.split("How it works")[0], "coin balance still on home!"
        assert "Shop · daily bonus + coins" in t, "shop hint pill missing on home"
        assert "⚙️ Settings" in t and t.count("⚙") == 1, f"gear icons = {t.count('⚙')} (want exactly 1)"

        # SHOP tab — daily bonus card + claim
        ls_raw = page.evaluate("() => localStorage.getItem('bluff_wallet_v1')")
        print("localStorage wallet:", ls_raw)
        assert click_text("Shop", exact=True), "shop tab not found"
        time.sleep(2.0)
        if not wait_text("Daily bonus", 8):
            print("FAIL DUMP: errors so far:")
            for e in errors[:10]:
                print("  -", e[:300])
            print("body:", text()[:800].replace("\n", " | "))
            raise SystemExit(1)
        snap("SHOP")
        t = text()
        assert "Daily bonus" in t, "daily card missing from shop!"
        assert "🪙 500" in t, "balance missing from shop"
        assert click_text("CLAIM", exact=True), "claim button not found"
        time.sleep(1.5)
        t = text()
        print("after claim — 'Claimed' state:", "Claimed" in t or "back tomorrow" in t)
        snap("SHOP-AFTER-CLAIM")
        coins = page.evaluate("() => JSON.parse(localStorage.getItem('bluff_wallet_v1')).coins")
        print(f"wallet coins after daily claim: {coins} (expect 550)")
        assert coins == 550, f"daily claim did not grant 50: {coins}"

        # LOOT BOX tab
        assert click_text("Loot Box", exact=True), "loot box tab not found"
        time.sleep(1.2)
        t = text()
        assert "Loot Box" in t and "CRACK IT OPEN" in t, "loot box screen wrong: " + t[:200]
        assert "Gacha" not in t and "FOMO" not in t, "old naming leaked: " + t[:300]
        assert "SECRET DROP" in t, "secret drop badge missing"
        snap("LOOT-BOX")

        # crack it (50 coins, 450 left)
        assert click_text("CRACK IT OPEN"), "crack button not found"
        time.sleep(3.2)  # shake + lid
        t = text()
        snap("LOOT-RESULT")
        assert "YOU WON" in t or "EXCLUSIVE!" in t, "no result card after crack: " + t[:400]
        assert click_text("OK", exact=True), "OK button not found"
        time.sleep(1.0)
        t = text()
        assert "YOU WON" not in t, "result card did not close"
        snap("LOOT-AFTER")

        # free box still available
        assert "FREE BOX ready!" in text(), "free box button missing"

        if errors:
            print("JS/CONSOLE ERRORS:")
            for e in errors[:15]:
                print("  -", e[:250])
        else:
            print("No JS errors.")
        browser.close()
        print("TAB PROBE OK")

if __name__ == "__main__":
    main()
