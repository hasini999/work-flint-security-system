document.getElementById("forgot-password-form").addEventListener("submit", function (e) {
    e.preventDefault();

    const email = document.getElementById("forgot-email").value;
    const question = document.getElementById("forgot-security-question").value;
    const answer = document.getElementById("forgot-security-answer").value;

    let users = JSON.parse(localStorage.getItem("users")) || [];

    const userIndex = users.findIndex(u =>
        u.email === email &&
        u.securityQuestion === question &&
        u.securityAnswer === answer
    );

    if (userIndex === -1) {
        document.getElementById("forgot-message").innerText = "Invalid details!";
        return;
    }

    const newPassword = prompt("Enter new password:");

    users[userIndex].password = newPassword;

    localStorage.setItem("users", JSON.stringify(users));

    document.getElementById("forgot-message").innerText = "Password reset successful!";
});