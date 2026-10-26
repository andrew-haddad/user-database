const registerForm = document.querySelector('#register-form');
const message = document.querySelector('#message');

registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const firstname = document.querySelector('#firstname').value;
    const lastname = document.querySelector('#lastname').value;
    const username = document.querySelector('#username').value;
    const password = document.querySelector('#password').value;
    const age = Number(document.querySelector('#age').value);
    const salary = Number(document.querySelector('#salary').value);

    try {
        const response = await fetch('http://localhost:5050/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                firstname: firstname,
                lastname: lastname,
                username: username,
                password: password,
                age: age,
                salary: salary
            })
        });

        const data = await response.json();

        message.textContent = data.message;

        if (response.ok) {
            message.style.color = 'green';
        }
        else {
            message.style.color = 'red';
        }


    } catch (error) {
        console.error(error);
        message.textContent = 'Unable to reach server.';
        message.style.color = 'red';
    }
});