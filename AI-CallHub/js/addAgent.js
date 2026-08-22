const token = localStorage.getItem("token");

if (!token) {
    window.location = "/login";
}

const form = document.getElementById("agentForm");

form.addEventListener("submit", async (e) => {

    e.preventDefault();

    try {

        const res = await fetch("/agent", {

            method: "POST",

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

    }

    catch (err) {

        console.log(err);

        alert("Unable to create agent.");

    }

});