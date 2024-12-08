document.getElementById("register-button").addEventListener("click", async () => {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const department = document.getElementById("department").value;

    if (!username || !password || !department) {
        alert('Please fill in all fields.');
        return;
    }

    const response = await fetch('/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password, department }),
    });

    const data = await response.json();

    if (data.success) {
        alert('Registration successful! You can now log in.');
        window.location.href = '/'; // Redirect to login page
    } else {
        alert('Registration failed: ' + data.message);
    }
});
