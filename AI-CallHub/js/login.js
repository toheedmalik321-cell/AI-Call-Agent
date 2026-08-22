
document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    const msg = document.getElementById("msg");

    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        if (!email || !password) {
            msg.textContent = "Please enter email and password.";
            msg.className = "mt-5 text-center text-sm text-red-400";
            return;
        }

        try {
            const response = await fetch("/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email,
                    password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                msg.textContent = data.message || "Login failed.";
                msg.className = "mt-5 text-center text-sm text-red-400";
                return;
            }

            msg.textContent = "Login successful!";
            msg.className = "mt-5 text-center text-sm text-green-400";

            // If backend returns a token
            if (data.token) {
                localStorage.setItem("token", data.token);
            }

            setTimeout(() => {
                window.location.href = "/dashboard";
            }, 500);

        } catch (error) {
            console.error("Login error:", error);

            msg.textContent = "Server error. Please try again.";
            msg.className = "mt-5 text-center text-sm text-red-400";
        }
    });
});
