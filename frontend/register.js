document.getElementById("register-form").addEventListener("submit", async function (e) {
    e.preventDefault();

    const name = document.getElementById("reg-name").value;
    const email = document.getElementById("reg-email").value;
    const password = document.getElementById("reg-password").value;
    const confirm = document.getElementById("reg-confirm-password").value;
    const role = document.getElementById("reg-role").value;
    const question = document.getElementById("reg-security-question").value;
    const answer = document.getElementById("reg-security-answer").value;

    if (password !== confirm) {
        alert("Passwords do not match!");
        return;
    }

    try {
        const response = await fetch("http://localhost:3000/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name,
                email,
                password,
                role,
                question,
                answer
            })
        });

        const data = await response.json();

        if (response.ok) {
            alert("Registration successful!");
            window.location.href = "login.html";
        } else {
            alert(data.message || "Registration failed");
        }

    } catch (error) {
        console.error(error);
        alert("Server error");
    }
});