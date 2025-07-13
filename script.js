// --- Constants ---
const DIFFICULTY_SETTINGS = {
  easy:   { WIN_SCORE: 12, TOTAL_TIME: 40, DROP_INTERVAL: [700, 1100], MUD_CHANCE: 0.15 },
  normal: { WIN_SCORE: 20, TOTAL_TIME: 30, DROP_INTERVAL: [500, 900],  MUD_CHANCE: 0.25 },
  hard:   { WIN_SCORE: 28, TOTAL_TIME: 22, DROP_INTERVAL: [350, 700],  MUD_CHANCE: 0.35 }
};
const DROP_SIZE = [24, 48]; // px
const DROP_SPEED = [3.5, 5]; // s

const WIN_MESSAGES = [
  "Amazing! You brought clean water to a village! 💧",
  "You did it! Every drop counts. 🌍",
  "Victory! Thanks for making a splash for good! 🎉",
  "Clean water unlocked! You're a hero! 🚰"
];
const TRY_AGAIN_MESSAGES = [
  "Almost there! Try again for more impact.",
  "Keep going! Every drop helps.",
  "Don't give up! Clean water is within reach.",
  "So close! Play again to help more."
];

// --- DOM Elements ---
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const scoreEl = document.getElementById('score');
const timeEl = document.getElementById('time');
const gameContainer = document.getElementById('gameContainer');
const messageEl = document.getElementById('message');
const difficultySel = document.getElementById('difficulty');

// Progress bar (optional polish)
let progressBar = null;
if (!document.getElementById('progressBar')) {
  const wrap = document.createElement('div');
  wrap.className = 'progress-bar-wrap';
  progressBar = document.createElement('div');
  progressBar.id = 'progressBar';
  wrap.appendChild(progressBar);
  gameContainer.parentNode.insertBefore(wrap, gameContainer);
} else {
  progressBar = document.getElementById('progressBar');
}

// --- State ---
let difficulty = 'normal';
let WIN_SCORE = DIFFICULTY_SETTINGS[difficulty].WIN_SCORE;
let TOTAL_TIME = DIFFICULTY_SETTINGS[difficulty].TOTAL_TIME;
let DROP_INTERVAL = DIFFICULTY_SETTINGS[difficulty].DROP_INTERVAL;
let MUD_CHANCE = DIFFICULTY_SETTINGS[difficulty].MUD_CHANCE;

let score = 0;
let time = TOTAL_TIME;
let timer = null;
let dropSpawner = null;
let running = false;

// --- Milestone Messages ---
const MILESTONES = [
  { pct: 0.25, msg: "Great start! Keep going! 💪" },
  { pct: 0.5,  msg: "Halfway there! 🚰" },
  { pct: 0.75, msg: "Almost at your goal! 🌟" }
];
let shownMilestones = [];

// --- Helpers ---
function updateScore(val) {
  score = Math.max(0, val);
  scoreEl.textContent = score;
  updateProgress();
  checkMilestones();
}

function updateTime(val) {
  time = val;
  timeEl.textContent = time;
}

function updateProgress() {
  const pct = Math.min(100, (score / WIN_SCORE) * 100);
  progressBar.style.width = pct + '%';
}

function showMessage(msg, win = false) {
  messageEl.textContent = msg;
  messageEl.style.color = win ? 'var(--cw-blue)' : 'var(--cw-brown)';
}

function randomBetween(a, b) {
  return Math.random() * (b - a) + a;
}

function randomInt(a, b) {
  return Math.floor(randomBetween(a, b + 1));
}

function pick(arr) {
  return arr[randomInt(0, arr.length - 1)];
}

function clearDrops() {
  gameContainer.querySelectorAll('.drop').forEach(d => d.remove());
}

function checkMilestones() {
  // Only show each milestone once per game
  MILESTONES.forEach(milestone => {
    const threshold = Math.ceil(WIN_SCORE * milestone.pct);
    if (
      score >= threshold &&
      !shownMilestones.includes(milestone.pct) &&
      score < WIN_SCORE // Don't show milestone if already won
    ) {
      showMessage(milestone.msg, false);
      shownMilestones.push(milestone.pct);
    }
  });
}

