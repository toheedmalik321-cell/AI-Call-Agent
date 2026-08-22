const token = localStorage.getItem("token");

if (!token) {
    window.location = "/login";
}

const params = new URLSearchParams(window.location.search);

const id = params.get("id");

loadAgent();

async function loadAgent() {

    const res = await fetch("/agent/" + id, {

        headers: {
            Authorization: "Bearer " + token
        }

    });

    const data = await res.json();

    if (!data.success) {

        alert(data.message);

        return;

    }

    document.getElementById("companyName").value = data.data.companyName;

    document.getElementById("role").value = data.data.role;

    document.getElementById("voice").value = data.data.voice || "alice";

    document.getElementById("instructions").value = data.data.instructions;

}

document.getElementById("agentForm").addEventListener("submit", async (e) => {

    e.preventDefault();

    const res = await fetch("/agent/" + id, {

        method: "PUT",

        headers: {

            "Content-Type": "application/json",

            Authorization: "Bearer " + token

        },

       body: JSON.stringify({

    companyName: document.getElementById("companyName").value.trim(),

    role: document.getElementById("role").value,

    voice: document.getElementById("voice").value,

    instructions: document.getElementById("instructions").value.trim()

})

    });

    const data = await res.json();

    alert(data.message);

    if (data.success) {

        window.location = "/agents";

    }

});