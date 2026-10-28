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

// search forms

const API = 'http://localhost:5050';
const resultsBody = document.querySelector('#table-body');
const statusMessage = document.querySelector('#message');
const COLUMNS = ['username', 'firstname', 'lastname', 'salary', 'age', 'registerday', 'signintime'];

function showMessage(text, isError) {
    statusMessage.textContent = text;
    statusMessage.className = isError ? 'error' : 'ok';
}

function renderTable(rows) {
    resultsBody.replaceChildren();
    for (const row of rows) {
        const tr = document.createElement('tr');
        for (const column of COLUMNS) {
            const td = document.createElement('td');
            td.textContent = row[column] === null ? 'Never' : row[column];
            tr.appendChild(td);
        }
        resultsBody.appendChild(tr);
    }
}

async function runSearch(path, params) {
    const query = new URLSearchParams(params).toString();
    try {
        const response = await fetch(`${API}/search/${path}${query ? '?' + query : ''}`, {
            credentials: 'include'
        });
        const data = await response.json();

        if (response.status === 401) {
            window.location.href = 'index.html';
            return;
        }
        if (!response.ok) {
            renderTable([]);
            showMessage(data.message, true);
            return;
        }
        renderTable(data.data);
        showMessage(`${data.data.length} user(s) found.`, false);
    } catch (error) {
        console.error(error);
        showMessage('Unable to reach server.', true);
    }
}

function wireForm(formId, path, getParams) {
    document.querySelector(formId).addEventListener('submit', (event) => {
        event.preventDefault();
        runSearch(path, getParams());
    });
}

const value = (id) => document.querySelector(id).value;

wireForm('#name-search', 'name', () => ({ firstname: value('#firstname'), lastname: value('#lastname') }));
wireForm('#username-search', 'username', () => ({ username: value('#username') }));
wireForm('#age-search', 'age', () => ({ min: value('#age-min'), max: value('#age-max') }));
wireForm('#salary-search', 'salary', () => ({ min: value('#salary-min'), max: value('#salary-max') }));
wireForm('#registered-after-search', 'registered-after', () => ({ username: value('#after-username') }));
wireForm('#never-signed-in-search', 'never-signed-in', () => ({}));
wireForm('#same-day-search', 'same-day', () => ({ username: value('#same-day-username') }));
wireForm('#today-search', 'today', () => ({}));
