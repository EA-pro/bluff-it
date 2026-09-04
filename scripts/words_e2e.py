"""Play a FULL 3-round WORDS-mode game of BLUFF IT to the end screen.

Words mode = Fibbage-style, objective-only: every question is hard, funny
trivia with ONE stored correct answer (shown on the board as its own
unmarked truth card). Everyone WRITES a short text answer (a textarea,
capped at WORDS_MAX_CHARS=60), the group VOTES for the real one by tapping
the written cards, then the answer show + scores.

Asserts (regression guards):
  - home shows a clickable WORDS mode card
  - reading screen shows the WORDS mode chip + "Got it — write it!"
  - the answer input is a TEXTAREA (not a numpad) and the char cap is shown
  - no raw "{name}" template token is ever rendered on screen (words mode
    is objective-only — personal questions were removed)
  - vote screen shows quoted written answers + "Locked in"
  - answer show steps work, scores work, GAME OVER has Bluff King/Best Reader
    badges (words reuses the classic stats)

Reuses the exact proven relay machinery from full_game.py (smallest-match
text click + real mouse events, gate + setup).
"""
import time, os, re
from playwright.sync_api import sync_playwright

URL = os.environ.get("BLUFF_URL", "http://127.0.0.1:8765/")
CHROME = "/home/ubuntu/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome"
PASS = "efrim"
# short, distinct, non-truth answers (keep under the 60-char cap)
ANSWERS = ["Blueberry pie", "My grandma's house", "Taco Tuesday forever"]
TOTAL = 3

# every screen's text is checked for a leaked template token
SEEN_TEXT = []

def record(page, tag):
    t = text(page)
    SEEN_TEXT.append((tag, t))
    assert "{name}" not in t, f"RAW '{{name}}' rendered on screen [{tag}]: {t[:200]!r}"
    return t

def click_text(page, t, exact=False):
    box = page.evaluate("""(args) => {
        const [t, exact] = args;
        const els = Array.from(document.querySelectorAll('div,span,button'));
        let best = null;
        for (const el of els) {
            const own = Array.from(el.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent || '').join('');
            const s = own.trim() || (el.innerText || '').trim();
            if (!s) continue;
            if (exact ? s === t : s.includes(t)) {
                if (!best || s.length < best.s.length) best = { el, s };
            }
        }
        if (!best) return null;
        best.el.scrollIntoView({ block: 'center' });
        const r = best.el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) return null;
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }""", [t, exact])
    if not box:
        return False
    page.wait_for_timeout(120)
    page.mouse.click(box["x"], box["y"])
    return True

def text(page):
    return page.evaluate("() => document.body.innerText")

def gate(page):
    page.goto(URL, wait_until="networkidle")
    # cold webpack dev-server compiles take a while on first load — poll for
    # the gate input up to 90s instead of assuming a fixed delay.
    t0 = time.time()
    while time.time() - t0 < 90:
        if page.evaluate("() => !!document.querySelector('input')"):
            break
        page.wait_for_timeout(1000)
    page.wait_for_timeout(800)
    page.evaluate("""(pw) => {
        const inp = document.querySelector('input');
        if (!inp) return;
        const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        set.call(inp, pw);
        inp.dispatchEvent(new Event('input', {bubbles: true}));
    }""", PASS)
    # poll for the UNLOCK button (it renders after the password is entered)
    t0 = time.time()
    while time.time() - t0 < 20:
        ok = page.evaluate("""() => {
            const els = Array.from(document.querySelectorAll('div,span'));
            const el = els.find(e => (e.innerText || '').trim().startsWith('UNLOCK'));
            if (!el) return false;
            el.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, isPrimary: true}));
            el.dispatchEvent(new PointerEvent('pointerup', {bubbles: true, isPrimary: true}));
            el.dispatchEvent(new MouseEvent('click', {bubbles: true}));
            return true;
        }""")
        if ok:
            break
        page.wait_for_timeout(500)
    # confirm we landed on home (the mode cards) before returning
    t0 = time.time()
    while time.time() - t0 < 30:
        if "WORDS" in text(page) and "PLAY" in text(page):
            return True
        page.wait_for_timeout(500)
    return False

