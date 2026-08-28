"""End-to-end walkthrough of BLUFF IT in headless Chromium.

Covers:
  1. the password GATE in front of the game (wrong code -> shake, right code -> home)
  2. CLASSIC mode: home -> setup (2 players, 2 rounds) -> reading (question) ->
     handoff -> guess relay (secret keypad) -> reveal (anonymous A-C cards +
     truth, NO truth label during the discussion, timer) -> vote relay
     (tap a card, 30s lock) -> anticipation -> result (truth, ±% tags, points)
     -> round 2 -> end screen
  3. MOLE mode (fresh page, in-memory state reset, localStorage kept):
     pick MOLE on home -> setup (1 round) -> reading (mole rules, no question)
     -> guess relay (private question, NO role badge — secret until discussion)
     -> reveal (no truth card, the question shown at the top, who-wrote-what
     names ALWAYS visible — no toggle) -> HUNT (tap the face you think is the
     Mole) -> anticipation -> mole result (who the Mole was, points) -> end screen
"""
import os
import time
from playwright.sync_api import sync_playwright

URL = os.environ.get("BLUFF_URL", "http://127.0.0.1:8765/")
CODE = os.environ.get("BLUFF_CODE", "efrim")
CHROME = "/home/ubuntu/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome"

PLAYERS = ["Eva", "Jonas"]


