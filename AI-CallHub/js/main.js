document.addEventListener("DOMContentLoaded", () => {

    // ===============================
    // AOS Animation
    // ===============================
    AOS.init({
        duration: 700,
        once: true,
        offset: 60,
        easing: "ease-out-cubic"
    });

    // ===============================
    // Voice Demo Button
    // ===============================
    const demoBtn = document.getElementById("demoBtn");

    if (demoBtn) {

        demoBtn.addEventListener("click", () => {

            demoBtn.innerHTML = `
                <span class="wave mx-auto" style="height:18px;width:60px">
                    <span style="animation-delay:0s"></span>
                    <span style="animation-delay:.1s"></span>
                    <span style="animation-delay:.2s"></span>
                    <span style="animation-delay:.3s"></span>
                    <span style="animation-delay:.2s"></span>
                    <span style="animation-delay:.1s"></span>
                    <span style="animation-delay:0s"></span>
                </span>
                AI Agent speaking...
            `;

            setTimeout(() => {

                demoBtn.innerHTML = `
                    <svg class="w-5 h-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2">
                        <path d="M20 6L9 17l-5-5"/>
                    </svg>
                    Demo request queued
                `;

            }, 2800);

        });

    }

});