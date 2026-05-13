document.getElementById("login-form").addEventListener("submit", async function (e) {

    e.preventDefault();

    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
    const question = document.getElementById("security-question").value;
    const answer = document.getElementById("security-answer-field").value;

    try {

        const response = await fetch("http://localhost:3000/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email,
                password,
                question,
                answer
            })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.message);
            return;
        }

        // ✅ STORE SESSION (IMPORTANT FOR RBAC)
        localStorage.setItem("sessionId", data.sessionId);
        // ✅ SAVE USER
        localStorage.setItem("loggedInUser", JSON.stringify({
            name: data.name,
            role: data.role,
            email: email
        }));

       
        localStorage.setItem("role", data.role);
        localStorage.setItem("name", data.name);

        alert("Login successful!");

        // ✅ ROLE REDIRECT
        if (data.role === "admin") {

            window.location.href = "admin-security-dashboard.html";

        } else if (data.role === "hr") {

            window.location.href = "hr-dashboard.html";

        } else if (data.role === "it") {

            window.location.href = "it-dashboard.html";

        } else {

            window.location.href = "index.html";
        }

    } catch (error) {

        console.log(error);
        alert("Server error");

    }

});