document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('http://localhost:5050/session', {
            credentials: 'include'
        });

        const data = await response.json();

        if (!data.authenticated) {
            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error(error);
        window.location.href = 'index.html';
    }
});

const logoutButton = document.querySelector('#logout-btn');

logoutButton.addEventListener('click', async () => {
    try {
        const response = await fetch('http://localhost:5050/logout', {
            method: 'POST',
            credentials: 'include'
        });

        if (response.ok) {
            window.location.href = 'index.html';
        } else {
            alert('Logout failed.');
        }
    } catch (error) {
        console.error(error);
        alert('Unable to reach server.');
    }
});