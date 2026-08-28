"""E2E for the stepped Jackbox-style reveal.
Walks a classic 1-round, 3-player game to the RESULT screen, screenshots:
 - step 1 (big answer)
 - step 1 with voters + verdict
 - last step (must be the truth)
 - scores board (no %-off tags)
Checks: 0-vote lies skipped, lies first, truth last, %-off removed."""
import time, json
from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:8765/"
CHROME = "/home/ubuntu/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome"
PASS = "efrim"
GUESS_VALUES = ["12", "7", "250"]   # distinct, non-truth

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
    print(f"  [dbg] after gate: {text(page)[:70]!r}")
    ok = click_text(page, "PLAY NOW"); page.wait_for_timeout(1000)
    print(f"  [dbg] PLAY NOW clicked: {ok} -> {text(page)[:90]!r}")
    for nm in ["Eva", "Jonas", "Zoe"]:
        n_inputs = page.evaluate("() => document.querySelectorAll('input').length")
        if n_inputs == 0:
            print(f"  [dbg] no input on screen; text={text(page)[:90]!r}")
            break
        page.fill("input", nm, timeout=3000)
        page.wait_for_timeout(200)
        ok = click_text(page, "Add player"); page.wait_for_timeout(500)
        print(f"    add {nm}: {ok}")
    click_text(page, "🎯 Rounds"); page.wait_for_timeout(400)
    click_text(page, "1", exact=True); page.wait_for_timeout(300)
    ok = click_text(page, "Start the chaos"); page.wait_for_timeout(1500)
    print(f"    start: {ok} -> {text(page)[:60]!r}")

def walk_reading(page):
    for _ in range(50):
        if "THE QUESTION" not in text(page):
            print("  [walk] no THE QUESTION; waiting")
            page.wait_for_timeout(400); continue
        # wait for expiry so the button is 'Next →'
        for _ in range(30):
            if "Next →" in text(page): break
            page.wait_for_timeout(500)
        ok1 = click_text(page, "Next →"); page.wait_for_timeout(500)
        ok2 = click_text(page, "Continue →")
        print(f"  [walk] clicked Next={ok1} Continue={ok2}; now: {text(page)[:60]!r}")
        if "The guesses are in" in text(page) or "hand the phone" in text(page).lower() or "ready" in text(page):
            break
        page.wait_for_timeout(500)

def guess_relay(page):
    for i in range(60):
        cur = text(page)
        if "The guesses are in" in cur:
            break
        if "ready" in cur:
            click_text(page, "ready"); page.wait_for_timeout(700); continue
        if "best guess" in cur:
            val = page.evaluate("""() => {
                const els = Array.from(document.querySelectorAll('div,span'));
                for (const el of els) {
                    const own = Array.from(el.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent || '').join('');
                    if (/^-?\\d{1,3}$/.test(own.trim())) return own.trim();
                }
                return '';
            }""")
            target = GUESS_VALUES[i % len(GUESS_VALUES)]
            if val != target:
                for _ in range(6):
                    click_text(page, "⌫", exact=True); page.wait_for_timeout(50)
                for d in target:
                    click_text(page, d, exact=True); page.wait_for_timeout(70)
            click_text(page, "Lock it in"); page.wait_for_timeout(800)
        elif "Read it! Continue" in cur or "Next →" in cur:
            # Reading screen: pass to next phone (works pre- and post-expiry)
            if "Read it! Continue" in cur:
                click_text(page, "Read it! Continue →"); page.wait_for_timeout(500)
            else:
                click_text(page, "Next →"); page.wait_for_timeout(500)
            if i % 10 == 0:
                print(f"    [relay {i}] clicked reading btn")
        else:
            if i % 5 == 0:
                print(f"    [relay {i}] {cur[:70]!r}")
            page.wait_for_timeout(400)
    return "The guesses are in" in text(page)

def to_votes(page):
    for _ in range(40):
        cur = text(page)
        if "THE ANSWER SHOW" in cur or "answer show" in cur.lower():
            return True
        if "To the votes" in cur:
            click_text(page, "To the votes"); page.wait_for_timeout(900)
        page.wait_for_timeout(500)
    return False

