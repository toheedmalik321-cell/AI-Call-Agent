document.addEventListener("DOMContentLoaded", () => {

    const guestMenu = document.getElementById("guestMenu");
    const userMenu = document.getElementById("userMenu");
    const logoutBtn = document.getElementById("logoutBtn");

    const token = localStorage.getItem("token");

    if (token) {

        guestMenu?.classList.add("hidden");
        userMenu?.classList.remove("hidden");

    } else {

        guestMenu?.classList.remove("hidden");
        userMenu?.classList.add("hidden");

    }

    logoutBtn?.addEventListener("click", () => {

        localStorage.removeItem("token");
        localStorage.removeItem("user");

        window.location = "/";

    });

});