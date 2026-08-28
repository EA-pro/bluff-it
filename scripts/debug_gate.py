"""Debug: why does 'Premium holen' click not unlock? Dump element chain + LS state."""
import time
from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:8765/"
CHROME = "/home/ubuntu/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome"

def main():
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
        page = browser.new_context(viewport={"width": 420, "height": 860}).new_page()
        page.add_init_script(
            "try { localStorage.setItem('bluff_free_day', new Date().toISOString().slice(0,10)); } catch(e) {}"
        )
        def click_text(t, exact=False):
            return bool(page.evaluate(
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
                }""", [t, exact]))

        page.goto(URL, wait_until="networkidle")
        time.sleep(2)
        click_text("Los geht's"); time.sleep(0.8)
        for name in ["Eva", "Jonas"]:
            page.fill("input", name); time.sleep(0.2)
            click_text("Hinzufügen"); time.sleep(0.4)
        click_text("Spiel starten"); time.sleep(1.5)
        print("sheet up:", "kostenloses Spiel schon weg" in page.evaluate("() => document.body.innerText"))

        # inspect the button element chain
        chain = page.evaluate(
            """() => {
                const els = Array.from(document.querySelectorAll('div,span,p,a,button'));
                let best = null;
                for (const el of els) {
                    const s = (el.innerText || '').trim();
                    if (s.includes('Premium holen')) best = el;
                }
                const out = [];
                let node = best;
                for (let i = 0; i < 8 && node; i++) {
                    const cs = getComputedStyle(node);
                    out.push(`${node.tagName} cursor=${cs.cursor} role=${node.getAttribute('role')} w=${node.getBoundingClientRect().width|0}`);
                    node = node.parentElement;
                }
                return out;
            }"""
        )
        print("CHAIN:", chain)

        ok = click_text("Premium holen")
        print("clicked:", ok)
        time.sleep(1.0)
        ls = page.evaluate("() => JSON.stringify({p: localStorage.getItem('bluff_premium'), d: localStorage.getItem('bluff_free_day')})")
        print("localStorage after click:", ls)
        t = page.evaluate("() => document.body.innerText")
        print("text after click:", t[:200].replace("\n", " | "))
        browser.close()

if __name__ == "__main__":
    main()