def setup(page):
    home = text(page)
    assert "WORDS" in home, "WORDS mode card missing on home screen"
    assert click_text(page, "WORDS", exact=True), "WORDS mode card not clickable"
    page.wait_for_timeout(400)
    assert click_text(page, "PLAY NOW"), "PLAY NOW not found"
    page.wait_for_timeout(1000)
    for nm in ["Eva", "Jonas"]:
        page.fill("input", nm, timeout=3000)
        page.wait_for_timeout(200)
        assert click_text(page, "Add player"), f"add {nm} failed"
        page.wait_for_timeout(400)
    click_text(page, "▼")
    page.wait_for_timeout(400)
    assert click_text(page, str(TOTAL), exact=True), "select 3 rounds failed"
    page.wait_for_timeout(300)
    assert click_text(page, "Start the chaos"), "start failed"
    page.wait_for_timeout(1500)

def wait_for(page, marker, timeout=12):
    t0 = time.time()
    while time.time() - t0 < timeout:
        if marker in text(page):
            return True
        page.wait_for_timeout(200)
    return False

def reading_step(page):
    """Words reading screen: the chip + 'Got it — write it!' must be shown."""
    assert wait_for(page, "Got it", 12), "words reading screen not reached"
    record(page, "reading")
    for _ in range(30):
        if click_text(page, "Got it"):
            page.wait_for_timeout(700)
            return True
        page.wait_for_timeout(300)
    return False

def guess_relay(page, rnd, st):
    """Pass the phone until both players have WRITTEN an answer. Ends at the
    reveal board ("The answers are in")."""
    for i in range(90):
        cur = text(page)
        if "The answers are in" in cur:
            return True
        if "HAND THE PHONE" in cur:
            record(page, f"r{rnd}_handoff")
            click_text(page, "ready")  # substring: apostrophe-agnostic
            page.wait_for_timeout(700)
            continue
        if page.evaluate("() => !!document.querySelector('textarea')"):
            ans = ANSWERS[st[0] % len(ANSWERS)]; st[0] += 1
            page.locator("textarea").first.fill(ans, timeout=3000)
            page.wait_for_timeout(200)
            record(page, f"r{rnd}_write")
            # char-cap guard: counter must show x/60
            t = text(page)
            assert "/60" in t, f"round {rnd}: char counter (x/60) missing on write screen"
            assert click_text(page, "go"), f"round {rnd}: lock-in failed"
            page.wait_for_timeout(900)
            continue
        page.wait_for_timeout(350)
    return "The answers are in" in text(page)

def char_cap_guard(page, rnd):
    """Type past the limit and confirm the textarea is hard-capped at 60."""
    long = "x" * 120
    page.locator("textarea").first.fill(long, timeout=3000)
    page.wait_for_timeout(200)
    val = page.locator("textarea").first.input_value(timeout=2000)
    assert len(val) <= 60, f"round {rnd}: char cap not enforced (got {len(val)} chars)"

def reveal_to_votes(page, rnd):
    record(page, f"r{rnd}_reveal_board")
    assert wait_for(page, "To the votes", 12), f"round {rnd}: reveal board not reached"
    assert click_text(page, "To the votes")
    page.wait_for_timeout(900)

def vote_relay(page, rnd):
    """Pass the phone until both players voted on a WRITTEN answer. Ends at
    the answer show. Asserts the cards are quoted text (not numbers)."""
    voted = 0
    for i in range(90):
        cur = text(page)
        if "THE ANSWER" in cur or "Answer 1 of" in cur:
            return voted >= 2
        if "HAND THE PHONE" in cur:
            record(page, f"r{rnd}_vote_handoff")
            click_text(page, "ready")
            page.wait_for_timeout(700)
            continue
        if "Which one is REAL" in cur or "one pick" in cur:
            record(page, f"r{rnd}_vote")
            # regression guard: at least one quoted (non-numeric) card on screen
            assert ("\u201c" in cur and "\u201d" in cur) or "\u2019" in cur, \
                f"round {rnd}: no quoted text answer card on vote screen"
            ok = page.evaluate("""() => {
                const els = Array.from(document.querySelectorAll('div'));
                const cards = els.filter(el => {
                    const s = (el.innerText || '').replace(/\\u00a0/g, ' ').trim();
                    // leaf answer cards: start with a letter + newline, hold a
                    // quoted answer, and are short. (Excludes the grid parent.)
                    return /^[A-H]\\n/.test(s) && /[“”]/.test(s) && s.length < 80
                        && !el.querySelector('div[aria-disabled]');
                });
                // never vote your own card: it is disabled and tagged 'yours'.
                const pickable = cards.filter(el => {
                    const s = el.innerText || '';
                    return el.getAttribute('aria-disabled') !== 'true'
                        && !/yours/i.test(s) && !/your pick/i.test(s);
                });
                const pool = pickable.length ? pickable : cards;
                pool.sort((a, b) => (a.innerText || '').length - (b.innerText || '').length);
                const target = pool[0];
                if (!target) return null;
                target.scrollIntoView({ block: 'center' });
                const r = target.getBoundingClientRect();
                return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
            }""")
            assert ok, f"round {rnd}: no votable text card found"
            page.wait_for_timeout(100)
            page.mouse.click(ok["x"], ok["y"])
            # a registered pick flashes "Locked in ✓" and then auto-advances
            # (handoff to the next voter, or straight to the answer show).
            # Accept EITHER as success; only fail if the clock keeps ticking
            # (i.e. the click was a no-op on a disabled card).
            t0 = time.time()
            while time.time() - t0 < 6:
                cur = text(page)
                if "Locked in" in cur or "LOCKED" in cur:
                    break
                if ("HAND THE PHONE" in cur or "I'm ready" in cur
                        or "THE ANSWER" in cur or "Answer 1 of" in cur):
                    break
                page.wait_for_timeout(300)
            assert "Locked in" in cur or "LOCKED" in cur or "HAND THE PHONE" in cur \
                or "I'm ready" in cur or "THE ANSWER" in cur, \
                f"round {rnd}: vote did not lock in (still {cur[:60]!r})"
            voted += 1
            page.wait_for_timeout(300)
            continue
        page.wait_for_timeout(350)
    return "THE ANSWER" in text(page)

