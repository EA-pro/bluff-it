"""Drive to RESULT, click 'Next round', report what happens + any errors."""
import os, time
from playwright.sync_api import sync_playwright

URL = os.environ.get("BLUFF_URL", "http://127.0.0.1:8765/")
CHROME = "/home/ubuntu/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome"

def main():
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
        page = browser.new_page(viewport={"width": 420, "height": 860})
        errors = []
        page.on("pageerror", lambda e: errors.append("PAGEERROR: " + str(e)))
        page.on("console", lambda m: errors.append("CONSOLE: " + m.text) if m.type == "error" else None)

        def text(): return page.evaluate("() => document.body.innerText")

        def click_text(t, exact=False):
            ok = page.evaluate("""(args) => {
                const [needle, exact] = args;
                const els = Array.from(document.querySelectorAll('div,span,p,a,button'));
                const matches = [];
                for (const el of els) {
                    const s = (el.innerText || '').trim();
                    if (exact ? s === needle : s.includes(needle)) matches.push(el);
                }
                if (!matches.length) return false;
                const clickable = (el) => {
                    let node = el;
                    for (let i = 0; i < 6 && node; i++) {
                        const cs = getComputedStyle(node);
                        if (cs.cursor === 'pointer' || node.getAttribute('role')==='button') return node;
                        node = node.parentElement;
                    }
                    return null;
                };
                let best = null;
                for (const m of matches) { const c = clickable(m); if (c) best = c; }
                if (!best) best = matches[matches.length - 1];
                const r = best.getBoundingClientRect();
                if (r.width === 0 || r.height === 0) return false;
                const x = r.x + r.width/2, y = r.y + r.height/2;
                for (const type of ['pointerdown','mousedown','pointerup','mouseup','click']) {
                    best.dispatchEvent(new MouseEvent(type, {bubbles:true, cancelable:true, clientX:x, clientY:y}));
                }
                return true;
            }""", [t, exact])
            return bool(ok)

        def wait_text(t, timeout=10):
            t0 = time.time()
            while time.time() - t0 < timeout:
                if t in text(): return True
                time.sleep(0.2)
            return False

        page.goto(URL, wait_until="networkidle"); time.sleep(2)
        click_text("Let's play"); time.sleep(0.8)
        for n in ["Eva", "Jonas"]:
            page.fill("input", n); time.sleep(0.2)
            click_text("Add player"); time.sleep(0.5)
        click_text("Start the chaos"); time.sleep(1.2)
        assert wait_text("THE QUESTION"), "no reading"
        click_text("Continue"); time.sleep(1.0)

        guesses = ["42", "1750"]; gi = 0; t0 = time.time()
        while gi < 2 and time.time() - t0 < 40:
            t = text()
            if "I'm ready" in t: click_text("I'm ready"); time.sleep(0.8); continue
            if "is guessing" in t and "Lock it in" in t:
                for ch in guesses[gi]:
                    click_text(ch, exact=True); time.sleep(0.12)
                click_text("Lock it in"); time.sleep(0.9); gi += 1
            else: time.sleep(0.3)
        assert gi == 2, f"guesses stuck {gi}/2"
        assert wait_text("THE TRUTH IS"), "no reveal"
        click_text("To the picking"); time.sleep(0.8)

        picks = 0; t0 = time.time()
        while time.time() - t0 < 30 and picks < 2:
            t = text()
            if "I'm ready" in t: click_text("I'm ready"); time.sleep(0.8); continue
            if "Which guess is the best one?" in t:
                click_text("TAP", exact=True); time.sleep(0.9); picks += 1
            else: time.sleep(0.3)
        assert picks == 2, f"picks stuck {picks}/2"
        assert wait_text("ROUND VERDICT"), "no result"

        print("AT RESULT. Clicking Next round...")
        clicked = click_text("Next round")
        print("click returned:", clicked)
        time.sleep(2)
        print("TEXT AFTER CLICK:", text()[:300].replace("\n", " | "))
        if errors:
            print("\nERRORS:")
            for e in errors[:15]: print("  -", e[:250])
        browser.close()

main()
