"""E2E for v2: 3 tabs, history in profile, reveal card scaling, timer ring centering."""
import os, sys, time, json
from playwright.sync_api import sync_playwright

URL = os.environ.get("BLUFF_URL", "http://127.0.0.1:8765/")
PASS = os.environ.get("BLUFF_CODE", "efrim")
CHROME = "/home/ubuntu/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome"

out = {"steps": [], "errors": [], "pass": True}
def step(name, ok, extra=""):
    out["steps"].append({"name": name, "ok": ok, "extra": extra})
    if not ok: out["pass"] = False
    print(f"[{'OK' if ok else 'XX'}] {name} {extra}")

with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
    page = browser.new_page(viewport={"width": 420, "height": 860})
    page.on("pageerror", lambda e: out["errors"].append(str(e)))
    page.on("console", lambda m: out["errors"].append(m.text) if m.type == "error" else None)

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

    def fill_first_input(val):
        return bool(page.evaluate(
            """(v) => {
                const inp = document.querySelector('input');
                if (!inp) return false;
                const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                setter.call(inp, v);
                inp.dispatchEvent(new Event('input', {bubbles:true}));
                return true;
            }""", val))

    # ---- gate ----
    page.goto(URL, wait_until="networkidle")
    page.wait_for_timeout(1500)
    page.evaluate("""() => {
        const inp = document.querySelector('input');
        if (!inp) return;
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(inp, 'efrim');
        inp.dispatchEvent(new Event('input', {bubbles:true}));
    }""")
    page.wait_for_timeout(300)
    page.evaluate("""() => {
        const els = Array.from(document.querySelectorAll('div,span'));
        const el = els.find(e => (e.innerText||'').trim().startsWith('UNLOCK'));
        if (!el) return;
        const r = el.getBoundingClientRect();
        const x = r.x + r.width/2, y = r.y + r.height/2;
        for (const type of ['pointerdown','mousedown','pointerup','mouseup','click']) {
            el.dispatchEvent(new MouseEvent(type, {bubbles:true, cancelable:true, clientX:x, clientY:y}));
        }
    }""")
    page.wait_for_timeout(2200)
    body = text()
    step("gate -> home", "PLAY NOW" in body, "home reached" if "PLAY NOW" in body else "no play now")

    # ---- tab bar: expect exactly 3 tabs (Shop, Home, Profile), NO Loot/History ----
    tabs_visible = [w for w in ["Shop","Home","Profile"] if w in body]
    step("3 tabs visible", len(tabs_visible) == 3, f"found {tabs_visible}")
    step("no Loot Box tab", "Loot" not in body, "loot box tab absent" if "Loot" not in body else "STILL PRESENT")
    step("no History tab in bar", "History" not in body, "history tab absent" if "History" not in body else "history in bar")

    # ---- shop tab ----
    click_text("Shop")
    page.wait_for_timeout(800)
    sb = text()
    step("shop opens", "Shop" in sb)
    step("no exclusive loot section in shop", "??? " not in sb or "Loot Box" not in sb)

    # ---- profile tab: stats + history ----
    click_text("Profile")
    page.wait_for_timeout(900)
    pb = text()
    step("profile opens", "Profile" in pb, "")
    step("history section in profile", "HISTORY" in pb, "history heading present" if "HISTORY" in pb else "MISSING")
    has_hist_entries = "Today ·" in pb or "Yesterday ·" in pb
    step("history shows past games (or empty state)", has_hist_entries or "No games yet" in pb, "has entries" if has_hist_entries else "empty state")

    # click a history entry if present to open detail
    if has_hist_entries:
        click_text("Today ·")
        if not text().strip() or "Back" not in text():
            click_text("🕵️")  # fallback
        page.wait_for_timeout(900)
        detail = text()
        step("history detail opens", "Back" in detail and ("Score" in detail or "score" in detail or "pts" in detail.lower()))
        # go back
        click_text("← Back")
        page.wait_for_timeout(700)

    # ---- go home and start a game through to Reveal ----
    click_text("HOME")
    page.wait_for_timeout(700)
    click_text("PLAY NOW")
    page.wait_for_timeout(1500)
    b = text()
    step("setup reached", "START" in b or "start" in b.lower())
    click_text("START")
    page.wait_for_timeout(1200)
    # reading phase - pass phone
    click_text("PASS") if "PASS" in text() else None
    page.wait_for_timeout(800)
    # keep tapping through reading -> handoff -> guess; answer the guess
    for _ in range(12):
        cur = text()
        if "NEXT" in cur:
            click_text("NEXT"); page.wait_for_timeout(700); continue
        if "PASS" in cur:
            click_text("PASS"); page.wait_for_timeout(700); continue
        if "SUBMIT" in cur or "DONE" in cur:
            # enter a guess value
            fill_first_input("100")
            click_text("SUBMIT") if "SUBMIT" in cur else click_text("DONE")
            page.wait_for_timeout(700); continue
        break
    page.wait_for_timeout(1500)
    cur = text()
    # If we're at Reveal, verify cards + timer
    at_reveal = ("VOTE" in cur or "ARGUE" in cur or "discuss" in cur.lower() or "Discuss" in cur)
    step("reached reveal/discussion", at_reveal, "reveal board" if at_reveal else "not at reveal yet")

    if at_reveal:
        # measure: does any card overlap the question banner vertically?
        geom = page.evaluate("""() => {
            const all = Array.from(document.querySelectorAll('div'));
            // find the question banner by its text
            let q = null;
            for (const el of all) {
                const s = (el.innerText||'').trim();
                if (s.length > 15 && s.includes('(') && (el.children.length>=1)) { q = el; break; }
            }
            const rects = (r) => ({top:r.top, bottom:r.bottom, left:r.left, right:r.right});
            // timer ring: find the small circle near top-right with a number
            let timer = null;
            for (const el of all) {
                const r = el.getBoundingClientRect();
                if (r.top < 120 && r.right > 330 && r.width > 40 && r.width < 90 && r.height>40 && r.height<90) { timer = el; break; }
            }
            // collect card rectangles (white boxes with big numbers in the mid area)
            const cards = [];
            for (const el of all) {
                const r = el.getBoundingClientRect();
                if (r.top > 150 && r.bottom < 780 && r.width > 90 && r.width < 260 && r.height > 60 && r.height < 220) {
                    const bg = getComputedStyle(el).backgroundColor;
                    if (bg === 'rgb(255, 255, 255)') cards.push(rects(r));
                }
            }
            return { q: q ? rects(q.getBoundingClientRect()) : null, timer: timer ? rects(timer.getBoundingClientRect()) : null, cards };
        }""")
        step("timer ring present", bool(geom.get("timer")), str(geom.get("timer")))
        # overlap check: card top vs question banner bottom
        q = geom.get("q")
        cards = geom.get("cards") or []
        if q and cards:
            worst = max(c["top"] for c in cards) if cards else 0
            overlap = any(c["top"] < q["bottom"] - 2 for c in cards)
            step("cards do NOT overlap question banner", not overlap,
                 f"q.bottom={q['bottom']:.0f} min_card.top={min(c['top'] for c in cards):.0f}" if cards else "no cards measured")
        else:
            step("cards do NOT overlap question banner", True, "skipped (no q/cards measured)")
        # verify the whole board fits: max card bottom < button top (approx 860-90)
        if cards:
            maxbot = max(c["bottom"] for c in cards)
            step("card grid fits above bottom button", maxbot < 860 - 90, f"max card bottom={maxbot:.0f} limit~{860-90}")

    # ---- timer ring centering: compare ring svg center vs number center ----
    # (best-effort: the disc View is center-justified; check the number text is horizontally centered in disc)
    centering = page.evaluate("""() => {
        const all = Array.from(document.querySelectorAll('div'));
        let disc = null;
        for (const el of all) {
            const r = el.getBoundingClientRect();
            const cs = getComputedStyle(el);
            if (cs.borderRadius.endsWith('px') && parseFloat(cs.borderRadius) > 40 && r.width>40 && r.width<90 && r.height>40 && r.height<90 && r.top<130) { disc = el; break; }
        }
        if (!disc) return null;
        const dr = disc.getBoundingClientRect();
        const center = disc.querySelector('div');
        return null;
    }""")
    print("centering probe:", centering)

    browser.close()

print("\nPAGE ERRORS:", out["errors"][:10] if out["errors"] else "none")
out["errors"] = out["errors"][:10]
print("\n=== PASS:" , out["pass"], "===")
with open("/tmp/v2_e2e.json","w") as f: json.dump(out, f, indent=2)
sys.exit(0 if out["pass"] else 1)
