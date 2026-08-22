document.addEventListener("DOMContentLoaded", () => {

    const menuBtn = document.getElementById("menuBtn");
    const mobileMenu = document.getElementById("mobileMenu");

    if (!menuBtn || !mobileMenu) return;

    // Open / Close Menu
    menuBtn.addEventListener("click", () => {
        mobileMenu.classList.toggle("hidden");
    });

    // Close Menu After Clicking Link
    mobileMenu.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", () => {
            mobileMenu.classList.add("hidden");
        });
    });

});