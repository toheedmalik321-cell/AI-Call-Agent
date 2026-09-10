document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    const msg = document.getElementById("msg");
    const resendSection = document.getElementById("resendSection");
    const resendBtn = document.getElementById("resendBtn");
    const resendMsg = document.getElementById("resendMsg");

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

                // If email not verified, show resend option
                if (
                    resendSection &&
                    data.message &&
                    data.message.toLowerCase().includes("verify your email")
                ) {
                    resendSection.classList.remove("hidden");
                    resendBtn.dataset.email = email;
                }

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

    // Resend verification email from login page
    if (resendBtn) {
        resendBtn.addEventListener("click", async () => {
            const email = resendBtn.dataset.email || "";

            if (!email) {
                resendMsg.textContent = "Enter your email and try logging in first.";
                resendMsg.className = "mt-3 text-center text-sm text-amber-400";
                return;
            }

            resendBtn.disabled = true;
            resendBtn.textContent = "Sending...";

            try {
                const res = await fetch("/resend-verification", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ email })
                });

                const data = await res.json();

                resendMsg.textContent = data.message || "Verification email sent.";
                resendMsg.className = "mt-3 text-center text-sm " + (res.ok ? "text-green-400" : "text-red-400");
            } catch (error) {
                console.error("Resend error:", error);
                resendMsg.textContent = "Server error. Please try again.";
                resendMsg.className = "mt-3 text-center text-sm text-red-400";
            } finally {
                resendBtn.disabled = false;
                resendBtn.textContent = "Resend Verification Email";
            }
        });
    }
});