// --- Drop Spawning ---
function spawnDrop() {
  const isMud = Math.random() < MUD_CHANCE;
  const size = randomInt(DROP_SIZE[0], DROP_SIZE[1]);
  const speed = randomBetween(DROP_SPEED[0], DROP_SPEED[1]);
  // Clamp left so the drop is always fully inside the container
  const maxLeft = Math.max(0, gameContainer.clientWidth - size);
  const left = randomBetween(0, maxLeft);

  const drop = document.createElement('div');
  drop.className = 'drop ' + (isMud ? 'mud' : 'water');
  drop.style.width = drop.style.height = size + 'px';
  drop.style.left = left + 'px';
  drop.style.animationDuration = speed + 's';

  drop.addEventListener('animationend', () => drop.remove());
  drop.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!running) return;
    drop.remove();
    if (isMud) {
      updateScore(score - 2);
      dropFlash(drop, false);
    } else {
      updateScore(score + 1);
      dropFlash(drop, true);
    }
  });

  gameContainer.appendChild(drop);
}

function dropFlash(drop, good) {
  drop.style.boxShadow = good
    ? '0 0 16px 6px #00e6ff88'
    : '0 0 16px 6px #8b5e3c88';
  setTimeout(() => { drop.style.boxShadow = ''; }, 180);
}

function startSpawning() {
  function loop() {
    if (!running) return;
    spawnDrop();
    dropSpawner = setTimeout(loop, randomBetween(DROP_INTERVAL[0], DROP_INTERVAL[1]));
  }
  loop();
}

function stopSpawning() {
  clearTimeout(dropSpawner);
}

// --- Game Flow ---
function startGame() {
  running = true;
  updateScore(0);
  updateTime(TOTAL_TIME);
  showMessage('');
  clearDrops();
  updateProgress();
  startBtn.disabled = true;
  resetBtn.disabled = false;
  difficultySel.disabled = true;
  shownMilestones = []; // Reset milestones for new game
  startSpawning();

  // Play background audio
  bgAudio.currentTime = 0;
  bgAudio.play();

  timer = setInterval(() => {
    updateTime(time - 1);
    if (time <= 1) {
      endGame();
    }
  }, 1000);
}

function endGame() {
  running = false;
  clearInterval(timer);
  stopSpawning();
  setTimeout(clearDrops, 800);
  startBtn.disabled = false;
  resetBtn.disabled = false;
  difficultySel.disabled = false;

  // Pause background audio
  bgAudio.pause();
  bgAudio.currentTime = 0;

  if (score >= WIN_SCORE) {
    showMessage(pick(WIN_MESSAGES), true);
    if (window.confetti) confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
  } else {
    showMessage(pick(TRY_AGAIN_MESSAGES), false);
  }
}

function resetGame() {
  running = false;
  clearInterval(timer);
  stopSpawning();
  updateScore(0);
  updateTime(TOTAL_TIME);
  showMessage('');
  clearDrops();
  updateProgress();
  startBtn.disabled = false;
  resetBtn.disabled = true;
  difficultySel.disabled = false;
  shownMilestones = []; // Reset milestones on reset

  // Pause background audio
  bgAudio.pause();
  bgAudio.currentTime = 0;
}

// --- Background Audio ---
const bgAudio = new Audio('img/game-intro-345507.mp3');
bgAudio.loop = true;
bgAudio.volume = 0.5; // Adjust volume as needed

// --- Water Icon Click Sound ---
const waterLogo = document.getElementById('waterLogo');
const waterClickAudio = new Audio('img/water-click.mp3');
waterClickAudio.volume = 0.7; // Adjust as needed

if (waterLogo) {
  waterLogo.addEventListener('click', () => {
    // Restart sound if clicked rapidly
    waterClickAudio.currentTime = 0;
    waterClickAudio.play();
  });
}

// --- Event Listeners ---
difficultySel.addEventListener('change', (e) => {
  difficulty = e.target.value;
  WIN_SCORE = DIFFICULTY_SETTINGS[difficulty].WIN_SCORE;
  TOTAL_TIME = DIFFICULTY_SETTINGS[difficulty].TOTAL_TIME;
  DROP_INTERVAL = DIFFICULTY_SETTINGS[difficulty].DROP_INTERVAL;
  MUD_CHANCE = DIFFICULTY_SETTINGS[difficulty].MUD_CHANCE;
  resetGame();
});

startBtn.addEventListener('click', () => {
  if (!running) startGame();
});

resetBtn.addEventListener('click', resetGame);

// --- Initial State ---
resetGame();
