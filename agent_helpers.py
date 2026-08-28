"""Helpers for driving the BLUFF IT RN-web app in the browser."""
import time

def page_text():
    return js("document.body ? document.body.innerText : ''")

def body_html_len():
    return js("document.body ? document.body.innerHTML.length : 0")

def find_by_text(text, exact=False):
    """Return the deepest clickable-ish element whose own text matches.
    Walks up to an element that looks pressable (role button or has cursor pointer
    or is a div with an onclick). Returns [x,y] center or None."""
    expr = """
    (text, exact) => {
      const els = Array.from(document.querySelectorAll('div, span, p, a, button'));
      let best = null;
      for (const el of els) {
        const t = (el.innerText || '').trim();
        const ok = exact ? (t === text) : (t.includes(text));
        if (!ok) continue;
        // prefer the deepest element that actually contains this text directly
        best = el;
      }
      if (!best) return null;
      // walk up to find a pressable ancestor
      let node = best;
      for (let i = 0; i < 6 && node; i++) {
        const cs = window.getComputedStyle(node);
        if (cs.cursor === 'pointer' || node.getAttribute('role') === 'button' || node.onclick) break;
        node = node.parentElement;
      }
      const target = node || best;
      const r = target.getBoundingClientRect();
      return [r.x + r.width/2, r.y + r.height/2, (target.innerText||'').trim().slice(0,40)];
    }
    """
    return js(expr + "('" + text.replace("'", "\\'") + "', " + ("true" if exact else "false") + ")")

def click_text(text, exact=False):
    r = find_by_text(text, exact)
    if not r:
        return False
    x, y = r[0], r[1]
    click_at_xy(x, y)
    return True

def wait_for_text(text, timeout=10, interval=0.25):
    t0 = time.time()
    last = ''
    while time.time() - t0 < timeout:
        last = page_text() or ''
        if text in last:
            return True
        time.sleep(interval)
    return False

def wait_gone(text, timeout=10, interval=0.25):
    t0 = time.time()
    while time.time() - t0 < timeout:
        last = page_text() or ''
        if text not in last:
            return True
        time.sleep(interval)
    return False

def press_keys(digits, exact_first_clear=True):
    """Tap a sequence of number keys on the numpad."""
    for d in digits:
        click_text(str(d), exact=True)
        time.sleep(0.08)
