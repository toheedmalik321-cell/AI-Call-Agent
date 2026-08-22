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

        const res = await fetch("/calls/" + id, {

            headers: {
                Authorization: "Bearer " + token
            }

        });

        const data = await res.json();

        if (!data.success) {

            alert(data.message);

            window.location = "/calls";

            return;

        }

        document.getElementById("phoneNumber").value =
            data.data.phoneNumber;

        document.getElementById("status").value =
            data.data.status;

    } catch (err) {

        console.log(err);

    }

}

loadCall();

// ==============================
// Update Call
// ==============================

document.getElementById("editCallForm").addEventListener("submit", async (e) => {

    e.preventDefault();

    const phoneNumber =
        document.getElementById("phoneNumber").value.trim();

    const status =
        document.getElementById("status").value;

    try {

        const res = await fetch("/calls/" + id, {

            method: "PUT",

            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + token
            },

            body: JSON.stringify({

                phoneNumber,
                status

            })

        });

        const data = await res.json();

        alert(data.message);

        if (data.success) {

            window.location = "/calls";

        }

    } catch (err) {

        console.log(err);

        alert("Failed to update call.");

    }
    <script src="/js/editCall.js"></script>
});