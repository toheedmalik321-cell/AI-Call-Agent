// ==============================
// Check Login
// ==============================

const token = localStorage.getItem("token");

if (!token) {
    window.location = "/login";
}

// ==============================
// Get Call ID
// ==============================

const params = new URLSearchParams(window.location.search);

const id = params.get("id");

if (!id) {
    alert("Invalid Call ID");
    window.location = "/calls";
}

// ==============================
// Load Call Data
// ==============================

async function loadCall() {

    try {

        const res = await fetch("/api/calls/" + id, {

            headers: {
                Authorization: "Bearer " + token
            }

        });

        const data = await res.json();

        if (!data.success) {

            alert(data.message || "Unable to load call");

            window.location = "/calls";

            return;

        }

        const phoneInput = document.getElementById("phoneNumber");
        const statusInput = document.getElementById("status");

        if (phoneInput) {
            phoneInput.value = data.data.phoneNumber || "";
        }

        if (statusInput) {
            statusInput.value = data.data.status || "pending";
        }

    } catch (err) {

        console.error(err);
        alert("Unable to load call.");

    }

}

loadCall();

// ==============================
// Update Call
// ==============================

const editCallForm = document.getElementById("editCallForm");

if (editCallForm) {

    editCallForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        const phoneNumber = document.getElementById("phoneNumber").value.trim();
        const status = document.getElementById("status").value;

        try {

            const res = await fetch("/api/calls/" + id, {

                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer " + token
                },
                body: JSON.stringify({ phoneNumber, status })

            });

            const data = await res.json();

            alert(data.message);

            if (data.success) {
                window.location = "/calls";
            }

        } catch (err) {

            console.error(err);
            alert("Failed to update call.");

        }

    });

}