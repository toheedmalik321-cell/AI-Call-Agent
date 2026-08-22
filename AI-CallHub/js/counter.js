// =======================
// Counter Animation
// =======================

document.addEventListener("DOMContentLoaded", () => {

    const statObserver = new IntersectionObserver((entries) => {

        entries.forEach(entry => {

            if (entry.isIntersecting) {

                const el = entry.target;

                // Pop Animation
                el.style.opacity = "0";
                el.style.transform = "translateY(8px)";
                el.style.transition = "all .6s ease";

                requestAnimationFrame(() => {
                    el.style.opacity = "1";
                    el.style.transform = "translateY(0)";
                });

                statObserver.unobserve(el);

            }

        });

    }, {
        threshold: 0.2
    });

    document.querySelectorAll("[data-count]").forEach(el => {
        statObserver.observe(el);
    });

});