(() => {
  "use strict";

  // ---- Configuration -------------------------------------------------------
  // The world is drawn on a native 1920x1080 canvas with 60 px tiles: exactly
  // 32x18 tiles in view, the same framing the game had at 480x270, but with
  // four times the detail instead of 4x4 upscaled blocks. Physics constants
  // scale with the tile size so the feel is unchanged.
  const TILE = 60;
  const VIEW_W = 1920;
  const VIEW_H = 1080;

  const GRAVITY = 3600;     // px/s^2
  const MAX_FALL = 2080;    // px/s
  const RUN_SPEED = 480;    // px/s
  const ACCEL = 3200;       // px/s^2
  const FRICTION = 3600;    // px/s^2
  const JUMP_VEL = -1320;   // px/s   (~242 px rise: clears a 3-tile pipe)
  const JUMP_CUT = -440;    // release-space clamp, px/s

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
  const player = { x: 0, y: 0, w: 40, h: 56, vx: 0, vy: 0, onGround: false, face: 1 };
  let camX = 0;
  let won = false;
  let jumpBuffer = 0;   // seconds a pending jump request stays alive

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
  // True when a solid tile sits directly under the player's feet. Probing is
  // reliable every frame; setting a flag only on the frame a falling player
  // sinks into the floor made jump presses register roughly one frame in three.
  function grounded() {
    const ty = Math.floor((player.y + player.h) / TILE);
    const tx0 = Math.floor(player.x / TILE);
    const tx1 = Math.floor((player.x + player.w - 1) / TILE);
    for (let tx = tx0; tx <= tx1; tx++) {
      if (isSolid(tx, ty)) return true;
    }
    return false;
  }

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

    moveX(player.vx * dt);
    moveY(player.vy * dt);
    player.onGround = grounded();

    // A jump request stays queued briefly, so pressing just before touching
    // down still jumps instead of being silently dropped.
    if (jumpBuffer > 0) {
      jumpBuffer -= dt;
      if (player.onGround) {
        player.vy = JUMP_VEL;
        player.onGround = false;
        jumpBuffer = 0;
      }
    }

    // Variable jump height: releasing space early cuts the rise short.
    if (!keys.has("Space") && player.vy < JUMP_CUT) player.vy = JUMP_CUT;

    const r = tileRange(player.x, player.y, player.w, player.h);
    for (let ty = r.y0; ty <= r.y1; ty++) {
      for (let tx = r.x0; tx <= r.x1; tx++) {
        if (charAt(tx, ty) === "G") won = true;
      }
    }

    if (player.y > LEVEL_H + 160) respawn();

    const target = player.x + player.w / 2 - VIEW_W / 2;
    camX = Math.max(0, Math.min(LEVEL_W - VIEW_W, target));
  }

  // ---- Rendering -----------------------------------------------------------
  // Everything is drawn in world pixels on the 1920x1080 canvas, so shapes get
  // four times the detail rather than being upscaled blocks.
  function drawCloud(x, y) {
    ctx.beginPath();
    ctx.arc(x, y, 40, 0, Math.PI * 2);
    ctx.arc(x + 48, y - 16, 48, 0, Math.PI * 2);
    ctx.arc(x + 104, y, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x, y, 104, 40);   // flat base between the lobes
  }

  function drawParallax() {
    // Hills drift at 35% of the camera speed, in 480 px blocks.
    ctx.fillStyle = "#3aa03a";
    const HILL_W = 480;
    const hillOff = -((camX * 0.35) % HILL_W);
    for (let i = -1; i <= Math.ceil(VIEW_W / HILL_W) + 1; i++) {
      const bx = hillOff + i * HILL_W;
      ctx.beginPath();
      ctx.moveTo(bx, VIEW_H - 180);
      ctx.quadraticCurveTo(bx + 120, VIEW_H - 440, bx + 240, VIEW_H - 180);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(bx + 240, VIEW_H - 180);
      ctx.quadraticCurveTo(bx + 330, VIEW_H - 380, bx + 420, VIEW_H - 180);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = "#ffffff";
    const CLOUD_W = 1280;
    const cloudOff = -((camX * 0.15) % CLOUD_W);
    for (let i = -1; i <= Math.ceil(VIEW_W / CLOUD_W) + 1; i++) {
      const bx = cloudOff + i * CLOUD_W;
      drawCloud(bx + 160, 160);
      drawCloud(bx + 760, 288);
    }
  }

  function drawGround(px, py, tx, ty) {
    ctx.fillStyle = "#c84c0c";
    ctx.fillRect(px, py, TILE, TILE);

    // Deterministic speckles, so a tile looks the same every frame.
    let seed = (tx * 73856093) ^ (ty * 19349663);
    ctx.fillStyle = "rgba(0,0,0,0.10)";
    for (let i = 0; i < 5; i++) {
      seed = (seed * 1664525 + 1013904223) | 0;
      const sx = px + 6 + ((seed >>> 8) % 44);
      seed = (seed * 1664525 + 1013904223) | 0;
      const sy = py + 26 + ((seed >>> 8) % 26);
      ctx.fillRect(sx, sy, 10, 8);
    }

    if (!isSolid(tx, ty - 1)) {
      ctx.fillStyle = "#e09040";
      ctx.fillRect(px, py, TILE, 16);
      ctx.fillStyle = "#c87a30";
      ctx.fillRect(px, py + 16, TILE, 5);
      ctx.fillStyle = "#f0b060";
      for (let i = 0; i < 3; i++) ctx.fillRect(px + 8 + i * 18, py, 9, 6);
    }
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.fillRect(px, py + TILE - 12, TILE, 12);
  }

  function drawBrick(px, py) {
    ctx.fillStyle = "#b53120";
    ctx.fillRect(px, py, TILE, TILE);

    // Two courses with mortar joints.
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(px, py + 28, TILE, 3);
    ctx.fillRect(px + 28, py, 3, 28);
    ctx.fillRect(px + 12, py + 31, 3, 29);
    ctx.fillRect(px + 44, py + 31, 3, 29);

    ctx.fillStyle = "rgba(255,255,255,0.10)";
    ctx.fillRect(px, py, TILE, 4);
  }

  function drawPipe(px, py, tx, ty) {
    const isTop = charAt(tx, ty - 1) !== "P";
    ctx.fillStyle = "#00a800";
    ctx.fillRect(px, py, TILE, TILE);

    ctx.fillStyle = "#40d040";                 // left highlight
    ctx.fillRect(px + 6, py, 10, TILE);
    ctx.fillStyle = "#006000";                 // right shadow
    ctx.fillRect(px + TILE - 12, py, 12, TILE);

    if (isTop) {
      ctx.fillStyle = "#00a800";
      ctx.fillRect(px - 6, py, TILE + 12, 24);   // lip, wider than the shaft
      ctx.fillStyle = "#40d040";
      ctx.fillRect(px - 2, py + 4, 10, 16);
      ctx.fillStyle = "#006000";
      ctx.fillRect(px + TILE - 8, py + 4, 12, 16);
    }
  }

  function drawGoal(px, py, tx, ty) {
    const isTop = charAt(tx, ty - 1) !== "G";
    ctx.fillStyle = "#e8e8e8";
    ctx.fillRect(px + 28, py, 8, TILE);
    if (isTop) {
      ctx.fillRect(px + 24, py - 4, 16, 8);      // pole cap
      ctx.fillStyle = "#f8d030";
      ctx.beginPath();
      ctx.moveTo(px + 36, py + 4);
      ctx.lineTo(px + 84, py + 20);
      ctx.lineTo(px + 36, py + 36);
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
    const w = player.w;
    const f = player.face > 0 ? 1 : -1;

    ctx.fillStyle = "#4a2c14";                          // shoes
    ctx.fillRect(x + 2, y + 48, w - 4, 8);

    ctx.fillStyle = "#1a4fd6";                          // overalls
    ctx.fillRect(x + 4, y + 30, w - 8, 20);

    ctx.fillStyle = "#e52521";                          // shirt
    ctx.fillRect(x + 4, y + 22, w - 8, 10);

    ctx.fillStyle = "#f8b878";                          // arms
    ctx.fillRect(f > 0 ? x + w - 8 : x, y + 24, 8, 12);

    ctx.fillStyle = "#f8b878";                          // head
    ctx.fillRect(x + 6, y + 10, w - 12, 14);

    ctx.fillStyle = "#e52521";                          // cap + brim
    ctx.fillRect(x + 4, y, w - 8, 10);
    ctx.fillRect(f > 0 ? x + w - 12 : x, y + 8, 16, 4);

    ctx.fillStyle = "#1a1a1a";                          // eye
    ctx.fillRect(f > 0 ? x + w - 16 : x + 10, y + 14, 4, 6);

    ctx.fillStyle = "#1a4fd6";                          // straps
    ctx.fillRect(x + 10, y + 22, 4, 10);
    ctx.fillRect(x + w - 14, y + 22, 4, 10);

    ctx.fillStyle = "#f8d030";                          // buttons
    ctx.fillRect(x + 9, y + 30, 6, 4);
    ctx.fillRect(x + w - 15, y + 30, 6, 4);
  }

  function drawWin() {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.font = "bold 80px monospace";
    ctx.fillText("YOU WIN!", VIEW_W / 2, VIEW_H / 2 - 24);
    ctx.font = "40px monospace";
    ctx.fillText("Press R to play again", VIEW_W / 2, VIEW_H / 2 + 56);
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

    // Auto-repeat while a key is held must not queue extra jumps.
    if (e.repeat) return;

    if (e.code === "KeyR") {
      respawn();
      return;
    }

    keys.add(e.code);

    if (e.code === "Space") jumpBuffer = 0.12;
  });

  window.addEventListener("keyup", (e) => keys.delete(e.code));
  window.addEventListener("blur", () => keys.clear());

  // ---- Scaling -------------------------------------------------------------
  // Integer scale when there is room (crisp), fractional only when the window
  // is smaller than 1920x1080.
  function fit() {
    const raw = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
    const s = raw >= 1 ? Math.floor(raw) : raw;
    canvas.style.width = Math.round(VIEW_W * s) + "px";
    canvas.style.height = Math.round(VIEW_H * s) + "px";
    canvas.style.imageRendering = s < 1 ? "auto" : "pixelated";
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
