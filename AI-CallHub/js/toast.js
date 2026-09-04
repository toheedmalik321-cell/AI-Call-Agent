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
})();