document.addEventListener("DOMContentLoaded", () => {

    const guestMenu = document.getElementById("guestMenu");
    const userMenu = document.getElementById("userMenu");
    const logoutBtn = document.getElementById("logoutBtn");

    const token = localStorage.getItem("token");

    // Check if the saved token is still valid (not expired / not malformed).
    // If it is stale, treat the user as logged out and show the guest menu.
    const isValidToken = (token) => {

        if (!token) {
            return false;
        }

        try {

            const parts = token.split(".");

            if (parts.length !== 3) {
                return false;
            }

            const payload = JSON.parse(
                decodeURIComponent(
                    escape(
                        atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
                    )
                )
            );

            if (!payload.exp) {
                return false;
            }

            // exp is in seconds; add small buffer
            return payload.exp * 1000 > Date.now() + 5000;

        } catch (err) {

            return false;

        }

    };

    if (isValidToken(token)) {

        if (guestMenu) {
            guestMenu.classList.add("hidden");
        }

        if (userMenu) {
            userMenu.classList.remove("hidden");
        }

    } else {

        // Stale or invalid token -> clean it and show guest menu
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        if (guestMenu) {
            guestMenu.classList.remove("hidden");
        }

        if (userMenu) {
            userMenu.classList.add("hidden");
        }

    }

    logoutBtn?.addEventListener("click", () => {

        localStorage.removeItem("token");
        localStorage.removeItem("user");

        window.location = "/";

    });

});