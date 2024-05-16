const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

let ship;
let cursors;
let bullets;
let spaceBar;
let escKey;
let eKey;
let lastFired = 0;
let meteors;
let maxMeteors = 5;
let meteorSpeed = 300;  // Variable para la velocidad de los meteoritos
let lives;
let heartImages = [];
let score = 0;
let scoreText;
let extraHeart;
let heartSpawnTime = 0;
let paused = false;
let bonusActive = false;
let upgradesActive = false;
let superAttackActive = false;
let newShipActive = false;
let shipUpgradeActive = false;
let gameOver = false;
let shieldActive = false;
let shieldCooldownTime = 0;
let superAttackCooldownTime = 0;
let shieldCooldownElement;
let superAttackCooldownElement;

function preload() {
    this.load.image('ship', 'nave.png');
    this.load.image('newShip', 'nueva_nave.png'); // Nueva imagen de la nave
    this.load.image('heart', 'vidas.png');
}

function create() {
    ship = this.physics.add.sprite(400, 500, 'ship');
    ship.setScale(0.1);
    ship.setCollideWorldBounds(true);

    bullets = this.physics.add.group({
        classType: Bullet,
        runChildUpdate: true
    });

    meteors = this.physics.add.group({
        classType: Meteor,
        runChildUpdate: true
    });

    extraHeart = this.physics.add.group({
        classType: Heart,
        runChildUpdate: true
    });

    cursors = this.input.keyboard.createCursorKeys();
    spaceBar = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    eKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    this.physics.add.overlap(bullets, meteors, hitMeteor, null, this);
    this.physics.add.collider(ship, meteors, loseLife, null, this);
    this.physics.add.overlap(ship, extraHeart, gainLife, null, this);

    lives = 3;
    for (let i = 0; i < lives; i++) {
        let heart = this.add.image(750 - i * 30, 50, 'heart').setScale(0.05);
        heartImages.push(heart);
    }

    scoreText = this.add.text(16, 16, 'Puntos: 0', { fontSize: '32px', fill: '#fff' });

    document.getElementById('buyBonus').addEventListener('click', buyBonus);
    document.getElementById('buyUpgrades').addEventListener('click', buyUpgrades);
    document.getElementById('buySuperAttack').addEventListener('click', buySuperAttack);
    document.getElementById('buyNewShip').addEventListener('click', buyNewShip);
    document.getElementById('buyShipUpgrade').addEventListener('click', buyShipUpgrade);

    shieldCooldownElement = document.getElementById('shieldCooldown');
    superAttackCooldownElement = document.getElementById('superAttackCooldown');

    // Expose sumarPuntos function to the global scope for console usage
    window.sumarPuntos = sumarPuntos;
}

function update(time) {
    if (gameOver) {
        return;
    }

    if (Phaser.Input.Keyboard.JustDown(escKey)) {
        if (paused) {
            this.physics.world.resume();
            paused = false;
        } else {
            this.physics.world.pause();
            paused = true;
        }
    }

    if (paused) {
        document.getElementById('buyBonus').disabled = score < 50;
        document.getElementById('buyUpgrades').disabled = score < 100;
        document.getElementById('buySuperAttack').disabled = score < 150;
        document.getElementById('buyNewShip').disabled = score < 200;
        document.getElementById('buyShipUpgrade').disabled = score < 350;
        return;
    }

    if (Phaser.Input.Keyboard.JustDown(eKey)) {
        if ((upgradesActive || newShipActive) && time > shieldCooldownTime) {
            activateShield();
            shieldCooldownTime = time + (newShipActive ? (shipUpgradeActive ? 117000 : 120000) : 480000); // 2.95 minutes for upgraded ship, 2.66 minutes for new ship, 8 minutes otherwise
        } else if (superAttackActive && time > superAttackCooldownTime) {
            activateSuperAttack();
            superAttackCooldownTime = time + 30000; // 30 seconds cooldown for super attack
        }
    }

    if (shieldActive && time > shieldCooldownTime - (newShipActive ? (shipUpgradeActive ? 117000 : 120000) : 480000) + (newShipActive ? 123000 : 30000)) {
        deactivateShield();
    }

    updateCooldowns(time);

    ship.setVelocity(0);

    let speed = newShipActive ? (shipUpgradeActive ? 450 : 400) : (upgradesActive ? 300 : 200);

    if (cursors.left.isDown) {
        ship.setVelocityX(-speed);
    } else if (cursors.right.isDown) {
        ship.setVelocityX(speed);
    }

    if (cursors.up.isDown) {
        ship.setVelocityY(-speed);
    } else if (cursors.down.isDown) {
        ship.setVelocityY(speed);
    }

    let fireDelay = newShipActive ? (shipUpgradeActive ? 75 : 100) : (upgradesActive ? 300 : 500);

    if (spaceBar.isDown && time > lastFired) {
        fireBullets(ship.x, ship.y - 20);
        lastFired = time + fireDelay;
    }

    if (meteors.countActive(true) < maxMeteors) {
        let meteor = meteors.get();
        if (meteor) {
            meteor.spawn();
        }
    }

    if (time > heartSpawnTime) {
        let heart = extraHeart.get();
        if (heart) {
            heart.spawn();
            heartSpawnTime = time + Phaser.Math.Between(10000, 20000);
        }
    }

    // Aumentar la velocidad de los meteoritos cuando se alcancen los 200 puntos
    if (score >= 200 && meteorSpeed === 300) {
        meteorSpeed = 450; // Incrementar la velocidad de los meteoritos en un 50%
        meteors.getChildren().forEach(meteor => {
            if (meteor.active) {
                meteor.body.setVelocityY(meteorSpeed);
            }
        });
    }
}

