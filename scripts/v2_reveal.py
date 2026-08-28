"""Walk: gate -> setup (2 players, 1 round) -> reading -> handoff -> guess -> REVEAL.
Then measure: card/question overlap + timer ring centering. Reports PASS/FAIL."""
import sys, time
from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:8765/"
CHROME = "/home/ubuntu/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome"

fails = []
def check(name, ok, extra=""):
    print(f"[{'OK' if ok else 'XX'}] {name} {extra}")
    if not ok: fails.append(name)

with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
    page = browser.new_page(viewport={"width": 420, "height": 860})
    js_errs = []
    page.on("pageerror", lambda e: js_errs.append(str(e)))
    page.add_init_script("localStorage.setItem('bluff_app_lang','en'); localStorage.setItem('bluff_q_lang','en');")

    def text(): return page.evaluate("() => document.body.innerText")

    def click_text(t, exact=False):
        return bool(page.evaluate("""(args) => {
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
            for (const type of ['pointerdown','mousedown','pointerup','mouseup','click'])
                (node || best).dispatchEvent(new MouseEvent(type, {bubbles:true, cancelable:true, clientX:x, clientY:y}));
            return true;
        }""", [t, exact]))

    def wait_any(opts, timeout=10):
        t0 = time.time()
        while time.time() - t0 < timeout:
            t = text()
            if any(o in t for o in opts): return True
            time.sleep(0.2)
        return False

    # gate
    page.goto(URL, wait_until="networkidle")
    page.wait_for_timeout(1500)
    page.evaluate("""() => {
        const inp = document.querySelector('input');
        const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
        s.call(inp,'efrim'); inp.dispatchEvent(new Event('input',{bubbles:true}));
    }""")
    page.wait_for_timeout(300)
    click_text("UNLOCK →")
    page.wait_for_timeout(2200)
    check("gate->home", "PLAY NOW" in text())

    # setup
    check("enter setup", click_text("PLAY NOW"))
    page.wait_for_timeout(1200)
    for name in ["Eva", "Jonas"]:
        page.evaluate("""(n) => {
            const inp = document.querySelector('input');
            if (!inp) return;
            const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
            s.call(inp, n); inp.dispatchEvent(new Event('input',{bubbles:true}));
        }""", name)
        page.wait_for_timeout(150)
        check(f"add {name}", click_text("Add player"))
        page.wait_for_timeout(400)
    # 1 round: open the rounds dropdown, pick 1
    click_text("🎯 Rounds")
    page.wait_for_timeout(400)
    click_text("1", exact=True)
    page.wait_for_timeout(300)
    check("start chaos", wait_any(["Start the chaos"]))
    check("click start", click_text("Start the chaos"))
    page.wait_for_timeout(1200)

    # reading
    check("reading reached", wait_any(["THE QUESTION"]))
    page.wait_for_timeout(6000)  # let timer expire so button is 'Next →'
    check("reading done", click_text("Next →") or click_text("Continue"))
    page.wait_for_timeout(1200)

    # handoff relay: keep tapping ready until guess screen
    for _ in range(8):
        cur = text()
        if "best guess" in cur: break
        if "ready" in cur:
            click_text("ready — go")
            page.wait_for_timeout(900)
    check("guess screen", wait_any(["best guess"]))

    # guess keypad: enter 100 and lock in (per player, relay)
    for _ in range(8):
        cur = text()
        if "The guesses are in" in cur: break
        if "best guess" in cur:
            for d in "100":
                click_text(d, exact=True)
                page.wait_for_timeout(80)
            check("lock in", click_text("Lock it in"))
            page.wait_for_timeout(1000)
        elif "ready" in cur:
            click_text("ready — go")
            page.wait_for_timeout(900)
        else:
            break
    page.wait_for_timeout(1000)

    check("REVEAL reached", wait_any(["The guesses are in"]), "")
    if not any("The guesses are in" in text() for _ in [1]):
        print("=== body at fail ==="); print(text()[:600]); browser.close(); sys.exit(1)
    page.wait_for_timeout(800)
    cur = text()
    print("=== REVEAL BODY (first 400) ===")
    print(cur[:400].replace("\n", " | "))

    # ---- geometry: question banner vs cards ----
    geom = page.evaluate("""() => {
        const all = Array.from(document.querySelectorAll('div,span'));
        let q = null;
        for (const el of all) {
            const s = (el.innerText||'').trim();
            if (s === '📖 THE QUESTION') { q = el; break; }
        }
        if (!q) return {q:null};
        // climb to the banner container (the rounded box)
        let banner = q;
        for (let i=0;i<4 && banner.parentElement;i++) {
            const cs = getComputedStyle(banner);
            if (cs.borderRadius !== '0px' && cs.backgroundColor !== 'rgba(0, 0, 0, 0)') break;
            banner = banner.parentElement;
        }
        const qr = banner.getBoundingClientRect();
        // cards: white boxes with 4px border below the banner
        const cards = [];
        for (const el of document.querySelectorAll('div')) {
            const cs = getComputedStyle(el);
            const r = el.getBoundingClientRect();
            if (cs.backgroundColor === 'rgb(255, 255, 255)' && parseFloat(cs.borderWidth) >= 3 && r.top > qr.bottom - 30 && r.height > 40 && r.height < 260) {
                cards.push({top:r.top,bottom:r.bottom,left:r.left,right:r.right,w:r.width,h:r.height});
            }
        }
        // dedupe nested: keep only cards not containing another card
        const uniq = cards.filter(c => !cards.some(o => o !== c && c.top<=o.top && c.bottom>=o.bottom && c.left<=o.left && c.right>=o.right));
        // timer: find the disc in top-right (has border, near-circular, small)
        let timer = null;
        for (const el of document.querySelectorAll('div')) {
            const cs = getComputedStyle(el);
            const r = el.getBoundingClientRect();
            if (r.top < 160 && r.right > 300 && Math.abs(r.width - r.height) < 4 && r.width > 40 && r.width < 90 && parseFloat(cs.borderRadius) > 30) { timer = el; break; }
        }
        let timerInfo = null;
        if (timer) {
            const tr = timer.getBoundingClientRect();
            const svg = timer.querySelector('svg');
            const svgr = svg ? svg.getBoundingClientRect() : null;
            const centerDiv = timer.querySelector('div');
            const cnum = centerDiv ? centerDiv.querySelector('span,div') : null;
            timerInfo = {
                disc: {cx: tr.x+tr.width/2, cy: tr.y+tr.height/2, w: tr.width},
                svg: svgr ? {cx: svgr.x+svgr.width/2, cy: svgr.y+svgr.height/2, w: svgr.width, h: svgr.height} : null,
                num: cnum ? (n => n.getBoundingClientRect())(cnum) : null
            };
        }
        return {q: {top:qr.top, bottom:qr.bottom}, cards: uniq, timerInfo};
    }""")
    print("geometry:", geom["q"], "cards:", len(geom.get("cards") or []))
    if geom.get("timerInfo"):
        ti = geom["timerInfo"]
        print("timer disc center:", (ti["disc"]["cx"], ti["disc"]["cy"]))
        if ti.get("svg"): print("timer svg center:", (round(ti["svg"]["cx"],1), round(ti["svg"]["cy"],1)), "size", round(ti["svg"]["w"],1))
        if ti.get("num"):
            nr = ti["num"]
            print("number center:", (round(nr["x"]+nr["width"]/2,1), round(nr["y"]+nr["height"]/2,1)))

    if geom.get("cards"):
        qbot = geom["q"]["bottom"]
        tops = [c["top"] for c in geom["cards"]]
        overlap = min(tops) < qbot - 2
        check("cards don't overlap question banner", not overlap,
              f"banner.bottom={qbot:.0f} first_card.top={min(tops):.0f}")
        maxbot = max(c["bottom"] for c in geom["cards"])
        check("grid fits above bottom button", maxbot < 860 - 100, f"max card bottom={maxbot:.0f} vs ~760")
    else:
        check("cards present", False, "no white bordered cards found")

    if geom.get("timerInfo") and geom["timerInfo"].get("svg"):
        ti = geom["timerInfo"]
        dx = abs(ti["disc"]["cx"] - ti["svg"]["cx"])
        dy = abs(ti["disc"]["cy"] - ti["svg"]["cy"])
        check("timer ring centered on disc", dx < 1.5 and dy < 1.5, f"dx={dx:.2f} dy={dy:.2f}")
    else:
        check("timer ring present", False, "no timer disc found")

    print("JS errors:", js_errs[:5] if js_errs else "none")
    browser.close()
    print("\n=== " + ("ALL PASS" if not fails else f"FAILS: {fails}") + " ===")
    sys.exit(0 if not fails else 1)
