"""Probe: reach a classic RESULT screen, watch the points board for 16s, dump errors."""
import time
from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:8765/"
CODE = "efrim"
CHROME = "/home/ubuntu/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome"

def main():
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
        page = browser.new_page(viewport={"width": 420, "height": 860})
        errors = []
        page.on("pageerror", lambda e: errors.append("PAGEERROR: " + str(e)))
        page.on("console", lambda m: errors.append("CONSOLE[" + m.type + "]: " + m.text) if m.type in ("error",) else None)

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
                }""", [t, exact]))

        def wait_text(t, timeout=15):
            t0 = time.time()
            while time.time() - t0 < timeout:
                if t in text():
                    return True
                time.sleep(0.2)
            return False

        def type_number(digits):
            for ch in digits:
                assert click_text(ch, exact=True), f"keypad digit {ch} not found"
                time.sleep(0.12)

        # gate
        page.goto(URL, wait_until="networkidle")
        time.sleep(2)
        page.fill("input", CODE)
        time.sleep(0.3)
        assert click_text("UNLOCK")
        assert wait_text("The party bluff game", 10), "home not reached"

        # classic
        assert click_text("PLAY NOW")
        assert wait_text("Who's playing?")
        for name in ["Eva", "Jonas"]:
            page.fill("input", name); time.sleep(0.2)
            assert click_text("Add player"); time.sleep(0.5)
        assert click_text("10", exact=True); time.sleep(0.4)
        assert click_text("2", exact=True); time.sleep(0.4)
        assert click_text("Start the chaos"); time.sleep(1.2)
        assert wait_text("THE QUESTION")
        assert click_text("Read it! Continue") or click_text("Next"); time.sleep(1.0)

        # guess relay (robust: clear any leftover digits before typing)
        done = 0
        t0 = time.time()
        while done < 2 and time.time() - t0 < 60:
            t = text()
            if "ready — go!" in t:
                assert click_text("ready — go!"), "handoff failed"
                time.sleep(1.0)
                continue
            if "Lock it in" in t:
                # wipe the current input (leftover digits from the previous player's keypad)
                for _ in range(6):
                    click_text("⌫", exact=True)
                    time.sleep(0.08)
                time.sleep(0.2)
                for ch in ["42", "1750"][done]:
                    assert click_text(ch, exact=True), f"keypad digit {ch} not found"
                    time.sleep(0.15)
                for _ in range(6):
                    if click_text("Lock it in"):
                        break
                    time.sleep(0.4)
                assert click_text("Lock it in") or "Lock it in" not in text(), f"lock failed for guess {done}"
                time.sleep(1.2)
                done += 1
            else:
                time.sleep(0.4)

        assert wait_text("The guesses are in", 12), "reveal not reached :: " + text()[-500:].replace("\n", " | ")
        time.sleep(0.5)
        assert click_text("To the votes") or click_text("arguing"); time.sleep(0.8)

        # vote relay
        picks = 0
        t0 = time.time()
        while time.time() - t0 < 40 and picks < 2:
            t = text()
            if "ready — go!" in t:
                assert click_text("ready — go!"); time.sleep(0.7); continue
            if "Which one is REAL?" in t:
                advanced = False
                for letter in ("B", "A", "C"):
                    if click_text(letter, exact=True):
                        time.sleep(1.5)
                        if "Which one is REAL?" not in text():
                            advanced = True; break
                picks += 1
                assert advanced
            else:
                time.sleep(0.3)

        assert wait_text("The truth was", 15), "result not reached"
        print("AT RESULT. Watching for the points board...")

        saw_board = False
        saw_pts = False
        t0 = time.time()
        last = ""
        while time.time() - t0 < 16:
            t = text()
            if "Round scores" in t and not saw_board:
                saw_board = True
                print(f"  [+{time.time()-t0:5.1f}s] ROUND SCORES appeared. Clicking 'Show the points'...")
                time.sleep(0.5)
                ok = click_text("Show the points")
                print(f"         click returned: {ok}")
                if ok:
                    time.sleep(1.0)
                    print(f"         after click: '💰 POINTS' in text: {'💰 POINTS' in text()}")
                    print("         body tail:", repr(text()[-260:].replace("\n", " | ")))
            if "💰 POINTS" in t:
                saw_pts = True
                print(f"  [+{time.time()-t0:5.1f}s] POINTS BOARD VISIBLE")
                break
            if t != last:
                print(f"  [+{time.time()-t0:5.1f}s] state: {repr(t[-180:].replace(chr(10), ' | '))}")
                last = t
            time.sleep(1.0)

        print()
        print("RESULT:", "OK — points board shown" if saw_pts else "FAIL — points board never appeared")
        print()
        if errors:
            print("JS/CONSOLE ERRORS:")
            for e in errors[:15]:
                print("  -", e[:300])
        else:
            print("No JS errors.")
        browser.close()

if __name__ == "__main__":
    main()