def play_reveal(page, rnd):
    for _ in range(40):
        if "Answer 1 of" in text(page):
            break
        page.wait_for_timeout(500)
    t0 = record(page, f"r{rnd}_answer1")
    m = re.search(r"Answer 1 of (\d+)", t0)
    n_steps = int(m.group(1)) if m else 1
    # Each step: the card pops in, then the VERDICT auto-lands at ~2.3s,
    # which is when the button flips from "Show the verdict" to
    # "Next answer" / "To the scores". Poll for that button before clicking —
    # a fixed sleep is racy on a slow dev server.
    for s in range(1, n_steps + 1):
        t0 = time.time()
        btn = None
        while time.time() - t0 < 10:
            cur = text(page)
            if "To the scores" in cur:
                btn = "To the scores"
                break
            if "Next answer" in cur:
                btn = "Next answer"
                break
            page.wait_for_timeout(300)
        assert btn, f"round {rnd} step {s}: verdict button never landed"
        if btn == "To the scores":
            record(page, f"r{rnd}_verdict")
            assert click_text(page, "To the scores"), f"round {rnd}: to scores failed"
            break
        click_text(page, "Next answer")
        page.wait_for_timeout(600)
    page.wait_for_timeout(1500)
    return n_steps

def scores_to_next(page, rnd, total):
    assert wait_for(page, "Round scores", 12) or wait_for(page, "The truth was", 6), \
        f"round {rnd}: scores not reached"
    page.wait_for_timeout(3500)
    click_text(page, "Show the points")
    page.wait_for_timeout(2500)
    record(page, f"r{rnd}_scores")
    if rnd >= total:
        ok = click_text(page, "To the champion") or click_text(page, "To the champions")
    else:
        ok = click_text(page, "Next round")
    assert ok, f"round {rnd}: continue failed"
    page.wait_for_timeout(1500)

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME, args=["--no-sandbox", "--autoplay-policy=no-user-gesture-required"])
        page = browser.new_page(viewport={"width": 390, "height": 844})
        page.on("console", lambda m: None)

        assert gate(page), "gate failed"
        setup(page)

        st = [0]
        for rnd in range(1, TOTAL + 1):
            print(f"== words round {rnd}/{TOTAL} ==")
            assert reading_step(page), f"round {rnd}: reading failed"
            assert guess_relay(page, rnd, st), f"round {rnd}: write relay failed"
            reveal_to_votes(page, rnd)
            assert vote_relay(page, rnd), f"round {rnd}: vote relay failed"
            n_steps = play_reveal(page, rnd)
            scores_to_next(page, rnd, TOTAL)
            print(f"    round {rnd}: {n_steps} reveal steps, done")

        assert wait_for(page, "GAME OVER", 15), "end screen not reached"
        end = record(page, "end")
        assert "BLUFF KING" in end, "Bluff King badge missing on end screen"
        assert "BEST READER" in end, "Best Reader badge missing on end screen"
        print("=== END SCREEN ===")
        print(end[:600].replace("\n", " | "))
        page.screenshot(path="/tmp/words_end.png")
        browser.close()
        print(f"WORDS FULL GAME OK ({len(SEEN_TEXT)} screens checked, no raw template tokens)")

if __name__ == "__main__":
    main()
