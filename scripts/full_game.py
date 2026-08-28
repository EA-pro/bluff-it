"""Play a FULL 5-round classic game of BLUFF IT to the end screen.

Reuses the exact, proven relay machinery from result_e2e.py (smallest-match
text click + real mouse events, gate + setup). Walks:
  gate -> setup (2 players, 5 rounds) -> [reading -> guess x2 -> reveal ->
  vote x2 -> stepped reveal -> scores] x5 -> GAME OVER podium.
"""
import time, os, sys
from playwright.sync_api import sync_playwright

URL = os.environ.get("BLUFF_URL", "http://127.0.0.1:8765/")
CHROME = "/home/ubuntu/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome"
PASS = "efrim"
GUESS_VALUES = ["12", "7", "250", "480", "9"]   # distinct, non-truth

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
    page.wait_for_timeout(1500)
    page.evaluate("""(pw) => {
        const inp = document.querySelector('input');
        if (!inp) return;
        const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        set.call(inp, pw);
        inp.dispatchEvent(new Event('input', {bubbles: true}));
    }""", PASS)
    page.wait_for_timeout(150)
    ok = page.evaluate("""() => {
        const els = Array.from(document.querySelectorAll('div,span'));
        const el = els.find(e => (e.innerText || '').trim().startsWith('UNLOCK'));
        if (!el) return false;
        el.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, isPrimary: true}));
        el.dispatchEvent(new PointerEvent('pointerup', {bubbles: true, isPrimary: true}));
        el.dispatchEvent(new MouseEvent('click', {bubbles: true}));
        return true;
    }""")
    page.wait_for_timeout(1200)
    return ok

def setup(page):
    assert click_text(page, "PLAY NOW"), "PLAY NOW not found"
    page.wait_for_timeout(1000)
    for nm in ["Eva", "Jonas"]:
        page.fill("input", nm, timeout=3000)
        page.wait_for_timeout(200)
        assert click_text(page, "Add player"), f"add {nm} failed"
        page.wait_for_timeout(400)
    # rounds: default 10 -> 5 (open the picker via the label row, then tap 5)
    click_text(page, "▼")
    page.wait_for_timeout(400)
    assert click_text(page, "5", exact=True), "select 5 rounds failed"
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
    """Read the question, then pass the phone."""
    for _ in range(30):
        cur = text(page)
        if "THE QUESTION" in cur:
            if click_text(page, "Read it! Continue"):
                page.wait_for_timeout(600)
                return True
            if click_text(page, "Next"):
                page.wait_for_timeout(600)
                return True
        page.wait_for_timeout(300)
    return False

def guess_relay(page, rnd):
    """Pass the phone until both players have guessed. Ends at reveal board."""
    for i in range(80):
        cur = text(page)
        if "The guesses are in" in cur:
            return True
        if "ready" in cur:
            click_text(page, "ready")
            page.wait_for_timeout(700)
            continue
        if "best guess" in cur:
            val = page.evaluate("""() => {
                const els = Array.from(document.querySelectorAll('div,span'));
                for (const el of els) {
                    const own = Array.from(el.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent || '').join('');
                    if (/^-?\\d{1,4}$/.test(own.trim())) return own.trim();
                }
                return '';
            }""")
            target = GUESS_VALUES[rnd % len(GUESS_VALUES)]
            if val != target:
                for _ in range(6):
                    click_text(page, "⌫", exact=True)
                    page.wait_for_timeout(50)
                for d in target:
                    click_text(page, d, exact=True)
                    page.wait_for_timeout(70)
            assert click_text(page, "Let's go"), f"round {rnd}: lock-in failed"
            page.wait_for_timeout(800)
        else:
            page.wait_for_timeout(400)
    return "The guesses are in" in text(page)

def reveal_to_votes(page):
    for _ in range(30):
        cur = text(page)
        if "one pick" in cur or "THE ANSWER SHOW" in cur:
            return True
        if "To the votes" in cur:
            click_text(page, "To the votes")
            page.wait_for_timeout(900)
        page.wait_for_timeout(400)
    return False

