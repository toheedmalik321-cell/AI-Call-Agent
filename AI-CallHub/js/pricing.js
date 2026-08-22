document.addEventListener("DOMContentLoaded", () => {

    const toggle = document.getElementById("billingToggle");
    const monthLabel = document.getElementById("toggleLabelMonth");
    const yearLabel = document.getElementById("toggleLabelYear");
    const prices = document.querySelectorAll(".price");

    // Safety Check
    if (!toggle || !monthLabel || !yearLabel) return;

    let yearly = false;

    // Default Active State
    monthLabel.style.background = "rgba(255,255,255,0.06)";
    yearLabel.style.background = "transparent";

    toggle.addEventListener("click", () => {

        yearly = !yearly;

        if (yearly) {

            monthLabel.className =
                "px-4 py-1.5 rounded-full text-slate-400";

            yearLabel.className =
                "px-4 py-1.5 rounded-full font-semibold flex items-center gap-2";

            yearLabel.style.background = "rgba(255,255,255,0.06)";
            monthLabel.style.background = "transparent";

        } else {

            yearLabel.className =
                "px-4 py-1.5 rounded-full text-slate-400 flex items-center gap-2";

            monthLabel.className =
                "px-4 py-1.5 rounded-full font-semibold";

            monthLabel.style.background = "rgba(255,255,255,0.06)";
            yearLabel.style.background = "transparent";
        }

        prices.forEach(price => {

            const value = yearly
                ? price.dataset.yearly
                : price.dataset.monthly;

            price.innerHTML = `$<b>${value}</b>`;
        });

    });

});