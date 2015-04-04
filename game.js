(function () {

var constants = {
  EXPLOSION_MAX_TIME: 2,
  TEXT_MAX_TIME: 1,
  STATE_PLAY: 1,
  STATE_END: 0
};

var app = {
  state: 0,
  score: 0,
  difficulty: 0,
  shotFired: false,
  gameEnded: false
};

//------------------------------
// Game Core
//------------------------------

(function initGame() {
  var canvas = document.getElementById("canvas");
  app.ctx = canvas.getContext("2d");

  scaleCanvas();

  // load assets
  app.shipImage = new Image();
  app.shipImage.src = "images/ship.png"; // http://www.over00.com/index.php/archives/1844

  app.laserImage = new Image();
  app.laserImage.src = "images/laser.png"; //http://opengameart.org/content/lasers-and-beams

  app.rockImage = new Image();
  app.rockImage.src = "images/rock.png"; // http://www.zimnox.com/resources/textures/

  app.explosionImage = new Image();
  app.explosionImage.src = "images/explosion.png"; // http://dbszabo1.deviantart.com/art/misc-explosion-element-png-309933232
  
  app.laserSound = new Audio();
  app.laserSound.src = "audio/laser.wav"; // https://www.freesound.org/people/Julien%20Matthey/sounds/268344/
  
  app.explosionSound = new Audio();
  app.explosionSound.src = "audio/explosion.wav"; // https://www.freesound.org/people/ryansnook/sounds/110113/

  app.themesongSound = new Audio();
  app.themesongSound.src = "audio/gunman.wav"; // http://www.playonloop.com/2012-music-loops/gunman/
  app.themesongSound.volume = 0.75;
  app.themesongSound.loop = true;
  app.themesongSound.play();

  // register events
  canvas.addEventListener("mousemove", handleMouseMove, false);
  window.addEventListener("resize", handleWindowResize, false);
  document.addEventListener("keyup", handleDocumentKeyup, false);
  document.addEventListener("keypress", handleDocumentKeypress, false);

  // list of objects
  app.objects = [];

  // create stars
  spawnStars();

  // animation loop
  animationLoop();
})();

function startGame() {
  clearCanvas();

  // reset state
  app.state = constants.STATE_PLAY;
  app.score = 0;
  app.difficulty = 0;

  // list of objects
  app.objects = [];
  
  // create hero and world objects
  spawnHero();
  spawnStars();
  spawnAllRocks();
}

function animationLoop() {
  window.requestAnimationFrame(frameUpdate);
}

function frameUpdate(timestamp) {
  animationLoop();
 
  // delta time calculation
  if (!app.lastTimeStamp) {
    app.lastTimeStamp = timestamp;
  }
  var dt = (timestamp - app.lastTimeStamp)/1000;
  app.lastTimeStamp = timestamp;

  // score
  if (app.state === constants.STATE_PLAY) {
    app.score += (dt * 10);

    // increase difficulty
    if (Math.floor(app.score / 100) > app.difficulty) {
      app.difficulty++;
      spawnRock();
    }
  }

  // object update loop
  var i = app.objects.length;
  while (i--) {
    var o = app.objects[i];

    if (o.roll) {
      o.angle += o.roll * dt;
    }

    if (o.type === "laser") {
      // move laser
      if (o.speed) {
        o.pos.y -= o.speed * dt;
      }

      // check for laser off the top
      if (o.pos.y + o.size < 0) {
        app.objects.splice(i, 1);
      }

      // detect collision
      if (app.state === constants.STATE_PLAY) {
        var j = app.objects.length;
        while (j--) {
          var e = app.objects[j];
          if (e.type !== "rock") {
            continue;
          }

          if (detectCollision(o, e)) {
            app.score += 10;
            app.objects.splice(j, 1);
            app.objects.splice(i - 1, 1);
            spawnExplosion(e, 5, 0.5);
            spawnText("+10", dt, e);
            spawnRock();
            break;
          }
        }
      }
    }

    if (o.type === "explosion") {
      // update explosion timer
      o.timer += dt * o.speed;
      if (o.timer > constants.EXPLOSION_MAX_TIME) {
        app.objects.splice(i, 1);
      }
    }

    if (o.type === "text") {
      // update text timer
      o.timer += dt;
      if (o.timer > constants.TEXT_MAX_TIME) {
        app.objects.splice(i, 1);
      }
    }

    if (o.type === "rock") {
      // move rock
      if (o.speed) {
        o.pos.y += o.speed * dt;
      }

      // check for rock off the bottom, respawn at top
      if (o.pos.y - o.size > app.height) {
        app.objects.splice(i, 1);
        spawnRock();
      }

      // collision detection
      if (app.state === constants.STATE_PLAY) {
        if (detectCollision(o, app.hero)) {
          app.state = constants.STATE_END;
          app.gameEnded = true;
          spawnExplosion(app.hero);
        }
      }
    }
  }

  // redraw everything 
  drawScene();

  // draw intro/game over
  if (app.state === constants.STATE_END) {
    if (app.score === 0) {
      drawIntro();
    } else {
      drawGameOver();
    }
  }
}

function detectCollision(a, b) {
  var dx = a.pos.x - b.pos.x;
  var dy = a.pos.y - b.pos.y;
  var dist = Math.sqrt(dx * dx + dy * dy);
  return dist < 50;
}

//------------------------------
// Drawing Routines
//------------------------------

function drawIntro() {
  var ctx = app.ctx;

  // draw name
  ctx.textAlign = "center";
  ctx.fillStyle = "#00ffff";
  ctx.font = "130px Calibri";
  ctx.fillText("Asteroid Evader", app.width/2, app.height/4);

  // draw instructions
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff";
  ctx.font = "20px Calibri";
  ctx.fillText("Use mouse to navigate ship through asteroid field", app.width/2, app.height/2);

  ctx.textAlign = "center";
  ctx.fillStyle = "#fff";
  ctx.font = "20px Calibri";
  ctx.fillText("Press spacebar to shoot lasers ", app.width/2, app.height/2+25);


  // draw start
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff";
  ctx.font = "italic 20px Calibri";
  ctx.fillText("(press any key to play)", app.width/2, app.height/2+75);
}

function drawGameOver() {
  var ctx = app.ctx;
  ctx.textAlign = "center";
  ctx.fillStyle = "#00ffff";
  ctx.font = "italic 130px Calibri";
  ctx.fillText("Game Over", app.width/2, app.height/2);

  // draw start
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff";
  ctx.font = "italic 20px Calibri";
  ctx.fillText("(press any key to play again)", app.width/2, app.height/2+50);
}

function drawScene() {
  clearCanvas();

  var ctx = app.ctx;

  // draw all objects
  for (var i=0; i<app.objects.length; i++) {
    var o = app.objects[i];

    if (o.type === "hero" && app.state !== constants.STATE_PLAY) {
      continue;
    }

    ctx.save();
    if (o.type === "star") {
      ctx.beginPath();
      ctx.globalAlpha = o.brightness;
      ctx.fillStyle = o.color;
      ctx.arc(o.pos.x, o.pos.y, o.radius, 0, Math.PI * 2, true);
      ctx.fill();
      ctx.closePath();
    } else if (o.type === "text") {
      ctx.globalAlpha = 1 - (o.timer / constants.TEXT_MAX_TIME);
      ctx.textAlign = "center";
      ctx.fillStyle = "#00ffff";
      ctx.font = "20px Calibri";
      ctx.fillText(o.text, o.pos.x, o.pos.y);
    } else {
      if (o.alpha) {
        var alpha;
        if (typeof o.alpha === "function") {
          alhpa = o.alpha();
        } else {
          alpha = o.alpha;
        }
        ctx.globalAlpha = alpha;
      }
      
      var factor = 1;
      if (o.type === "explosion") {
        factor = 2;
      }

      ctx.translate(o.pos.x, o.pos.y);
      ctx.rotate(o.angle);
      ctx.drawImage(o.image, -o.size/2, -o.size/2, o.size * factor, o.size * factor);
    }
    ctx.restore();
  }

  // draw score
  if (app.score > 0) {
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.font = "italic 30px Calibri";
    ctx.fillText("Score " + Math.floor(app.score), app.width/2, 50);
  }
}

//------------------------------
// Object Spawning
//------------------------------

function spawnExplosion(relative, speed, volume) {
  app.objects.push({
    type: "explosion",
    alpha: function () { return 1 - (this.timer / constants.EXPLOSION_MAX_TIME); },
    timer: 0.1,
    pos: {x: relative.pos.x - (relative.size/2), y: relative.pos.y - (relative.size/2)},
    size: relative.size,
    speed: speed || 1,
    image: app.explosionImage
  });
  playSound("explosion", volume);
}

function spawnStars() {
  // http://codepen.io/iblamefish/pen/xgefG?editors=001
  var STAR_COLOURS = ["#ffffff", "#ffe9c4", "#d4fbff"];
  function random(min, max) {
    return Math.round((Math.random() * max - min) + min);
  }

  for (var i=0; i<500; i++) {
    app.objects.push({
      type: "star",
      pos: {x: Math.random() * app.width, y: Math.random() * app.height},
      radius: Math.random() * 1.1,
      brightness: random(80, 100) / 100,
      color: STAR_COLOURS[random(0, STAR_COLOURS.length)]
    });
  }
}

function spawnText(text, timer, relative) {
  app.objects.push({
    type: "text",
    pos: relative.pos,
    text: text,
    timer: timer
  });
}

function spawnLaser() {
  // no shooting when game's over
  if (app.state === constants.STATE_END) {
    return;
  }

  // throttle rate of fire
  if (app.shotFired) {
    return;
  } else {
    app.shotFired = true;
    setTimeout(handleShotFiredTimeout, 250);
  }

  app.objects.push({
    type: "laser",
    pos: {x:app.hero.pos.x, y:app.hero.pos.y - 60},
    roll: 0,
    angle: 0,
    speed: 500,
    size: 80,
    image: app.laserImage
  });
  playSound("laser");
}

function spawnHero() {
  app.hero = {
    type: "hero",
    pos: {x:app.width/2, y:app.height-100},
    roll: 0,
    angle: 0,
    size: 90,
    image: app.shipImage
  };
  app.objects.push(app.hero);
}

function spawnRock() {
  app.objects.push({
    type: "rock",
    pos: {x:Math.random() * app.width, y:Math.random() * -app.height},
    angle: Math.random() * Math.PI * 2,
    roll: Math.random() * Math.PI * 2 - Math.PI,
    speed: Math.random() * 150 + 100,
    size: 90,
    image: app.rockImage
  });
}

function spawnAllRocks() {
  for (var i=0; i<10; i++) {
    spawnRock();
  }
}

//------------------------------
// Play Sounds
//------------------------------

function playSound(which, volume) {
  var sound = app[which + "Sound"];
  if (sound) {
    sound.pause();
    sound.volume = volume || 1;
    sound.currentTime = 0;
    sound.play();
  }
}

//------------------------------
// Canvas Helpers
//------------------------------

function clearCanvas() {
  var ctx = app.ctx;
  ctx.fillStyle = "#000020";
  ctx.fillRect(0, 0, app.width, app.height);
}

function scaleCanvas() {
  app.width = app.ctx.canvas.width = window.innerWidth;
  app.height = app.ctx.canvas.height = window.innerHeight;
}

//------------------------------
// Event Handlers
//------------------------------

function handleMouseMove(e) {
  if (app.state !== constants.STATE_PLAY) {
    return;
  }

  app.hero.pos.x = e.pageX - app.ctx.canvas.offsetLeft;
  app.hero.pos.y = e.pageY - app.ctx.canvas.offsetTop;
}

function handleWindowResize(e) {
  scaleCanvas();
}

function handleDocumentKeyup(e) {
  // reset flag that game has ended
  if (app.state === constants.STATE_END && app.gameEnded) {
    app.gameEnded = false;
  }
}

function handleDocumentKeypress(e) {
  // don't restart game if it's ended and player is still holding key (likely spacebar)
  if (app.state === constants.STATE_END && !app.gameEnded) {
    startGame();
  } else {
    if (e.keyCode === 32) {
      spawnLaser();
    }
  }
}

function handleShotFiredTimeout() {
  app.shotFired = false;
}

})();
