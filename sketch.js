
let playerSprite;
let floor;
let jumpSwitch = false;
let backgroundImg;
let plataformas;
let gravity = 500;
let key;
let uWin;
let winSwitch = false;
let obstacles;
let obstaclesSwitch = false;
let heart;
let lives = 3;
let gameOver;
let gameOverSwitch = false;

// cooldown de daño para no perder todas las vidas de una
let hitCooldown = 0;

// === AGREGADOS ===
let flashAlpha = 0;        // parpadeo rojo al recibir daño
let startTime;             // cronómetro (ms desde el inicio)
let bestTime = null;       // mejor tiempo (en segundos), persistido en localStorage

// Posiciones iniciales para restaurar EXACTO en reset
let initKeyPos = { x: 80, y: 100 };
let initPlatPos = [];      // [{x,y}, {x,y}, {x,y}]
let initObstPos = [];      // [{x,y}, {x,y}, {x,y}]
// =================

function preload(){
  backgroundImg = loadImage("assets/back2.png");
  uWin = loadImage("assets/uWIN.png");
  heart = loadImage("assets/heart.png");
  gameOver = loadImage("assets/gameOver.png");
}

function setup() {
  new Canvas(windowWidth, windowHeight);

  // cargar bestTime si existe
  const saved = localStorage.getItem("bestTimeSec");
  if (saved !== null) {
    const n = parseInt(saved, 10);
    if (!Number.isNaN(n)) bestTime = n;
  }

  // iniciar cronómetro
  startTime = millis();

  playerSprite = new Sprite();
  playerSprite.addAni('standing', 'assets/standing.png');
  playerSprite.addAni('left','assets/walkingLeft1.png','assets/walkingLeft2.png');
  playerSprite.addAni('right','assets/walkingRight1.png','assets/walkingRight2.png');
  playerSprite.addAni('jumping', 'assets/jumping.png');
  playerSprite.width = 60;
  playerSprite.debug = false;
  playerSprite.scale = 1.5;
  playerSprite.x = 900;
  playerSprite.mass = 1;

  // piso
  floor = new Sprite(width/2, windowHeight+10, windowWidth, 50, "static");
  floor.opacity = 0;
  world.gravity.y = gravity;

  // llave
  key = new Sprite();
  key.addAni('key','assets/key.png');
  key.x = initKeyPos.x;
  key.y = initKeyPos.y;
  key.static = true;
  key.scale = 1.0;

  // plataformas
  plataformas = new Group();
  while (plataformas.length < 3) {
    let plataforma = new plataformas.Sprite();
    plataforma.x = plataformas.length * 200;
    plataforma.y = plataformas.length * 120 + 200;
    plataforma.addAni('plataforma','assets/metalPlatform.png');
    plataforma.scale = 0.5;
    plataforma.debug = false;
    plataforma.width = 100;
    plataforma.static = true;
  }

  // guardar posiciones iniciales de plataformas
  initPlatPos = [];
  for (let i = 0; i < plataformas.length; i++) {
    initPlatPos.push({ x: plataformas[i].x, y: plataformas[i].y });
  }

  // obstáculos
  obstacles = new Group();
  while (obstacles.length < 3){
    let obstacle = new obstacles.Sprite();
    obstacle.x = obstacles.length * 250;
    obstacle.y = -800 * obstacles.length;
    obstacle.scale = 0.5;
    obstacle.addAni('obstaculo','assets/obs0.png');
    obstacle.static = true;
    obstacle.gravityScale = 0.1;
  }
  obstacles[0].x = 470;
  obstacles[1].x = 320;
  obstacles[2].x = 110;

  // guardar posiciones iniciales de obstáculos
  initObstPos = [];
  for (let i = 0; i < obstacles.length; i++) {
    initObstPos.push({ x: obstacles[i].x, y: obstacles[i].y });
  }
}

