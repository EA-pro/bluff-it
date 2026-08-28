"""LIVE tie test: 2-player classic. With only 2 players, each voter must pick
the other's card (self-votes are impossible) -> each player is fooled exactly
once -> 2 pts each, every round -> a GUARANTEED TIE at the end screen.
Verifies End.tsx shows BOTH winners (crowns, rank, share card)."""
import time
from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:8765/"
CODE = "efrim"
CHROME = "/home/ubuntu/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome"

PLAYERS = ["Eva", "Jonas"]


def main():
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
        page = browser.new_page(viewport={"width": 420, "height": 860})
        errors = []
        page.on("pageerror", lambda e: errors.append("PAGEERROR: " + str(e)))
        page.on("console", lambda m: errors.append("CONSOLE: " + m.text) if m.type == "error" else None)

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

        def wait_text(t, timeout=12):
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

        def do_guess_relay(n, guesses):
            done = 0
            t0 = time.time()
            while done < n and time.time() - t0 < 40:
                t = text()
                if "ready — go!" in t:
                    assert click_text("ready — go!"), "handoff button failed"
                    time.sleep(0.8)
                    continue
                if "Lock it in" in t:
                    for _ in range(6):
                        click_text("⌫", exact=True)
                        time.sleep(0.08)
                    time.sleep(0.2)
                    type_number(guesses[done])
                    assert click_text("Lock it in"), f"lock failed for guess {done}"
                    time.sleep(0.9)
                    done += 1
                else:
                    time.sleep(0.3)
            return done

        def do_vote_relay(n):
            """2 players: each voter can ONLY tap the other's card."""
            picks = 0
            t0 = time.time()
            while time.time() - t0 < 40 and picks < n:
                t = text()
                if "ready — go!" in t:
                    assert click_text("ready — go!"), "vote handoff failed"
                    time.sleep(0.7)
                    continue
                if "Which one is REAL?" in t:
                    # find the card that is NOT the voter's own — the voter's
                    # own name appears in the header ("X is picking"), the
                    # cards show the other name + the truth letter.
                    voter = "Eva" if "Eva is" in t else "Jonas"
                    other = "Jonas" if voter == "Eva" else "Eva"
                    if click_text(other, exact=True):
                        picks += 1
                        time.sleep(1.5)
                    else:
                        time.sleep(0.3)
                else:
                    time.sleep(0.3)
            return picks

        # =============== gate -> home ===============
        page.goto(URL, wait_until="networkidle")
        time.sleep(2)
        page.fill("input", CODE)
        time.sleep(0.3)
        assert click_text("UNLOCK"), "unlock failed"
        assert wait_text("The party bluff game", 10), "home not reached"

        # =============== setup: 2 players, 1 round ===============
        assert click_text("PLAY NOW"), "play button not found"
        time.sleep(0.8)
        assert wait_text("Who's playing?"), "setup not reached"
        for name in PLAYERS:
            page.fill("input", name)
            time.sleep(0.2)
            assert click_text("Add player"), f"add button not found for {name}"
            time.sleep(0.5)
        assert wait_text("Start the chaos"), "start button missing"
        # set rounds to 1: open the picker (current value 10), then tap 1
        assert click_text("10", exact=True), "rounds pill not found"
        time.sleep(0.4)
        assert click_text("1", exact=True), "1-round cell not found"
        time.sleep(0.4)

        # =============== round 1 ===============
        assert click_text("Start the chaos"), "start click failed"
        time.sleep(1.2)
        assert wait_text("THE QUESTION", 10), "reading not reached"
        assert click_text("Read it! Continue") or click_text("Next"), "reading button failed"
        time.sleep(1.0)

        n = do_guess_relay(2, ["42", "1750"])
        assert n == 2, f"only {n}/2 guesses. screen:\n{text()[:400]}"

        assert wait_text("The guesses are in", 12), "reveal not reached"
        time.sleep(0.5)
        assert click_text("arguing") or click_text("To the votes"), "reveal continue failed"
        time.sleep(0.8)

        picks = do_vote_relay(2)
        assert picks == 2, f"only {picks}/2 votes. screen:\n{text()[:400]}"

        assert wait_text("THE ANSWER SHOWS UP SOON", 10), "anticipation not reached"
        assert wait_text("The truth was", 12), "result not reached"
        waited = 0.0
        while waited < 10 and "💰 POINTS" not in text():
            time.sleep(0.4)
            waited += 0.4
        assert "💰 POINTS" in text(), "points board missing"
        print("ROUND POINTS — both must be equal (2 pts each):")
        print(text()[:700].replace("\n", " | "))

        # =============== end screen — THE TIE ===============
        t0 = time.time()
        while time.time() - t0 < 12:
            if click_text("To the champion"):
                break
            time.sleep(0.5)
        time.sleep(1.5)
        assert wait_text("GAME OVER!", 10), "end screen not reached"
        t = text()
        print("\nEND SCREEN:")
        print(t[:800].replace("\n", " | "))

        # the tie headline: BOTH names, not just one
        assert "Eva + Jonas WIN!" in t or "EVA + JONAS WIN" in t.upper(), \
            "tied headline missing — expected both names joined: " + t[:400]
        # both players crowned in the final table
        assert t.count("👑") >= 2, f"expected >=2 crowns (one per winner), got {t.count('👑')}"
        # the share card header must name both
        assert "EVA + JONAS" in t.upper(), "share card winner header must join both names"
        print("\nEND-SCREEN TIE OK — both players shown as winners")

        if errors:
            print("\nJS/CONSOLE ERRORS:")
            for e in errors[:15]:
                print("  -", e[:250])
            raise SystemExit(1)
        print("No JS errors.")
        browser.close()
        print("LIVE TIE PROBE OK")


if __name__ == "__main__":
    main()
