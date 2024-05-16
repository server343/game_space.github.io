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
        displayRanking();
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

    document.getElementById('login-button').addEventListener('click', () => {
        document.getElementById('initial-container').style.display = 'none';
        document.getElementById('login-container').style.display = 'flex';
    });

    document.getElementById('register-button').addEventListener('click', () => {
        document.getElementById('initial-container').style.display = 'none';
        document.getElementById('register-container').style.display = 'flex';
    });

    document.getElementById('back-to-initial').addEventListener('click', () => {
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('initial-container').style.display = 'flex';
    });

    document.getElementById('back-to-initial-reg').addEventListener('click', () => {
        document.getElementById('register-container').style.display = 'none';
        document.getElementById('initial-container').style.display = 'flex';
    });

    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('register-form').addEventListener('submit', handleRegister);
    document.getElementById('revive-button').addEventListener('click', reviveGame);
    document.getElementById('buyShipUpgrade').addEventListener('click', buyShipUpgrade);
});

function handleLogin(event) {
    event.preventDefault();

    let username = document.getElementById('login-username').value;
    let password = document.getElementById('login-password').value;

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
            console.error('User not found');
            alert('Usuario no encontrado');
        }
    };

    getUserRequest.onerror = (event) => {
        console.error('Error getting user:', event.target.errorCode);
    };
}

function handleRegister(event) {
    event.preventDefault();

    let username = document.getElementById('register-username').value;
    let password = document.getElementById('register-password').value;

    let transaction = db.transaction(['users'], 'readwrite');
    let objectStore = transaction.objectStore('users');

    let getUserRequest = objectStore.get(username);

    getUserRequest.onsuccess = (event) => {
        let user = event.target.result;
        if (user) {
            console.error('User already exists');
            alert('El usuario ya existe');
        } else {
            let newUser = {
                username: username,
                password: password,
                score: 0,
                lives: 3,
                purchases: []
            };
            let addUserRequest = objectStore.add(newUser);
            addUserRequest.onsuccess = (event) => {
                console.log('User registered successfully');
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
    document.getElementById('register-container').style.display = 'none';
    document.getElementById('initial-container').style.display = 'none';
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
    shipUpgradeActive = purchases.includes('shipUpgrade');

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
    document.getElementById('buyShipUpgrade').disabled = shipUpgradeActive || score < 350;
}

function saveUserData() {
    if (!currentUser) {
        console.error('No user logged in');
        return;
    }

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
    if (shipUpgradeActive) purchases.push('shipUpgrade');
    return purchases;
}

function reviveGame() {
    // Reset game variables
    score = 0;
    lives = 3;
    bonusActive = false;
    upgradesActive = false;
    superAttackActive = false;
    newShipActive = false;
    shipUpgradeActive = false;

    // Hide the revive button
    document.getElementById('revive-button').style.display = 'none';

    // Update the game UI
    scoreText.setText('Puntos: ' + score);
    for (let i = 0; i < heartImages.length; i++) {
        heartImages[i].setVisible(i < lives);
    }
    document.getElementById('buyBonus').disabled = score < 50;
    document.getElementById('buyUpgrades').disabled = score < 100;
    document.getElementById('buySuperAttack').disabled = score < 150;
    document.getElementById('buyNewShip').disabled = score < 200;
    document.getElementById('buyShipUpgrade').disabled = score < 350;

    // Save the reset data
    saveUserData();

    // Restart the game
    gameOver = false;
    ship.clearTint();
    game.scene.scenes[0].physics.resume();
    ship.setPosition(400, 500); // Reset ship position
}

function buyShipUpgrade() {
    if (score >= 350) {
        score -= 350;
        shipUpgradeActive = true;
        scoreText.setText('Puntos: ' + score);
        document.getElementById('buyShipUpgrade').disabled = true;
        saveUserData();
    }
}

function displayRanking() {
    let transaction = db.transaction(['users'], 'readonly');
    let objectStore = transaction.objectStore('users');
    let request = objectStore.getAll();

    request.onsuccess = (event) => {
        let users = event.target.result;
        users.sort((a, b) => b.score - a.score);

        let rankingContainer = document.getElementById('ranking-container');
        rankingContainer.innerHTML = '';

        for (let i = 0; i < Math.min(5, users.length); i++) {
            let user = users[i];
            let userElement = document.createElement('div');
            userElement.textContent = `${user.username}: ${user.score} puntos`;
            rankingContainer.appendChild(userElement);
        }
    };

    request.onerror = (event) => {
        console.error('Error retrieving ranking:', event.target.errorCode);
    };
}
