// This is the frontEnd that modifies the HTML page directly
// event-based programming,such as document load, click a button

const loginForm = document.querySelector('#login-form');
const message = document.querySelector('#message');

loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const username = document.querySelector('#username').value;
    const password = document.querySelector('#password').value;

    try {
        const response = await fetch('http://localhost:5050/login', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                password: password
            })
        });

        const data = await response.json();

        if (response.ok) {
            window.location.href = 'home.html';
        }
        else {
            message.textContent = data.message;
            message.className = 'error';
        }
    } catch (error) {
        console.error(error);
        message.textContent = 'Unable to reach server.';
        message.className = 'error';
    }
});


    