function fireBullets(x, y) {
    if (newShipActive) {
        let bulletLeft = bullets.get();
        let bulletCenter = bullets.get();
        let bulletRight = bullets.get();

        if (bulletLeft && bulletCenter && bulletRight) {
            bulletLeft.fire(x - 10, y);
            bulletCenter.fire(x, y);
            bulletRight.fire(x + 10, y);
        }
    } else {
        let bullet = bullets.get();
        if (bullet) {
            bullet.fire(x, y);
        }
    }
}

class Bullet extends Phaser.GameObjects.Rectangle {
    constructor(scene, x, y) {
        super(scene, x, y, 5, 20, 0xffffff);
        this.scene = scene;
        this.scene.physics.world.enable(this);
        this.scene.add.existing(this);
        this.body.setAllowGravity(false);
        this.setActive(false);
        this.setVisible(false);
    }

    fire(x, y) {
        this.body.reset(x, y);
        this.setActive(true);
        this.setVisible(true);
        this.body.setVelocityY(-300);
    }

    update() {
        if (this.y < 0) {
            this.setActive(false);
            this.setVisible(false);
        }
    }
}

class Meteor extends Phaser.GameObjects.Rectangle {
    constructor(scene, x, y) {
        super(scene, x, y, 20, 20, 0xff0000);
        this.scene = scene;
        this.scene.physics.world.enable(this);
        this.scene.add.existing(this);
        this.body.setAllowGravity(false);
        this.setActive(false);
        this.setVisible(false);
    }

    spawn() {
        let x = Phaser.Math.Between(50, 750);
        let y = Phaser.Math.Between(-50, -10);
        this.body.reset(x, y);
        this.setActive(true);
        this.setVisible(true);
        this.body.setVelocityY(meteorSpeed);
    }

    update() {
        if (this.y > 600) {
            this.setActive(false);
            this.setVisible(false);
        }
    }
}

class Heart extends Phaser.GameObjects.Image {
    constructor(scene, x, y) {
        super(scene, x, y, 'heart');
        this.scene = scene;
        this.scene.physics.world.enable(this);
        this.scene.add.existing(this);
        this.setScale(0.05);
        this.body.setAllowGravity(false);
        this.setActive(false);
        this.setVisible(false);
    }

    spawn() {
        let x = Phaser.Math.Between(50, 750);
        let y = Phaser.Math.Between(-50, -10);
        this.body.reset(x, y);
        this.setActive(true);
        this.setVisible(true);
        this.body.setVelocityY(100);
    }

    update() {
        if (this.y > 600) {
            this.setActive(false);
            this.setVisible(false);
        }
    }
}

function hitMeteor(bullet, meteor) {
    bullet.setActive(false);
    bullet.setVisible(false);
    meteor.setActive(false);
    meteor.setVisible(false);
    score += bonusActive ? 2 : 1;
    scoreText.setText('Puntos: ' + score);
    saveUserData();
}

