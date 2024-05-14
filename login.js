let db;
let currentUser;

document.addEventListener('DOMContentLoaded', () => {
    let request = indexedDB.open('gameDB', 1);

    request.onerror = (event) => {
        console.error('Database error:', event.target.errorCode);
    };

    request.onsuccess = (event) => {
        db = event.target.result;
        console.log('Database opened successfully');
    };

    request.onupgradeneeded = (event) => {
        db = event.target.result;
        let objectStore = db.createObjectStore('users', { keyPath: 'username' });
        objectStore.createIndex('password', 'password', { unique: false });
        objectStore.createIndex('score', 'score', { unique: false });
        objectStore.createIndex('lives', 'lives', { unique: false });
        objectStore.createIndex('purchases', 'purchases', { unique: false });
        console.log('Object store created successfully');
    };

    document.getElementById('login-form').addEventListener('submit', handleLogin);
});

function handleLogin(event) {
    event.preventDefault();

    let username = document.getElementById('username').value;
    let password = document.getElementById('password').value;

    let transaction = db.transaction(['users'], 'readwrite');
    let objectStore = transaction.objectStore('users');

    let getUserRequest = objectStore.get(username);

    getUserRequest.onsuccess = (event) => {
        let user = event.target.result;
        if (user) {
            if (user.password === password) {
                console.log('Login successful');
                currentUser = user;
                loadUserData(user);
            } else {
                console.error('Incorrect password');
                alert('Contraseña incorrecta');
            }
        } else {
            console.log('User not found, creating new user');
            let newUser = {
                username: username,
                password: password,
                score: 0,
                lives: 3,
                purchases: []
            };
            let addUserRequest = objectStore.add(newUser);
            addUserRequest.onsuccess = (event) => {
                console.log('User created successfully');
                currentUser = newUser;
                loadUserData(newUser);
            };
        }
    };

    getUserRequest.onerror = (event) => {
        console.error('Error getting user:', event.target.errorCode);
    };
}

function loadUserData(user) {
    // Hide the login form and show the game
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';
    document.getElementById('ranking').style.display = 'block';
    document.getElementById('sidebar').style.display = 'block';

    // Load user data into the game
    score = user.score;
    lives = user.lives;
    let purchases = user.purchases;
    bonusActive = purchases.includes('bonus');
    upgradesActive = purchases.includes('upgrades');
    superAttackActive = purchases.includes('superAttack');
    newShipActive = purchases.includes('newShip');

    scoreText.setText('Puntos: ' + score);

    for (let i = 0; i < lives; i++) {
        heartImages[i].setVisible(true);
    }
    for (let i = lives; i < 3; i++) {
        heartImages[i].setVisible(false);
    }

    document.getElementById('buyBonus').disabled = bonusActive || score < 50;
    document.getElementById('buyUpgrades').disabled = upgradesActive || score < 100;
    document.getElementById('buySuperAttack').disabled = superAttackActive || score < 150;
    document.getElementById('buyNewShip').disabled = newShipActive || score < 200;
}

function saveUserData() {
    let transaction = db.transaction(['users'], 'readwrite');
    let objectStore = transaction.objectStore('users');
    let updateUserRequest = objectStore.put({
        username: currentUser.username,
        password: currentUser.password,
        score: score,
        lives: lives,
        purchases: getPurchasesArray()
    });

    updateUserRequest.onsuccess = (event) => {
        console.log('User data updated successfully');
    };

    updateUserRequest.onerror = (event) => {
        console.error('Error updating user data:', event.target.errorCode);
    };
}

function getPurchasesArray() {
    let purchases = [];
    if (bonusActive) purchases.push('bonus');
    if (upgradesActive) purchases.push('upgrades');
    if (superAttackActive) purchases.push('superAttack');
    if (newShipActive) purchases.push('newShip');
    return purchases;
}
