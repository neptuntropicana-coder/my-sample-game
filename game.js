(() => {
  "use strict";

  // ---- Configuration -------------------------------------------------------
  const TILE = 15;
  const VIEW_W = 480;
  const VIEW_H = 270;

  const GRAVITY = 900;      // px/s^2
  const MAX_FALL = 520;     // px/s
  const RUN_SPEED = 120;    // px/s
  const ACCEL = 800;        // px/s^2
  const FRICTION = 900;     // px/s^2
  const JUMP_VEL = -300;    // px/s
  const JUMP_CUT = -110;    // release-space clamp, px/s

  const SOLID_CHARS = new Set(["#", "=", "P"]);

  // ---- Canvas --------------------------------------------------------------
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  const W = LEVEL[0].length;
  const H = LEVEL.length;
  const LEVEL_W = W * TILE;
  const LEVEL_H = H * TILE;

  for (let i = 0; i < H; i++) {
    if (LEVEL[i].length !== W) {
      throw new Error(
        "Level row " + i + " has " + LEVEL[i].length + " tiles, expected " + W
      );
    }
  }

  // ---- World queries -------------------------------------------------------
  function charAt(tx, ty) {
    if (ty < 0 || ty >= H) return ".";
    if (tx < 0 || tx >= W) return "#";   // treat the sides as walls
    return LEVEL[ty][tx];
  }

  function isSolid(tx, ty) {
    return SOLID_CHARS.has(charAt(tx, ty));
  }

  function tileRange(x, y, w, h) {
    return {
      x0: Math.floor(x / TILE),
      x1: Math.floor((x + w - 1) / TILE),
      y0: Math.floor(y / TILE),
      y1: Math.floor((y + h - 1) / TILE),
    };
  }

  // ---- Player --------------------------------------------------------------
  const player = { x: 0, y: 0, w: 10, h: 14, vx: 0, vy: 0, onGround: false, face: 1 };
  let camX = 0;
  let won = false;

  function respawn() {
    player.x = 2 * TILE;
    player.y = 13 * TILE;
    player.vx = 0;
    player.vy = 0;
    player.onGround = false;
    player.face = 1;
    camX = 0;
    won = false;
  }
  respawn();

  // ---- Movement ------------------------------------------------------------
  function moveX(dx) {
    player.x += dx;
    const r = tileRange(player.x, player.y, player.w, player.h);
    for (let ty = r.y0; ty <= r.y1; ty++) {
      for (let tx = r.x0; tx <= r.x1; tx++) {
        if (!isSolid(tx, ty)) continue;
        if (dx > 0) player.x = tx * TILE - player.w;
        else if (dx < 0) player.x = (tx + 1) * TILE;
        player.vx = 0;
        return;
      }
    }
  }

  function moveY(dy) {
    player.y += dy;
    const r = tileRange(player.x, player.y, player.w, player.h);
    for (let ty = r.y0; ty <= r.y1; ty++) {
      for (let tx = r.x0; tx <= r.x1; tx++) {
        if (!isSolid(tx, ty)) continue;
        if (dy > 0) {
          player.y = ty * TILE - player.h;
          player.vy = 0;
          player.onGround = true;
        } else if (dy < 0) {
          player.y = (ty + 1) * TILE;
          player.vy = 0;
        }
        return;
      }
    }
  }

  // ---- Update --------------------------------------------------------------
  function update(dt) {
    if (won) return;

    const left = keys.has("ArrowLeft") || keys.has("KeyA");
    const right = keys.has("ArrowRight") || keys.has("KeyD");
    const dir = (right ? 1 : 0) - (left ? 1 : 0);

    if (dir !== 0) {
      player.vx += dir * ACCEL * dt;
      player.vx = Math.max(-RUN_SPEED, Math.min(RUN_SPEED, player.vx));
      player.face = dir;
    } else {
      const f = FRICTION * dt;
      if (Math.abs(player.vx) <= f) player.vx = 0;
      else player.vx -= Math.sign(player.vx) * f;
    }

    player.vy += GRAVITY * dt;
    if (player.vy > MAX_FALL) player.vy = MAX_FALL;

    player.onGround = false;
    moveX(player.vx * dt);
    moveY(player.vy * dt);

    // Variable jump height: releasing space early cuts the rise short.
    if (!keys.has("Space") && player.vy < JUMP_CUT) player.vy = JUMP_CUT;

    const r = tileRange(player.x, player.y, player.w, player.h);
    for (let ty = r.y0; ty <= r.y1; ty++) {
      for (let tx = r.x0; tx <= r.x1; tx++) {
        if (charAt(tx, ty) === "G") won = true;
      }
    }

    if (player.y > LEVEL_H + 40) respawn();

    const target = player.x + player.w / 2 - VIEW_W / 2;
    camX = Math.max(0, Math.min(LEVEL_W - VIEW_W, target));
  }

  // ---- Rendering -----------------------------------------------------------
  function drawCloud(x, y) {
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.arc(x + 12, y - 4, 12, 0, Math.PI * 2);
    ctx.arc(x + 26, y, 10, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawParallax() {
    ctx.fillStyle = "#3aa03a";
    const hillOff = -((camX * 0.35) % 240);
    for (let i = -1; i < 3; i++) {
      const bx = hillOff + i * 240;
      ctx.beginPath();
      ctx.moveTo(bx, VIEW_H - 45);
      ctx.quadraticCurveTo(bx + 60, VIEW_H - 110, bx + 120, VIEW_H - 45);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(bx + 120, VIEW_H - 45);
      ctx.quadraticCurveTo(bx + 165, VIEW_H - 95, bx + 210, VIEW_H - 45);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = "#ffffff";
    const cloudOff = -((camX * 0.15) % 320);
    for (let i = -1; i < 3; i++) {
      const bx = cloudOff + i * 320;
      drawCloud(bx + 40, 40);
      drawCloud(bx + 190, 72);
    }
  }

  function drawGround(px, py, tx, ty) {
    ctx.fillStyle = "#c84c0c";
    ctx.fillRect(px, py, TILE, TILE);
    if (!isSolid(tx, ty - 1)) {
      ctx.fillStyle = "#e09040";
      ctx.fillRect(px, py, TILE, 4);
    }
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.fillRect(px, py + TILE - 3, TILE, 3);
  }

  function drawBrick(px, py) {
    ctx.fillStyle = "#b53120";
    ctx.fillRect(px, py, TILE, TILE);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(px, py + 7, TILE, 1);
    ctx.fillRect(px + 7, py, 1, 7);
    ctx.fillRect(px + 3, py + 8, 1, 7);
    ctx.fillRect(px + 11, py + 8, 1, 7);
  }

  function drawPipe(px, py, tx, ty) {
    const isTop = charAt(tx, ty - 1) !== "P";
    ctx.fillStyle = "#00a800";
    ctx.fillRect(px, py, TILE, TILE);
    ctx.fillStyle = "#40d040";
    ctx.fillRect(px + 2, py, 3, TILE);
    ctx.fillStyle = "#006000";
    ctx.fillRect(px + TILE - 3, py, 3, TILE);
    if (isTop) {
      ctx.fillStyle = "#00a800";
      ctx.fillRect(px - 1, py, TILE + 2, 5);
      ctx.fillStyle = "#40d040";
      ctx.fillRect(px + 1, py + 1, 3, 4);
    }
  }

  function drawGoal(px, py, tx, ty) {
    const isTop = charAt(tx, ty - 1) !== "G";
    ctx.fillStyle = "#e8e8e8";
    ctx.fillRect(px + 7, py, 2, TILE);
    if (isTop) {
      ctx.fillStyle = "#f8d030";
      ctx.beginPath();
      ctx.moveTo(px + 9, py + 1);
      ctx.lineTo(px + 20, py + 5);
      ctx.lineTo(px + 9, py + 9);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawTiles() {
    const x0 = Math.floor(camX / TILE);
    const x1 = Math.min(W - 1, Math.floor((camX + VIEW_W) / TILE));

    for (let ty = 0; ty < H; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const c = LEVEL[ty][tx];
        if (c === ".") continue;

        const px = tx * TILE - camX;
        const py = ty * TILE;

        if (c === "#") drawGround(px, py, tx, ty);
        else if (c === "=") drawBrick(px, py);
        else if (c === "P") drawPipe(px, py, tx, ty);
        else if (c === "G") drawGoal(px, py, tx, ty);
      }
    }
  }

  function drawPlayer() {
    const x = Math.round(player.x - camX);
    const y = Math.round(player.y);

    ctx.fillStyle = "#e52521";               // cap
    ctx.fillRect(x, y, player.w, 4);

    ctx.fillStyle = "#f8b878";               // face
    ctx.fillRect(x + 1, y + 4, player.w - 2, 5);

    ctx.fillStyle = "#1a1a1a";               // eye
    ctx.fillRect(x + (player.face > 0 ? player.w - 4 : 3), y + 5, 1, 2);

    ctx.fillStyle = "#1a4fd6";               // overalls
    ctx.fillRect(x + 1, y + 9, player.w - 2, 5);
  }

  function drawWin() {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.font = "bold 20px monospace";
    ctx.fillText("YOU WIN!", VIEW_W / 2, VIEW_H / 2 - 6);
    ctx.font = "10px monospace";
    ctx.fillText("Press R to play again", VIEW_W / 2, VIEW_H / 2 + 14);
    ctx.textAlign = "left";
  }

  function render() {
    ctx.fillStyle = "#5c94fc";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    drawParallax();
    drawTiles();
    drawPlayer();
    if (won) drawWin();
  }

  // ---- Input ---------------------------------------------------------------
  const keys = new Set();
  const BLOCKED = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"]);

  window.addEventListener("keydown", (e) => {
    if (BLOCKED.has(e.code)) e.preventDefault();

    if (e.code === "KeyR") {
      respawn();
      return;
    }

    keys.add(e.code);

    if (e.code === "Space" && player.onGround && !won) {
      player.vy = JUMP_VEL;
      player.onGround = false;
    }
  });

  window.addEventListener("keyup", (e) => keys.delete(e.code));
  window.addEventListener("blur", () => keys.clear());

  // ---- Scaling -------------------------------------------------------------
  function fit() {
    const s = Math.max(
      1,
      Math.floor(Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H))
    );
    canvas.style.width = VIEW_W * s + "px";
    canvas.style.height = VIEW_H * s + "px";
  }
  window.addEventListener("resize", fit);
  fit();

  // ---- Loop ----------------------------------------------------------------
  let last = performance.now();

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
