// ==============================
// Global toast helper — replaces browser toast() popups
// Usage:
//   toast("Message")                      // success
//   toast("Message", "error")             // error style
//   toast({ message: "txt", type: "success", duration: 3000 })
// ==============================

(function () {
  if (window.toastFromCallHub) return;
  window.toastFromCallHub = true;

  function toast(arg, type) {
    var opts =
      arg && typeof arg === "object"
        ? arg
        : { message: arg, type: type || "success" };

    var message = opts.message || "";
    var kind = opts.type || "success";
    var duration = opts.duration || 3000;

    var styles = {
      success: {
        bg: "rgba(16, 185, 129, 0.14)",
        border: "rgba(16, 185, 129, 0.5)",
        icon: "✅",
      },
      error: {
        bg: "rgba(239, 68, 68, 0.14)",
        border: "rgba(239, 68, 68, 0.5)",
        icon: "⚠️",
      },
      info: {
        bg: "rgba(59, 130, 246, 0.14)",
        border: "rgba(59, 130, 246, 0.5)",
        icon: "ℹ",
      },
    };

    var c = styles[kind] || styles.success;

    var el = document.createElement("div");

    el.setAttribute("role", "status");

    el.innerHTML = '<span>' + c.icon + '</span> <span>' + message + '</span>';

    Object.assign(el.style, {
      position: "fixed",
      top: "24px",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 99999,
      background: c.bg,
      border: "1px solid " + c.border,
      color: "#fff",
      padding: "13px 22px",
      borderRadius: "12px",
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      fontSize: "14px",
      fontWeight: "600",
      lineHeight: "1.4",
      boxShadow: "0 18px 55px rgba(0, 0, 0, 0.5)",
      backdropFilter: "blur(10px)",
      display: "flex",
      alignItems: "center",
      gap: "10px",
    });

    el.style.animation = "callhubToastIn 0.35s ease";

    var key = "callhubToastKey";
    if (!document.getElementById(key)) {
      var st = document.createElement("style");
      st.id = key;
      st.textContent =
        "@keyframes callhubToastIn { from { opacity: 0; transform: translate(-50%, -16px) } to { opacity: 1; transform: translate(-50%, 0) } }";
      document.head.appendChild(st);
    }

    document.body.appendChild(el);

    setTimeout(function () {
      el.style.opacity = "0";
      el.style.transition = "opacity 0.4s ease";
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 420);
    }, duration);
  }

  window.toast = toast;

  // ==============================
  // Custom confirm dialog (replaces browser confirm())
  // Usage:
  //   const ok = await confirmDialog("Are you sure?");
  //   if (ok) { ... }
  // ==============================

  window.confirmDialog = function confirmDialog(message) {
    return new Promise(function (resolve) {
      var overlay = document.createElement("div");
      overlay.style.position = "fixed";
      overlay.style.inset = "0";
      overlay.style.zIndex = "99998";
      overlay.style.background = "rgba(2, 6, 23, 0.72)";
      overlay.style.backdropFilter = "blur(6px)";
      overlay.style.display = "flex";
      overlay.style.alignItems = "center";
      overlay.style.justifyContent = "center";
      overlay.style.padding = "20px";
      overlay.style.animation = "callhubFadeIn 0.25s ease";
      overlay.setAttribute("role", "dialog");

      var box = document.createElement("div");
      box.style.background = "rgba(15, 23, 42, 0.97)";
      box.style.border = "1px solid rgba(255, 255, 255, 0.1)";
      box.style.borderRadius = "16px";
      box.style.padding = "26px 24px";
      box.style.maxWidth = "400px";
      box.style.width = "100%";
      box.style.textAlign = "center";
      box.style.boxShadow = "0 30px 80px rgba(0,0,0,0.6)";
      box.style.fontFamily = "'Inter', 'Segoe UI', sans-serif";
      box.style.animation = "callhubModalIn 0.3s ease";

      var icon = document.createElement("div");
      icon.textContent = "⚠️";
      icon.style.fontSize = "34px";
      icon.style.marginBottom = "14px";

      var msg = document.createElement("p");
      msg.textContent = message;
      msg.style.color = "#e2e8f0";
      msg.style.fontSize = "15px";
      msg.style.lineHeight = "1.5";
      msg.style.margin = "0 0 24px";
      msg.style.fontWeight = "500";

      var btnRow = document.createElement("div");
      btnRow.style.display = "flex";
      btnRow.style.gap = "10px";

      function makeBtn(label, style) {
        var b = document.createElement("button");
        b.textContent = label;
        Object.assign(b.style, style);
        b.style.cursor = "pointer";
        b.style.border = "none";
        b.style.borderRadius = "10px";
        b.style.padding = "11px 0";
        b.style.flex = "1";
        b.style.fontWeight = "600";
        b.style.fontSize = "14px";
        b.style.transition = "opacity 0.2s ease, transform 0.1s ease";
        return b;
      }

      var cancelBtn = makeBtn("Cancel", {
        background: "rgba(255,255,255,0.07)",
        color: "#cbd5e1",
      });

      var okBtn = makeBtn("Delete", {
        background: "linear-gradient(135deg, #ef4444, #dc2626)",
        color: "#fff",
      });

      cancelBtn.onmouseenter = function () { cancelBtn.style.opacity = "0.85"; };
      cancelBtn.onmouseleave = function () { cancelBtn.style.opacity = "1"; };
      okBtn.onmouseenter = function () { okBtn.style.opacity = "0.9"; };
      okBtn.onmouseleave = function () { okBtn.style.opacity = "1"; };

      function close(result) {
        overlay.remove();
        resolve(result);
      }

      cancelBtn.onclick = function () { close(false); };
      okBtn.onclick = function () { close(true); };
      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) close(false);
      });

      btnRow.appendChild(cancelBtn);
      btnRow.appendChild(okBtn);
      box.appendChild(icon);
      box.appendChild(msg);
      box.appendChild(btnRow);
      overlay.appendChild(box);
      document.body.appendChild(overlay);

      if (!document.getElementById("callhubModalKey")) {
        var st = document.createElement("style");
        st.id = "callhubModalKey";
        st.textContent =
          "@keyframes callhubFadeIn { from { opacity: 0 } to { opacity: 1 } }" +
          "@keyframes callhubModalIn { from { opacity: 0; transform: scale(0.92) translateY(10px) } to { opacity: 1; transform: scale(1) translateY(0) } }";
        document.head.appendChild(st);
      }
    });
  };
})();