// ==============================
// Check Login
// ==============================

const token = localStorage.getItem("token");

console.log("TOKEN =", token);

if (!token) {
    alert("Please Login First");
    window.location.href = "/login";
}

// ==============================
// Get Form
// ==============================

const form = document.getElementById("callForm");

console.log("FORM =", form);

if (!form) {
    console.error("callForm not found");
} else {

    // ==============================
    // Submit Form
    // ==============================

    form.addEventListener("submit", async function (e) {

        e.preventDefault();

        console.log("Submit Clicked");

        const customerName = document.getElementById("customerName").value.trim();
        const phoneNumber = document.getElementById("phoneNumber").value.trim();
        const customerMessage = document.getElementById("customerMessage").value.trim();

        console.log({
            customerName,
            phoneNumber,
            customerMessage
        });

        try {

            const response = await fetch("/api/calls", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + token
                },
                body: JSON.stringify({
                    customerName,
                    phoneNumber,
                    customerMessage
                })
            });

            console.log("STATUS =", response.status);

            const data = await response.json();

            console.log("RESPONSE =", data);

            if (response.ok && data.success) {

                alert(data.message);

                window.location.href = "/calls";

            } else {

                alert(data.message || "Failed");

            }

        } catch (err) {

            console.error("ERROR =", err);

            alert("Server Error");

        }

    });

}