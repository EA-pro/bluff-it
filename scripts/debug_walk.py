"""Debug probe: drive to the guess relay and dump what the app shows."""
import os, time
from playwright.sync_api import sync_playwright

URL = os.environ.get("BLUFF_URL", "http://127.0.0.1:8765/")
CHROME = "/home/ubuntu/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome"

def main():
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
        page = browser.new_page(viewport={"width": 420, "height": 860})
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)

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

        page.goto(URL, wait_until="networkidle")
        time.sleep(1.5)
        click_text("Let's play")
        time.sleep(0.6)
        for name in ["Eva", "Jonas"]:
            page.fill("input", name); time.sleep(0.15)
            click_text("Add player"); time.sleep(0.4)
        click_text("Start the chaos")
        time.sleep(1.0)
        click_text("Continue")
        time.sleep(1.0)
        # now: handoff #1 expected
        for step in range(8):
            t = text()
            print(f"[step {step}] {t[:260]!r}\n")
            if "I'm ready" in t:
                print("  -> clicking I'm ready")
                click_text("I'm ready"); time.sleep(0.8); continue
            if "is guessing" in t:
                print("  -> on keypad, clicking 7,8,9,0, Lock it in")
                for d in "7890":
                    print("  click", d, "->", click_text(d, exact=True)); time.sleep(0.15)
                t2 = text()
                print("  value box now:", [l for l in t2.split('\n') if l.strip()][:8])
                print("  lock ->", click_text("Lock it in")); time.sleep(1.0)
                continue
            if "THE TRUTH IS" in t:
                print("  ** reached reveal **"); break
        print("\n=== FINAL SCREEN ===")
        print(text())
        print("\n=== ERRORS ===")
        for e in errors[:15]:
            print(" -", e[:300])
        if not errors: print(" (none)")
        browser.close()

if __name__ == "__main__":
    main()