def main():
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
        ctx = browser.new_context(viewport={"width": 420, "height": 860})
        page = ctx.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)

        def text():
            return page.evaluate("() => document.body.innerText")

        def click_text(t, exact=False):
            ok = page.evaluate(
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

        def snap(label):
            t = text()
            print(f"--- {label} ---")
            print(t[:500].replace("\n", " | "))
            print()

        def type_number(digits):
            for ch in digits:
                assert click_text(ch, exact=True), f"keypad digit {ch} not found"
                time.sleep(0.12)

        def add_players(names):
            for name in names:
                page.fill("input", name)
                time.sleep(0.2)
                assert click_text("Add player"), f"add button not found for {name}"
                time.sleep(0.5)

        def set_rounds(n):
            assert click_text(str(10), exact=True), "rounds pill not found"
            time.sleep(0.4)
            assert click_text(str(n), exact=True), f"rounds cell {n} not found"
            time.sleep(0.4)

        def do_guess_relay(n, guesses):
            """handoff -> keypad -> lock, xN players"""
            done = 0
            saw_mole_badge = False
            t0 = time.time()
            while done < n and time.time() - t0 < 40:
                t = text()
                if "Blend in!" in t or "shared question" in t or "secret question" in t:
                    saw_mole_badge = True
                if "ready — go!" in t:
                    assert click_text("ready — go!"), "handoff button failed"
                    time.sleep(0.8)
                    continue
                if "Lock it in" in t:
                    # clear any leftover digits from the previous player's keypad
                    for _ in range(6):
                        click_text("⌫", exact=True)
                        time.sleep(0.08)
                    time.sleep(0.2)
                    type_number(guesses[done])
                    assert click_text("Lock it in"), f"lock button not found for guess {done}"
                    time.sleep(0.9)
                    done += 1
                else:
                    time.sleep(0.3)
            return done, saw_mole_badge

        # =============== GATE ===============
        print("== gate ==")
        page.goto(URL, wait_until="networkidle")
        time.sleep(2)
        assert "locked" in text().lower(), "gate not shown on first load"
        snap("GATE")

        # wrong code first: must NOT get in
        page.fill("input", "wrongcode")
        time.sleep(0.3)
        assert click_text("UNLOCK"), "unlock button not found"
        time.sleep(1.5)
        assert "Wrong code" in text() or "locked" in text().lower(), "wrong code let us in?!"
        assert "Who's playing?" not in text() and "MOLE" not in text(), "gate bypassed with wrong code"
        snap("GATE-WRONG")

        # right code
        page.fill("input", CODE)
        time.sleep(0.3)
        assert click_text("UNLOCK"), "unlock button not found (2nd try)"
        time.sleep(1.8)
        assert wait_text("The party bluff game", timeout=10), "home not reached after unlock"
        snap("HOME")

        # =============== CLASSIC MODE ===============
        print("== classic: to setup ==")
        assert click_text("PLAY NOW"), "home play button not found"
        time.sleep(0.8)
        assert wait_text("Who's playing?"), "setup not reached"
        assert "Face scan" in text(), "face-scan button missing on web"
        snap("SETUP")

        add_players(PLAYERS)
        set_rounds(2)
        assert wait_text("Start the chaos"), "start button missing"
        snap("SETUP-2PLAYERS")

        for rnd in (1, 2):
            print(f"== classic round {rnd} ==")
            assert click_text("Start the chaos") if rnd == 1 else click_text("Next round"), "start/next failed"
            time.sleep(1.2)
            assert wait_text("THE QUESTION"), "reading not reached"
            snap(f"READING-R{rnd}")
            assert click_text("Read it! Continue") or click_text("Next"), "reading button failed"
            time.sleep(1.0)

            n, _ = do_guess_relay(2, ["42", "1750"])
            assert n == 2, f"only {n}/2 guesses entered. screen:\n{text()[:400]}"

            print(f"== classic round {rnd}: reveal (anonymous board) ==")
            assert wait_text("The guesses are in"), "reveal not reached"
            # both guesses are on the board…
            assert "42" in text() and "1,750" in text(), "guesses missing from reveal board"
            # …and the truth card carries NO "THE TRUTH" label during discussion
            assert "THE TRUTH" not in text(), "truth card is labeled on the reveal board — it leaks the answer!"
            snap(f"REVEAL-R{rnd}")
            time.sleep(0.5)
            assert click_text("arguing") or click_text("To the votes"), "reveal continue button failed"
            time.sleep(0.8)

            print(f"== classic round {rnd}: vote relay ==")
            picks = 0
            t0 = time.time()
            while time.time() - t0 < 40 and picks < 2:
                t = text()
                if "ready — go!" in t:
                    assert click_text("ready — go!"), "vote handoff failed"
                    time.sleep(0.7)
                    continue
                if "Which one is REAL?" in t:
                    advanced = False
                    for letter in ("B", "A", "C"):
                        if click_text(letter, exact=True):
                            time.sleep(1.5)
                            if "Which one is REAL?" not in text():
                                advanced = True
                                break
                    picks += 1
                    assert advanced, f"vote pick {picks} did not advance (self-vote?). screen:\n{text()[:300]}"
                else:
                    time.sleep(0.3)
            assert picks == 2, f"only {picks}/2 picks made"

            print(f"== classic round {rnd}: anticipation + result ==")
            assert wait_text("THE ANSWER SHOWS UP SOON", timeout=10), "anticipation not reached"
            assert wait_text("The truth was", timeout=12), "result not reached after countdown"
            snap(f"RESULT-R{rnd}")
            # the "Round scores" board fades in ~900ms after the answer
            waited = 0.0
            while waited < 8 and "Round scores" not in text():
                time.sleep(0.3)
                waited += 0.3
            assert "Round scores" in text(), "guess board missing"
            # points: click "Show the points" if still available, otherwise
            # the 5.6s auto-reveal takes care of it
            click_text("Show the points")
            waited = 0.0
            while waited < 10 and "💰 POINTS" not in text():
                time.sleep(0.4)
                waited += 0.4
            assert "💰 POINTS" in text(), "points board missing"
            snap(f"RESULT-POINTS-R{rnd}")

        # last round -> champion -> end screen
        print("== classic: end screen ==")
        t0 = time.time()
        while time.time() - t0 < 12:
            if click_text("To the champion"):
                break
            time.sleep(0.5)
        time.sleep(1.2)
        assert wait_text("GAME OVER!", timeout=10), "end screen not reached"
        assert "BLUFF KING" in text(), "classic end badge missing"  # badge titles render UPPERCASE
        snap("END-CLASSIC")

        # back to home (fresh in-memory state)
        assert click_text("New players"), "new-players button failed"
        time.sleep(1.0)
        assert wait_text("The party bluff game"), "home not reached after reset"

        # =============== MOLE MODE (fresh page = fresh game state) ===============
        page2 = ctx.new_page()
        page2.on("pageerror", lambda e: errors.append(str(e)))
        page2.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        old_page, page = page, page2

        def text2():
            return page.evaluate("() => document.body.innerText")

        def click2(t, exact=False):
            ok = page.evaluate(
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
                }""",
                [t, exact],
            )
            return bool(ok)

        def wait2(t, timeout=12):
            t0 = time.time()
            while time.time() - t0 < timeout:
                if t in text2():
                    return True
                time.sleep(0.2)
            return False

        def snap2(label):
            t = text2()
            print(f"--- {label} ---")
            print(t[:500].replace("\n", " | "))
            print()

        print("== mole: fresh page (gate should persist via localStorage) ==")
        page2.goto(URL, wait_until="networkidle")
        time.sleep(2)
        assert "This game is locked" not in text2(), "gate re-appeared on a fresh page (unlock not persisted)"
        assert wait2("The party bluff game", timeout=10), "home not reached on fresh page"
        snap2("HOME-FRESH")

        print("== mole: pick mode, to setup ==")
        assert click2("MOLE"), "mole mode card not found"
        time.sleep(0.5)
        assert click2("PLAY NOW"), "mole play button not found"
        time.sleep(0.8)
        assert wait2("Who's playing?"), "setup not reached (mole)"
        add_players(PLAYERS)
        set_rounds(1)
        assert wait2("Start the chaos"), "start button missing (mole)"
        assert click2("Start the chaos"), "start click failed (mole)"
        time.sleep(1.2)

        print("== mole: reading (rules, no question) ==")
        assert wait2("MOLE MODE", timeout=10), "mole rules not shown"
        assert "THE QUESTION" not in text2(), "question leaked on mole reading screen!"
        snap2("READING-MOLE")
        assert click2("Got it") or click2("Next"), "mole reading button failed"
        time.sleep(1.0)

        print("== mole: guess relay (private questions) ==")
        n, saw_badge = do_guess_relay(2, ["1337", "999"])
        assert n == 2, f"only {n}/2 mole guesses entered. screen:\n{text2()[:400]}"
        assert not saw_badge, "role badge leaked during guess relay — mole/hunter must stay secret until discussion"
        snap2("AFTER-GUESSES-MOLE")

        print("== mole: reveal (no truth, names ALWAYS visible) ==")
        assert wait2("The numbers are in", timeout=12), "mole reveal not reached"
        assert "THE TRUTH" not in text2(), "truth card leaked on mole reveal!"
        assert "THE QUESTION" in text2(), "the actual question must be shown at the top during discussion"
        # no show-names toggle anymore — who wrote what is always on the cards
        assert "Show names" not in text2(), "show-names toggle should be gone from the mole reveal"
        assert "Eva" in text2() and "Jonas" in text2(), "names not shown on the mole reveal cards"
        snap2("REVEAL-MOLE")
        assert click2("Start the hunt"), "start-hunt button failed"
        time.sleep(0.8)

        print("== mole: the HUNT (everyone votes — the Mole too, so they can't be told by a skipped turn) ==")
        votes = 0
        t0 = time.time()
        while time.time() - t0 < 30 and votes < 2:
            t = text2()
            if "to hunt — go!" in t:
                assert click2("to hunt — go!"), "hunt handoff failed"
                time.sleep(0.7)
                continue
            if "WHO IS THE MOLE?" in t:
                voter = "Eva" if "Eva is hunting" in t else "Jonas"
                target = "Jonas" if voter == "Eva" else "Eva"
                if click2(target, exact=True):
                    votes += 1
                    time.sleep(1.5)
                else:
                    time.sleep(0.3)
            else:
                time.sleep(0.3)
        assert votes == 2, f"only {votes}/2 hunt votes (the Mole must get a turn too). screen:\n" + text2()[:400]
        snap2("HUNT-DONE")

        print("== mole: anticipation + result ==")
        assert wait2("THE ANSWER SHOWS UP SOON", timeout=10), "mole anticipation not reached"
        assert wait2("The Mole was", timeout=12), "mole result not reached"
        time.sleep(3.5)  # let the second beat (questions + points) appear
        t = text2()
        # per-person scoring (no majority): the sole hunter always names the
        # other player (the Mole) with only 2 players -> +5 individual,
        # the Mole convinces 0 hunters -> 0.
        assert "+5" in t, "hunter's individual +5 missing on the points rows"
        assert "caught by all" in t or "fooled" in t.lower(), "mole verdict banner missing"
        assert "spot on" in t.lower(), "hunter's correct-accusation 'spot on' verdict missing"
        assert "Points from accusations" in t, "vote-mapping section label missing"
        snap2("RESULT-MOLE")

        print("== mole: end screen ==")
        assert click2("To the champion"), "mole champion button failed"
        time.sleep(1.2)
        assert wait2("GAME OVER!", timeout=10), "mole end screen not reached"
        assert "BEST MOLE" in text2(), "best-mole badge missing"
        assert "TOP HUNTER" in text2(), "top-hunter badge missing"
        snap2("END-MOLE")

        if errors:
            print("\nJS/CONSOLE ERRORS:")
            for e in errors[:20]:
                print("  -", e[:200])
        else:
            print("\nNo JS errors.")
        browser.close()
        print("WALKTHROUGH OK")


if __name__ == "__main__":
    main()
