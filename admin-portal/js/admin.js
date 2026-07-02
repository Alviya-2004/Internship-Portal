function login() {
    const user = document.getElementById("username").value;
    const pass = document.getElementById("password").value;

    if (user === "admin" && pass === "admin123") {
        localStorage.setItem("adminLoggedIn", "true");
        window.location.href = "dashboard.html";
    } else {
        document.getElementById("error").innerText = "Invalid credentials";
    }
}

function logout() {
    localStorage.removeItem("adminLoggedIn");
    window.location.href = "index.html";
}

function showSection(id) {
    document.querySelectorAll(".section").forEach(sec => {
        sec.classList.add("hidden");
    });
    document.getElementById(id).classList.remove("hidden");
}

// Protect dashboard
if (window.location.pathname.includes("dashboard")) {
    if (!localStorage.getItem("adminLoggedIn")) {
        window.location.href = "index.html";
    }
}