function loseLife(ship, meteor) {
    if (shieldActive) return;

    meteor.setActive(false);
    meteor.setVisible(false);
    if (lives > 0) {
        lives--;
        heartImages[lives].setVisible(false);
        saveUserData();
        if (lives === 0) {
            this.physics.pause();
            ship.setTint(0xff0000);
            gameOver = true;
            document.getElementById('revive-button').style.display = 'block'; // Mostrar el botón de revivir

            // Asegurarse de que reviveGame se llama con el contexto correcto
            document.getElementById('revive-button').onclick = () => {
                reviveGame.call(this); // Llamar a reviveGame con el contexto del juego
            };

            // Actualizar el ranking
            updateRanking(score);
        }
    }
}

function gainLife(ship, heart) {
    heart.setActive(false);
    heart.setVisible(false);
    if (lives < 3) {
        heartImages[lives].setVisible(true);
        lives++;
        saveUserData();
    }
}

function buyBonus() {
    if (score >= 50) {
        score -= 50;
        bonusActive = true;
        scoreText.setText('Puntos: ' + score);
        document.getElementById('buyBonus').disabled = true;
        saveUserData();
    }
}

function buyUpgrades() {
    if (score >= 100) {
        score -= 100;
        upgradesActive = true;
        scoreText.setText('Puntos: ' + score);
        document.getElementById('buyUpgrades').disabled = true;
        saveUserData();
    }
}

function buySuperAttack() {
    if (score >= 150) {
        score -= 150;
        superAttackActive = true;
        scoreText.setText('Puntos: ' + score);
        document.getElementById('buySuperAttack').disabled = true;
        saveUserData();
    }
}

function buyNewShip() {
    if (score >= 200) {
        score -= 200;
        newShipActive = true;
        scoreText.setText('Puntos: ' + score);
        document.getElementById('buyNewShip').disabled = true;
        ship.setTexture('newShip');
        ship.setScale(0.1);
        saveUserData();
    }
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

function sumarPuntos(puntos) {
    score += puntos;
    scoreText.setText('Puntos: ' + score);
    document.getElementById('buyBonus').disabled = score < 50;
    document.getElementById('buyUpgrades').disabled = score < 100;
    document.getElementById('buySuperAttack').disabled = score < 150;
    document.getElementById('buyNewShip').disabled = score < 200;
    document.getElementById('buyShipUpgrade').disabled = score < 350;
    saveUserData();
}

function activateShield() {
    shieldActive = true;
    ship.setTint(0x00ff00);
}

function deactivateShield() {
    shieldActive = false;
    ship.clearTint();
}

function activateSuperAttack() {
    let meteorsArray = meteors.getChildren().filter(meteor => meteor.active).slice(0, 3); // Get the first 3 active meteors
    for (let i = 0; i < meteorsArray.length; i++) {
        meteorsArray[i].setActive(false);
        meteorsArray[i].setVisible(false);
        score += 4;
        scoreText.setText('Puntos: ' + score);
    }
    saveUserData();
}

function updateCooldowns(time) {
    if (shieldCooldownTime > time) {
        shieldCooldownElement.innerText = `Recargando (${Math.ceil((shieldCooldownTime - time) / 1000)}s)`;
    } else {
        shieldCooldownElement.innerText = 'Listo';
    }

    if (superAttackCooldownTime > time) {
        superAttackCooldownElement.innerText = `Recargando (${Math.ceil((superAttackCooldownTime - time) / 1000)}s)`;
    } else {
        superAttackCooldownElement.innerText = 'Listo';
    }
}

function updateRanking(finalScore) {
    if (!currentUser) {
        console.error('No user logged in');
        return;
    }

    let transaction = db.transaction(['users'], 'readwrite');
    let objectStore = transaction.objectStore('users');
    let getUserRequest = objectStore.get(currentUser.username);

    getUserRequest.onsuccess = (event) => {
        let user = event.target.result;
        if (user) {
            user.score = Math.max(user.score, finalScore);
            let updateUserRequest = objectStore.put(user);
            updateUserRequest.onsuccess = (event) => {
                console.log('User score updated successfully');
                displayRanking();
            };
        }
    };

    getUserRequest.onerror = (event) => {
        console.error('Error getting user:', event.target.errorCode);
    };
}