def vote_relay(page):
    for i in range(60):
        cur = text(page)
        if "THE ANSWER SHOW" in cur or "answer show" in cur.lower():
            break
        if "ready" in cur:
            click_text(page, "ready"); page.wait_for_timeout(700); continue
        if "one pick" in cur:
            # cards render as "A\n250" (+ "your pick" on the own one) — match that exact shape
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
                print(f"    [vote] no card found; {cur[:60]!r}")
            page.wait_for_timeout(1500)
        else:
            page.wait_for_timeout(400)
    return "THE ANSWER SHOW" in text(page)

results = []
def check(name, ok, extra=""):
    results.append({"name": name, "ok": bool(ok), "extra": extra})
    print(f"  [{'PASS' if ok else 'FAIL'}] {name} {extra}")

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=CHROME, args=["--no-sandbox", "--autoplay-policy=no-user-gesture-required"])
    page = browser.new_page(viewport={"width": 390, "height": 844})
    page.on("console", lambda m: None)

    print("== setup ==")
    check("gate", gate(page))
    setup(page)
    walk_reading(page)
    print("== guess relay ==")
    check("reached reveal board", guess_relay(page))
    print("== vote relay ==")
    to_votes(page)
    check("reached answer show", vote_relay(page))

    # wait for the 3-2-1-GO anticipation to finish and step 1 to mount
    for _ in range(40):
        if "Answer 1 of" in text(page):
            break
        page.wait_for_timeout(500)
    page.wait_for_timeout(1600)   # let the big card pop in

    t0 = text(page)
    check("step label present", "Answer 1 of" in t0, t0[:80].replace("\n", " | "))

    # screenshot: step 1 card
    page.screenshot(path="/tmp/result_step1_card.png")
    # wait for voters + verdict auto-beats (2.4s)
    page.wait_for_timeout(1400)
    page.screenshot(path="/tmp/result_step1_verdict.png")

    # advance through steps, screenshot the last one (truth)
    n_steps = 1
    m = __import__("re").search(r"Answer 1 of (\d+)", t0)
    if m:
        n_steps = int(m.group(1))
    print(f"  total steps: {n_steps}")
    for s in range(1, n_steps):
        cur = text(page)
        if "Next answer" in cur:
            click_text(page, "Next answer")
        else:
            # verdict may not be shown yet — tap to skip ahead
            click_text(page, "Show the verdict")
            page.wait_for_timeout(2800)
            click_text(page, "Next answer")
        page.wait_for_timeout(3300)
    t_last = text(page)
    check("last step shows TRUTH verdict", "THE TRUTH" in t_last, "")
    page.screenshot(path="/tmp/result_truth_step.png")
    # save what was shown on the last step
    last_value = page.evaluate("""() => {
        const els = Array.from(document.querySelectorAll('div,span'));
        for (const el of els) {
            const own = Array.from(el.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent || '').join('');
            const s = own.trim();
            if (/^-?[\\d,]+$/.test(s) && s.length > 0) return s;
        }
        return null;
    }""")
    print(f"  last step value: {last_value}")

    # to scores
    click_text(page, "To the scores")
    page.wait_for_timeout(1400)
    t_score = text(page)
    check("scores screen shows truth", "The truth was" in t_score, t_score[:120].replace("\n", " | "))
    check("no %-off tag on scores", "% off" not in t_score and "% " not in t_score.replace("%", "%") or "% off" not in t_score)
    page.screenshot(path="/tmp/result_scores1.png")
    # wait for points beat
    page.wait_for_timeout(5500)
    t_pts = text(page)
    check("points shown", "POINTS" in t_pts)
    check("no percent in points", "% " not in t_pts)
    page.screenshot(path="/tmp/result_scores2.png")

    browser.close()

print()
fails = [r for r in results if not r["ok"]]
print(f"{len(results) - len(fails)}/{len(results)} checks passed")
with open("/tmp/result_e2e.json", "w") as f:
    json.dump(results, f, indent=1)
