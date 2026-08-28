(() => {
  "use strict";

  if (window.top === window && location.pathname.toLowerCase() === "/mypage/sub09_main.aspx") {
    location.replace("/mypage/sub09_02.aspx");
    return;
  }

  document.addEventListener("better-esimson-page-click", () => {
    const id = document.documentElement.getAttribute("data-better-esimson-click-target");
    document.documentElement.removeAttribute("data-better-esimson-click-target");
    if (!id) return;
    const target = Array.from(document.querySelectorAll("[data-better-esimson-action]")).find((node) => node.getAttribute("data-better-esimson-action") === id);
    if (!target) return;
    if (target.matches?.("select")) {
      target.dispatchEvent(new Event("change", { bubbles:true, cancelable:true }));
      return;
    }
    // Submit controls need their native click so inline validation and the
    // form's default POST both run. Calling only `onclick` skips submission.
    if (target.matches?.('button, input[type="submit"], input[type="image"]')) {
      target.click();
      return;
    }
    const source = target.getAttribute("href") || target.getAttribute("onclick") || target.getAttribute("onchange") || "";
    const call = source.match(/^\s*javascript:\s*(?:return\s+)?([\w$.]+)\s*\(([\s\S]*)\)\s*;?\s*(?:return\s+false\s*;?)?\s*$/i) || source.match(/^\s*(?:return\s+)?([\w$.]+)\s*\(([\s\S]*)\)\s*;?\s*(?:return\s+false\s*;?)?\s*$/i);
    if (call) {
      const fn = call[1].split(".").reduce((value, key) => value?.[key], window);
      if (typeof fn === "function") {
        const args = (call[2].match(/'(?:\\.|[^'])*'|"(?:\\.|[^"])*"|[^,]+/g) || []).map((part) => {
          const value = part.trim();
          if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) return value.slice(1, -1).replace(/\\(['"\\])/g, "$1");
          if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value);
          if (value === "true" || value === "false") return value === "true";
          return value === "null" ? null : value;
        });
        fn.apply(window, args);
        return;
      }
    }
    if (typeof target.onclick === "function") {
      const event = new MouseEvent("click", { bubbles:true, cancelable:true, view:window });
      target.onclick.call(target, event);
      return;
    }
    const href = target.getAttribute("href") || "";
    if (/^\s*javascript:/i.test(href)) return;
    if (typeof target.click === "function") target.click();
  });
})();
