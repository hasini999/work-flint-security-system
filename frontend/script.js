window.onload = function () {
    const user = JSON.parse(localStorage.getItem("loggedInUser"));

    if (user) {
        const header = document.querySelector(".header-text");

        header.innerHTML += `
            <p style="color: lightgreen; margin-top:10px;">
                Welcome, ${user.name} (${user.role})
            </p>
        `;
    }
};