def vote_relay(page):
    """Pass the phone until both players voted. Ends at THE ANSWER SHOW."""
    for i in range(80):
        cur = text(page)
        if "THE ANSWER SHOW" in cur:
            return True
        if "ready" in cur and "one pick" not in cur:
            click_text(page, "ready")
            page.wait_for_timeout(700)
            continue
        if "one pick" in cur:
            box = page.evaluate("""() => {
                const els = Array.from(document.querySelectorAll('div'));
                const cards = els.filter(el => {
                    const s = (el.innerText || '').replace(/\\u00a0/g, ' ').trim();
                    return /^[A-H]\\n[\\d,.]+$/.test(s) || /^[A-H]\\n[\\d,.]+\\nyour pick$/i.test(s);
                });
                const target = cards.find(c => !/your pick/i.test(c.innerText || ''));
                if (!target) return null;
                target.scrollIntoView({ block: 'center' });
                const r = target.getBoundingClientRect();
                return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
            }""")
            if box:
                page.wait_for_timeout(100)
                page.mouse.click(box["x"], box["y"])
            else:
                print(f"    [vote {i}] no card found; {cur[:70]!r}")
            page.wait_for_timeout(1500)
        else:
            page.wait_for_timeout(400)
    return "THE ANSWER SHOW" in text(page)

def play_reveal(page):
    """Walk the stepped reveal to the scores screen, return (n_steps, truth_shown)."""
    # anticipation -> step 1
    for _ in range(40):
        if "Answer 1 of" in text(page):
            break
        page.wait_for_timeout(500)
    page.wait_for_timeout(1600)
    t0 = text(page)
    n_steps = 1
    m = __import__("re").search(r"Answer 1 of (\d+)", t0)
    if m:
        n_steps = int(m.group(1))
    for s in range(1, n_steps):
        cur = text(page)
        if "Next answer" in cur:
            click_text(page, "Next answer")
        else:
            click_text(page, "Show the verdict")
            page.wait_for_timeout(2800)
            click_text(page, "Next answer")
        page.wait_for_timeout(3300)
    t_last = text(page)
    truth_shown = "THE TRUTH" in t_last
    assert click_text(page, "To the scores"), "to scores failed"
    page.wait_for_timeout(1500)
    return n_steps, truth_shown

def scores_to_next(page, rnd, total):
    """Wait for the scores board + points beat, then continue."""
    assert wait_for(page, "The truth was", 12), f"round {rnd}: scores not reached"
    # let the per-player points beat play, then show points
    page.wait_for_timeout(4000)
    click_text(page, "Show the points")
    page.wait_for_timeout(2500)
    label = "To the champions" if rnd >= total else "Next round"
    assert click_text(page, label), f"round {rnd}: continue failed ({label})"
    page.wait_for_timeout(1500)

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME, args=["--no-sandbox", "--autoplay-policy=no-user-gesture-required"])
        page = browser.new_page(viewport={"width": 390, "height": 844})
        page.on("console", lambda m: None)

        assert gate(page), "gate failed"
        setup(page)

        total = 5
        for rnd in range(1, total + 1):
            print(f"== round {rnd}/{total} ==")
            assert reading_step(page), f"round {rnd}: reading failed"
            assert guess_relay(page, rnd), f"round {rnd}: guess relay failed"
            assert reveal_to_votes(page), f"round {rnd}: reveal->votes failed"
            assert vote_relay(page), f"round {rnd}: vote relay failed"
            n_steps, truth_last = play_reveal(page)
            scores_to_next(page, rnd, total)
            print(f"    round {rnd}: reveal {n_steps} steps, truth last = {truth_last}")

        # end screen
        assert wait_for(page, "GAME OVER", 15), "end screen not reached"
        end = text(page)
        print("=== END SCREEN ===")
        print(end[:600].replace("\n", " | "))
        page.screenshot(path="/tmp/fullgame_end.png")
        browser.close()
        print("FULL GAME OK")

if __name__ == "__main__":
    main()
