const token = localStorage.getItem("token");

console.log("TOKEN:", token);

fetch("/api/profile", {
    method: "GET",
    headers: {
        Authorization: "Bearer " + token
    }
})
.then(res => res.json())
.then(data => {

    console.log("API Response:", data);

    if (!data.success) {
        toast(data.message);
        return;
    }

  document.getElementById("name").value = data.data.name;
document.getElementById("email").value = data.data.email;
document.getElementById("phone").value = data.data.phone || "";
document.getElementById("company").value = data.data.company || "";

})
.catch(err => {
    console.log("ERROR:", err);
});
document.getElementById("saveBtn").addEventListener("click", async () => {

    const phone = document.getElementById("phone").value;

    const company = document.getElementById("company").value;

    const res = await fetch("/api/profile", {

        method: "PUT",

        headers: {

            "Content-Type": "application/json",

            Authorization: "Bearer " + token

        },

        body: JSON.stringify({

            phone,

            company

        })

    });

    const data = await res.json();

    document.getElementById("msg").innerText = data.message;

});
document.getElementById("changePasswordBtn").addEventListener("click", async () => {

    const currentPassword = document.getElementById("currentPassword").value;

    const newPassword = document.getElementById("newPassword").value;

    const confirmPassword = document.getElementById("confirmPassword").value;

    if (newPassword !== confirmPassword) {

        document.getElementById("passwordMsg").innerText =
            "Passwords do not match";

        return;

    }

    const res = await fetch("/api/change-password", {

        method: "PUT",

        headers: {

            "Content-Type": "application/json",

            Authorization: "Bearer " + token

        },

        body: JSON.stringify({

            currentPassword,

            newPassword

        })

    });

    const data = await res.json();

    document.getElementById("passwordMsg").innerText = data.message;

});