function draw() {
  // fondo
  if (backgroundImg) image(backgroundImg,0,0,windowWidth,windowHeight);
  else background(0);

  playerSprite.rotation = 0;

  // UI de vidas
  if(lives >= 1) image(heart,width-200,50,50,50);
  if(lives >= 2) image(heart,width-150,50,50,50);
  if(lives >= 3) image(heart,width-100,50,50,50);

  // === Mostrar cronómetro y mejor tiempo mientras se juega ===
  if (!gameOverSwitch && !winSwitch) {
    const seconds = int((millis() - startTime) / 1000);
    fill(255);
    textSize(20);
    textAlign(LEFT, TOP);
    text("Tiempo: " + seconds + "s", 20, 20);
    if (bestTime !== null) {
      text("Mejor: " + bestTime + "s", 20, 44);
    }
  }

  // daño con cooldown + parpadeo rojo
  if (hitCooldown > 0) hitCooldown--;
  if (hitCooldown <= 0 && playerSprite.collides(obstacles)){
    lives -= 1;
    hitCooldown = 60; // ~1s
    flashAlpha = 150; // activa parpadeo
  }
  if (flashAlpha > 0) {
    noStroke();
    fill(255, 0, 0, flashAlpha);
    rect(0, 0, width, height);
    flashAlpha = max(0, flashAlpha - 10); // desvanecer
  }

  if(lives <= 0){
    gameOverSwitch = true;
  }

  // colisiones para salto
  if (playerSprite.collides(floor)||playerSprite.collides(plataformas)) {
    jumpSwitch = true;
  }

  // plataformas que vibran al pisarlas
  if(playerSprite.collides(plataformas[2])) plataformas[2].x += random(-5,5);
  if(playerSprite.collides(plataformas[1])) plataformas[1].x += random(-5,5);
  if(playerSprite.collides(plataformas[0])) plataformas[0].x += random(-5,5);

  // activar caída de obstáculos si tocás alguna plataforma
  obstaclesSwitch = playerSprite.collides(plataformas);
  if(obstaclesSwitch){
    obstacles[0].static = false;
    obstacles[1].static = false;
    obstacles[2].static = false;
  }

  // respawn de obstáculos al tocar el piso (misma X para no “correr” layout)
  for(let i = 0; i<obstacles.length;i++){
    if(obstacles[i].collides(floor)){
      obstacles[i].y = initObstPos[i].y; // -800 * i
      obstacles[i].x = initObstPos[i].x; // su X original
      obstacles[i].static = true;        // vuelven a estado inicial de reposo
    }
  }

  // key Interaction
  if(playerSprite.collides(key)){
    // calcular tiempo y actualizar mejor marca
    const currentSec = int((millis() - startTime) / 1000);
    if (bestTime === null || currentSec < bestTime) {
      bestTime = currentSec;
      try { localStorage.setItem("bestTimeSec", String(bestTime)); } catch(e){}
    }
    winSwitch = true;
  }

  if(winSwitch){
    if (uWin) image(uWin,0,0,width,height);
    else {
      fill(255); textAlign(CENTER, CENTER); textSize(48);
      text("YOU WIN!", width/2, height/2);
    }

    // mostrar tiempos sobre la pantalla de victoria
    fill(255);
    textSize(24);
    textAlign(CENTER, TOP);
    const current = int((millis() - startTime) / 1000);
    text("Tiempo: " + current + "s", width/2, 40);
    if (bestTime !== null) text("Mejor: " + bestTime + "s", width/2, 70);

    // Ocultar elementos de juego (sin mover su posición inicial)
    for(let i = 0;i<3;i++){
      // NO cambiamos initPlatPos ni initObstPos
      // solo los “sacamos” de escena visualmente si querés:
      // plataformas[i].x = -500; obstacles[i].x = -1000;
    }
    // para no interferir, frenamos al jugador
    playerSprite.velocity.x = 0;
    playerSprite.velocity.y = 0;
  }

  // controles
  if (kb.released('d') || kb.released('a') || kb.released('w')) {
    playerSprite.changeAni('standing');
  }

  if (kb.pressing('w') && jumpSwitch && !gameOverSwitch && !winSwitch) {
    playerSprite.velocity.y = -50;
    playerSprite.changeAni('jumping');
    jumpSwitch = false;
  } else if (kb.pressing('a') && !gameOverSwitch && !winSwitch) {
    playerSprite.velocity.x = -10;
    playerSprite.changeAni('left');
  } else if (kb.pressing('d') && !gameOverSwitch && !winSwitch) {
    playerSprite.velocity.x = 10;
    playerSprite.changeAni('right');
  } else {
    playerSprite.velocity.x = 0;
  }

  // Game Over
  if(gameOverSwitch){
    if (gameOver) image(gameOver,0,0,width,height);
    else {
      fill(255); textAlign(CENTER, CENTER); textSize(48);
      text("GAME OVER", width/2, height/2);
    }

    // mostrar tiempo actual y mejor marca
    fill(255);
    textSize(24);
    textAlign(CENTER, TOP);
    const current = int((millis() - startTime) / 1000);
    text("Tiempo: " + current + "s", width/2, 40);
    if (bestTime !== null) text("Mejor: " + bestTime + "s", width/2, 70);
  }

  // --- Reinicio con R SOLO si ganó o perdió ---
  if ((gameOverSwitch || winSwitch) && kb.pressed('r')) {
    resetExactPositions();
  }
}

function resetExactPositions() {
  // estado principal
  lives = 3;
  gameOverSwitch = false;
  winSwitch = false;
  hitCooldown = 0;
  flashAlpha = 0;

  // jugador (solo él se reposiciona)
  playerSprite.x = 900;
  playerSprite.y = 100;
  playerSprite.velocity.x = 0;
  playerSprite.velocity.y = 0;
  playerSprite.changeAni('standing');

  // llave EXACTA a su posición inicial
  key.x = initKeyPos.x;
  key.y = initKeyPos.y;
  key.static = true;

  // plataformas EXACTAS a posiciones iniciales
  for (let i = 0; i < plataformas.length; i++) {
    plataformas[i].x = initPlatPos[i].x;
    plataformas[i].y = initPlatPos[i].y;
    plataformas[i].static = true;
  }

  // obstáculos EXACTOS a posiciones iniciales
  for (let i = 0; i < obstacles.length; i++) {
    obstacles[i].x = initObstPos[i].x;
    obstacles[i].y = initObstPos[i].y;
    obstacles[i].static = true;      // vuelven a reposo
    obstacles[i].velocity.x = 0;
    obstacles[i].velocity.y = 0;
  }

  // reiniciar cronómetro
  startTime = millis();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  floor.pos = { x: width / 2, y: windowHeight + 10 };
  floor.w = windowWidth;
  floor.h = 50;
}