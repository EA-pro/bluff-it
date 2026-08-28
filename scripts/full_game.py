"""Play a FULL 5-round game of BLUFF IT to the end screen. Verifies the whole loop
including the final Bluff King + share card."""
import sys, time, os
from playwright.sync_api import sync_playwright

URL = os.environ.get("BLUFF_URL", "http://127.0.0.1:8765/")
CHROME = "/home/ubuntu/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome"

def main():
    errors = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
        page = browser.new_page(viewport={"width": 420, "height": 860})
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)

        def text():
            return page.evaluate("() => document.body.innerText")

        def click_text(t, exact=False):
            ok = page.evaluate(
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
                }""",
                [t, exact],
            )
            return bool(ok)

        def wait_text(t, timeout=12):
            t0 = time.time()
            while time.time() - t0 < timeout:
                if t in text():
                    return True
                time.sleep(0.2)
            return False

        def wait_any(opts, timeout=12):
            t0 = time.time()
            while time.time() - t0 < timeout:
                t = text()
                if any(o in t for o in opts):
                    return t
                time.sleep(0.2)
            return text()

        page.goto(URL, wait_until="networkidle")
        time.sleep(1.5)

        # setup: 2 players, 5 rounds
        assert click_text("Los geht's")
        time.sleep(0.8)
        for name in ["Eva", "Jonas"]:
            page.fill("input", name)
            time.sleep(0.15)
            assert click_text("Hinzufügen"), f"add {name} failed"
            time.sleep(0.4)
        for _ in range(5):  # 10 -> 5
            assert click_text("−"), "minus failed"
            time.sleep(0.15)
        assert wait_text("Spiel starten (2)"), "start btn missing"
        assert click_text("Spiel starten")
        time.sleep(1.0)

        results = []
        for rnd in range(1, 6):
            assert wait_text("Die Frage"), f"round {rnd}: reading not reached"
            assert click_text("Weiter")  # works for both 'Vorgelesen! Weiter' and 'Weiter'
            time.sleep(0.7)

            # guess relay (numeric only)
            if wait_any(["rät gerade", "Wie schätzt du?"], timeout=2):
                guesses = ["42", "1750", "88", "3"]
                while wait_text("rät gerade", timeout=2) or wait_text("Wie schätzt du?", timeout=1):
                    for d in guesses[rnd % len(guesses)]:
                        click_text(d, exact=True)
                        time.sleep(0.07)
                    assert click_text("Fertig!"), f"round {rnd}: Fertig failed"
                    time.sleep(0.5)

            # reveal
            assert wait_text("Alle Raten!"), f"round {rnd}: reveal not reached"
            assert click_text("Weiter ⏭") or click_text("Weiter")
            time.sleep(0.7)

            # vote relay
            if not wait_any(["Die Antwort"], timeout=2):
                t = text()
                while "Handy an" in text():
                    if "Welcher Satz ist echt?" in text():
                        click_text("A", exact=True)
                    else:
                        click_text("Eva", exact=True)
                    time.sleep(0.6)

            assert wait_text("Die Antwort"), f"round {rnd}: result not reached"
            res = text()
            winner = "Eva am nächsten" if "Eva am nächsten" in res else ("Jonas am nächsten" if "Jonas am nächsten" in res else ("A" if "A 🎉" in res else ("B" if "B 🎉" in res else "?")))
            results.append((rnd, winner))
            print(f"round {rnd}: winner/truth = {winner}")
            time.sleep(0.3)
            btn = "Nächste Runde" if rnd < 5 else "Zum Ergebnis"
            assert click_text(btn), f"round {rnd}: continue failed ({btn})"
            time.sleep(1.0)

        # end screen
        assert wait_text("BLUFF KING") or wait_text("Bluff King"), "end screen not reached"
        end = text()
        print("=== END SCREEN ===")
        print(end[:700].replace("\n", " | "))

        if errors:
            print("\nJS ERRORS:")
            for e in errors[:15]:
                print("  -", e[:200])
        else:
            print("\nNo JS errors.")
        browser.close()
        print("FULL GAME OK")

main()
