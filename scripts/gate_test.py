"""Deterministic premium-gate test: fresh profile, free game already used today
=> starting a game must show the premium sheet; buying it must unlock."""
import time
from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:8765/"
CHROME = "/home/ubuntu/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome"

def main():
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
        ctx = browser.new_context(viewport={"width": 420, "height": 860})
        page = ctx.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        # mark today's free game as USED, no premium
        page.add_init_script(
            "try { localStorage.setItem('bluff_free_day', new Date().toISOString().slice(0,10)); } catch(e) {}"
        )

        def text():
            return page.evaluate("() => document.body.innerText")

        def click_text(t, exact=False):
            return bool(page.evaluate(
                """(args) => {
                    const [needle, exact] = args;
                    const els = Array.from(document.querySelectorAll('div,span,p,a,button'));
                    let best = null;
                    for (const el of els) {
                        const s = (el.innerText || '').trim();
                        if (exact ? s === needle : s.includes(needle)) best = el;
                    }
                    if (!best) return false;
                    let node = best;
                    for (let i = 0; i < 6 && node; i++) {
                        const cs = getComputedStyle(node);
                        if (cs.cursor === 'pointer' || node.getAttribute('role')==='button') break;
                        node = node.parentElement;
                    }
                    const r = (node || best).getBoundingClientRect();
                    if (r.width === 0 || r.height === 0) return false;
                    const x = r.x + r.width/2, y = r.y + r.height/2;
                    for (const type of ['pointerdown','mousedown','pointerup','mouseup','click']) {
                        (node || best).dispatchEvent(new MouseEvent(type, {bubbles:true, cancelable:true, clientX:x, clientY:y}));
                    }
                    return true;
                }""", [t, exact]))

        page.goto(URL, wait_until="networkidle")
        time.sleep(2)
        click_text("Los geht's")
        time.sleep(0.8)
        for name in ["Eva", "Jonas"]:
            page.fill("input", name)
            time.sleep(0.2)
            click_text("Hinzufügen")
            time.sleep(0.4)
        note = "Free: 1 Spiel pro Tag" in text()
        print("free-tier note visible before start:", note)
        assert note, "free-tier note missing"

        click_text("Spiel starten")
        time.sleep(1.5)
        fired = "kostenloses Spiel schon weg" in text()
        print("premium gate FIRED:", fired)
        print("sheet text:", text()[:300].replace("\n", " | "))
        assert fired, "premium gate did not fire"

        # game must NOT have started
        assert "Die Frage" not in text(), "game started despite gate"

        click_text("Premium holen")
        time.sleep(2.0)
        ls = page.evaluate("() => localStorage.getItem('bluff_premium')")
        unlocked = ls == "1"
        print("premium flag set in localStorage after demo buy:", unlocked)
        print("note now:", "Premium aktiv" in text(), "|", text()[:260].replace("\n", " | ")[-120:])
        assert ls == "1", "unlock did not persist"

        # now starting should work regardless of the used free day
        click_text("Spiel starten")
        time.sleep(1.5)
        started = "Die Frage" in text()
        print("game starts after unlock:", started)
        assert started, "game did not start after unlock"

        if errors:
            print("JS ERRORS:", errors[:5])
        else:
            print("No JS errors.")
        browser.close()
        print("GATE TEST OK")

if __name__ == "__main__":
    main()
