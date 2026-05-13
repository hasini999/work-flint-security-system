// Run on every dashboard page
window.addEventListener("load", function () {
    const userData = localStorage.getItem("loggedInUser");

    if (!userData) {
        alert("Please login first");
        window.location.href = "login.html";
        return;
    }

    const user = JSON.parse(userData);

    const nameField = document.getElementById("employee-name");

    if (nameField) {
        nameField.textContent = user.name;
    }
});


// ✅ GLOBAL LOGOUT FUNCTION
function logout() {
    const confirmLogout = confirm("Are you sure you want to logout?");

    if (confirmLogout) {
        localStorage.clear();
        sessionStorage.clear();

        // safer redirect (no back button issue)
        window.location.replace("index.html");
    }
}

function apiFetch(url, options = {}) {

    return fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            "x-session-id": localStorage.getItem("sessionId"),
            ...(options.headers || {})
        }
    })

    .then(async (response) => {

        // 🔐 AUTO SECURITY LOGOUT HANDLER
        if (response.status === 401 || response.status === 403) {
            alert("Session expired or unauthorized access detected");

            localStorage.clear();
            window.location.href = "login.html";
            return;
        }

        return response;
    });
}

/* =========================
   AUTO LOGOUT
========================= */

function safeApiFetch(url, options = {}) {

    return fetch(url, {

        ...options,

        headers: {
            "Content-Type": "application/json",
            "x-session-id": localStorage.getItem("sessionId"),
            ...(options.headers || {})
        }

    }).then(async response => {

        if (
            response.status === 401 ||
            response.status === 403
        ) {

            alert("Unauthorized or Session Expired");

            localStorage.clear();

            window.location.href = "login.html";

            return null;
        }

        return response;
    });
}