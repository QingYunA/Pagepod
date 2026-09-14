import type { ProjectSeoProfile } from "../types";

export const GAMES_SEO: Record<string, ProjectSeoProfile> = {
  // 1. 2048 Classic
  "2048-classic": {
    slug: "2048-classic",
    targetKeyword: "2048 game online",
    secondaryKeywords: ["2048 unblocked", "classic sliding tile game", "2048 puzzle web", "gabriele cirulli 2048"],
    headline: "2048 - Classic Number Tile Puzzle Online",
    summary: "Play the authentic 2048 sliding tile puzzle game directly in your browser. Join matching numbers with arrow keys to reach the 2048 tile with zero ads and instant responsiveness.",
    category: "games",
    language: "en",
    useCases: [
      {
        title: "Fast Numerical Reasoning",
        description: "Sharpen mental math, spatial awareness, and forward planning in quick 5-minute sessions.",
      },
      {
        title: "Zero-Install Play",
        description: "Runs 100% client-side with minimal memory usage, unblocked across all modern desktop and mobile browsers.",
      },
      {
        title: "Clean Offline Security",
        description: "Cached locally in your browser sandbox without invasive trackers, third-party analytics, or pop-up ads.",
      },
    ],
    shortcuts: [
      { key: "Arrow Keys / WASD", action: "Slide tiles in four directions" },
      { key: "R", action: "Restart game board" },
      { key: "Swipe (Touch)", action: "Mobile screen navigation" },
    ],
    faqs: [
      {
        question: "How do you win 2048?",
        answer: "Combine tiles of identical numbers by sliding them into each other (2+2=4, 4+4=8...) until you merge two 1024 tiles to produce the 2048 tile. You can continue playing after 2048 to set personal high scores.",
      },
      {
        question: "Is this the authentic version of 2048?",
        answer: "Yes. This is the original open-source recreation based on Gabriele Cirulli's iconic 2014 MIT-licensed codebase, running in a clean, sandboxed container.",
      },
      {
        question: "Does it track my personal data?",
        answer: "No. The game executes entirely in your local browser sandbox. High scores and board states stay in your browser session without transmitting data to any remote server.",
      },
      {
        question: "Can I embed this on my own website?",
        answer: "Yes. Click the Embed button above to copy the sandboxed iframe snippet and integrate this game into any webpage or blog.",
      },
    ],
    author: { name: "Gabriele Cirulli", url: "https://github.com/gabrielecirulli/2048" },
    license: "MIT",
    upstreamUrl: "https://github.com/gabrielecirulli/2048",
  },

  // 2. Windows 95 Minesweeper
  "windows-95-minesweeper": {
    slug: "windows-95-minesweeper",
    targetKeyword: "windows 95 minesweeper online",
    secondaryKeywords: ["classic minesweeper web", "win95 minesweeper unblocked", "retro minesweeper browser"],
    headline: "Windows 95 Minesweeper Authentique Online",
    summary: "Authentic pixel-perfect recreation of Microsoft Windows 95 Minesweeper. Experience classic skeuomorphic 3D beveled borders, LED counters, and iconic smiley face button.",
    category: "games",
    language: "en",
    useCases: [
      {
        title: "Nostalgic Retro Gaming",
        description: "Relive the authentic 1995 desktop experience with original 3D beveled frames, digital font counters, and tactile sound effects.",
      },
      {
        title: "Logic & Deduction Training",
        description: "Exercise probabilistic logic, pattern recognition, and careful deduction to clear minefields without guessing.",
      },
      {
        title: "Instant Web Deployment",
        description: "Zero download or Windows emulation required. Runs directly in any modern web browser via lightweight canvas rendering.",
      },
    ],
    shortcuts: [
      { key: "Left Click", action: "Reveal uncovered square" },
      { key: "Right Click", action: "Toggle mine flag marker" },
      { key: "Smiley Face Button", action: "Reset board and start a new game" },
    ],
    faqs: [
      {
        question: "How do I play classic Minesweeper?",
        answer: "Click squares to uncover them. Numbers reveal how many mines touch that specific square. Use numbers as clues to mark suspected mines with right-click flags until all safe squares are cleared.",
      },
      {
        question: "Is this identical to the original Windows 95 game?",
        answer: "Yes. It faithfully replicates the board geometry, skeuomorphic teal window chrome, seven-segment LED counters, and the yellow smiley face reactions from Windows 95.",
      },
      {
        question: "Can I play on mobile devices?",
        answer: "Yes. Long-press on mobile touches simulates a right-click flag action, while tapping uncovers squares.",
      },
    ],
    author: { name: "Retro Computing Community", url: "https://github.com/1j01/minesweeper" },
    license: "MIT",
    upstreamUrl: "https://github.com/1j01/minesweeper",
  },

  // 3. Hextris Arcade
  "hextris-arcade": {
    slug: "hextris-arcade",
    targetKeyword: "hextris online",
    secondaryKeywords: ["hexagonal tetris puzzle", "hextris arcade unblocked", "fast color match puzzle"],
    headline: "Hextris - Fast-Paced Hexagonal Arcade Puzzle",
    summary: "Rotate the central hexagon to match incoming colored blocks before they stack beyond the gray boundary. Inspired by Tetris with 360-degree rotational physics.",
    category: "games",
    language: "en",
    useCases: [
      {
        title: "Reflex & Rhythm Training",
        description: "Test quick decision-making and hand-eye coordination against accelerating block drop intervals.",
      },
      {
        title: "Combo Chain Mastery",
        description: "Align 3 or more blocks of the same color to trigger cascade clears and maximize multiplier scores.",
      },
      {
        title: "Clean Canvas Performance",
        description: "High frame rate 60 FPS HTML5 canvas rendering with fluid animations and responsive mobile controls.",
      },
    ],
    shortcuts: [
      { key: "Left / Right Arrow", action: "Rotate hexagon counter-clockwise / clockwise" },
      { key: "A / D", action: "Alternative rotation keys" },
      { key: "Down Arrow", action: "Speed up block descent" },
    ],
    faqs: [
      {
        question: "What is Hextris?",
        answer: "Hextris is an open-source fast-paced puzzle game combining the block-matching mechanics of Tetris with a 6-sided rotating hexagonal grid.",
      },
      {
        question: "How do you score combos?",
        answer: "Stacking 3 or more consecutive blocks of the same color clears them. Clearing multiple layers in a single rotation triggers combo multipliers for exponential score gains.",
      },
      {
        question: "Does it work with touch screens?",
        answer: "Yes. Tapping the left or right halves of your mobile screen rotates the central hexagon accordingly.",
      },
    ],
    author: { name: "Garrett Finucane & Logan Engstrom", url: "https://github.com/Hextris/hextris" },
    license: "MIT",
    upstreamUrl: "https://github.com/Hextris/hextris",
  },

  // 4. Neon 2048
  "neon-2048": {
    slug: "neon-2048",
    targetKeyword: "neon 2048 cyberpunk",
    secondaryKeywords: ["synthwave 2048 puzzle", "cyberpunk number game", "neon sliding tile game"],
    headline: "Neon 2048 - Cyberpunk Edition",
    summary: "Cyberpunk synthwave variant of the classic 2048 puzzle game. Features dark fluorescent neon tiles, glowing grid borders, and retro electronic sound effects.",
    category: "games",
    language: "en",
    useCases: [
      {
        title: "Dark-Mode Retro Gaming",
        description: "Enjoy late-night 2048 gaming without harsh light, featuring high-contrast neon glows and futuristic typography.",
      },
      {
        title: "Audio-Visual Feedback",
        description: "Tile combinations trigger satisfying synthesized laser beeps and subtle pulse animations.",
      },
      {
        title: "Unblocked Instant Play",
        description: "Runs without dependencies directly inside an isolated browser sandbox with zero ad interruptions.",
      },
    ],
    shortcuts: [
      { key: "Arrow Keys / WASD", action: "Slide glowing tiles" },
      { key: "R", action: "Reset puzzle grid" },
    ],
    faqs: [
      {
        question: "How is this different from classic 2048?",
        answer: "It features a custom synthwave visual aesthetic, dark-mode color scheme, neon glow effects, and optional sound synthesizer feedback.",
      },
      {
        question: "Can I play with a keyboard or touch screen?",
        answer: "Both are supported. Use arrow keys on a keyboard or swipe gestures on a phone or tablet.",
      },
    ],
    author: { name: "Synthwave Gaming Collective", url: "https://github.com/topics/2048-game" },
    license: "MIT",
    upstreamUrl: "https://github.com/topics/2048-game",
  },

  // 5. Reaction Time Test
  "reaction-time-test": {
    slug: "reaction-time-test",
    targetKeyword: "reaction time test online",
    secondaryKeywords: ["human benchmark reaction time", "click speed test", "reflex test browser"],
    headline: "Human Benchmark Reaction Time Test",
    summary: "Benchmark your cognitive reflex and response speed in milliseconds. Click when the screen turns green to accurately measure your neural reaction time.",
    category: "games",
    language: "en",
    useCases: [
      {
        title: "Gamer Reflex Calibration",
        description: "Measure your baseline latency in milliseconds to evaluate reaction readiness before competitive gaming sessions.",
      },
      {
        title: "Cognitive Alertness Check",
        description: "Track morning vs. evening response time to identify optimal peak focus windows during deep work.",
      },
      {
        title: "Hardware Latency Testing",
        description: "Compare input response latency across different wireless mice, monitors, and browser environments.",
      },
    ],
    shortcuts: [
      { key: "Click / Tap", action: "Start trial or react to green signal" },
    ],
    faqs: [
      {
        question: "What is an average human reaction time?",
        answer: "The average human visual reaction time is between 200ms and 250ms. Competitive gamers and athletes often achieve 150ms to 190ms.",
      },
      {
        question: "Does hardware affect my reaction score?",
        answer: "Yes. Monitor refresh rates (60Hz vs 144Hz+) and input polling rates can introduce 10ms to 30ms of display and input latency.",
      },
      {
        question: "How many attempts are measured?",
        answer: "You can repeat as many trials as you wish. For highest accuracy, average your scores across 5 consecutive attempts.",
      },
    ],
    author: { name: "Human Benchmark Community", url: "https://github.com/topics/reaction-time" },
    license: "MIT",
    upstreamUrl: "https://github.com/topics/reaction-time",
  },

  // 6. Zen Gomoku AI (Chinese)
  "zen-gomoku-ai": {
    slug: "zen-gomoku-ai",
    targetKeyword: "在线五子棋",
    secondaryKeywords: ["五子棋在线玩", "五子棋人机对战", "网页版五子棋", "五子棋双人对弈"],
    headline: "在线五子棋 - 支持人机对战与双人对弈",
    summary: "轻量免安装的在线五子棋。支持人机对战与本地双人对战，内置 Minimax 启发式算法 AI，提供清新落子音效与悔棋复盘功能，纯前端离线运行。",
    category: "games",
    language: "zh",
    useCases: [
      {
        title: "随时随地来一局",
        description: "打开网页即可开始，零加载等待，支持随时悔棋与重新开局。",
      },
      {
        title: "人机对战练习棋力",
        description: "挑战内置的电脑 AI 算法，演练连五、活四、双三等经典攻防策略。",
      },
      {
        title: "好友本地同屏对战",
        description: "一键切换双人对战模式，在同一台电脑或平板上轮流落子下棋。",
      },
    ],
    shortcuts: [
      { key: "鼠标点击", action: "在棋盘交叉点落子" },
      { key: "悔棋按钮", action: "撤销上一步落子" },
    ],
    faqs: [
      {
        question: "五子棋的胜负规则是什么？",
        answer: "黑子先手，白子后手。率先在横、竖、斜任意方向将同色五枚棋子连成一线的玩家获胜。",
      },
      {
        question: "AI 会偷看我的落子吗？",
        answer: "不会。AI 逻辑完全在浏览器本地 JavaScript 运行，纯基于棋局算法评估落子位置，不连接任何外部网络。",
      },
    ],
    author: { name: "Pagepod Cultural Lab", url: "https://github.com/topics/gomoku" },
    license: "MIT",
    upstreamUrl: "https://github.com/topics/gomoku",
  },

  // 7. Synthwave Snake Arcade
  "synthwave-snake-arcade": {
    slug: "synthwave-snake-arcade",
    targetKeyword: "synthwave snake arcade",
    secondaryKeywords: ["retro snake game online", "cyberpunk neon snake", "arcade snake unblocked"],
    headline: "Synthwave Neon Arcade Snake",
    summary: "80s synthwave aesthetic retro arcade snake game. Features neon glowing trails, perspective grid horizon, particle bursts, and synthesized electronic audio.",
    category: "games",
    language: "en",
    useCases: [
      {
        title: "Fast-Paced Arcade Break",
        description: "Revisit the iconic Nokia snake mechanics reimagined with fluid 60 FPS neon aesthetics and combo score multipliers.",
      },
      {
        title: "Synthwave Sensory Immersion",
        description: "Vibrant retro-futuristic horizon, scanline overlays, and responsive Web Audio synthesizer sound effects.",
      },
      {
        title: "Zero Distraction Casual Play",
        description: "Starts instantly in any web tab without sign-ins, paywalls, or banner advertisements.",
      },
    ],
    shortcuts: [
      { key: "Arrow Keys / WASD", action: "Change snake direction" },
      { key: "P", action: "Pause game" },
    ],
    faqs: [
      {
        question: "How do you control the neon snake?",
        answer: "Use the arrow keys or W/A/S/D to steer. On mobile devices, swipe in the direction you want the snake to turn.",
      },
      {
        question: "Can the snake pass through screen borders?",
        answer: "In arcade mode, colliding with the outer glowing boundary will trigger a game over. Navigate carefully as speed increases!",
      },
    ],
    author: { name: "Retro Arcade Initiative", url: "https://github.com/topics/snake-game" },
    license: "MIT",
    upstreamUrl: "https://github.com/topics/snake-game",
  },

  // 8. Sudoku Classic
  "sudoku-classic": {
    slug: "sudoku-classic",
    targetKeyword: "sudoku online free",
    secondaryKeywords: ["classic sudoku puzzle", "sudoku solver web", "daily sudoku unblocked"],
    headline: "Sudoku - Classic Logic Puzzle Online",
    summary: "Play authentic 9x9 Sudoku puzzles online directly in your browser. Features clean high-contrast board design, mistake detection, number keypad, and completion timer.",
    category: "games",
    language: "en",
    useCases: [
      {
        title: "Cognitive Focus & Logic Training",
        description: "Stimulate logical deduction and working memory by resolving non-repeating number placement across 3x3 subgrids.",
      },
      {
        title: "Distraction-Free Solving",
        description: "Pure dark-mode interface without noisy commercial banners, animated pop-ups, or invasive cookies.",
      },
      {
        title: "Keyboard-First Ergonomics",
        description: "Use number keys 1-9 and directional arrows to quickly fill cells with blazing efficiency.",
      },
    ],
    shortcuts: [
      { key: "1 - 9", action: "Place number into selected cell" },
      { key: "Arrow Keys", action: "Navigate between cells" },
      { key: "Backspace / Delete", action: "Erase cell value" },
    ],
    faqs: [
      {
        question: "What is the core rule of Sudoku?",
        answer: "Fill the 9x9 grid so that every row, every column, and every 3x3 block contains all numbers from 1 to 9 without any duplicates.",
      },
      {
        question: "Can I check if my answers are correct?",
        answer: "Yes, click the 'Verify' button at any point to validate your placed numbers against the mathematical solution.",
      },
    ],
    author: { name: "marianoguerra & Sudoku Contributors", url: "https://github.com/marianoguerra/sudoku.js" },
    license: "MIT",
    upstreamUrl: "https://github.com/marianoguerra/sudoku.js",
  },

  // 9. Flappy Bird Canvas
  "flappy-bird-canvas": {
    slug: "flappy-bird-canvas",
    targetKeyword: "flappy bird online",
    secondaryKeywords: ["flappy bird unblocked", "canvas flappy bird", "original flappy bird web"],
    headline: "Flappy Bird - HTML5 Canvas Arcade Online",
    summary: "Authentic HTML5 Canvas recreation of the viral Flappy Bird arcade game. Navigate past green pipe obstacles with rhythmic tapping and responsive gravity physics.",
    category: "games",
    language: "en",
    useCases: [
      {
        title: "Casual Arcade Reflex Challenge",
        description: "Test timing and micro-adjustment instincts against precise gravitational drop curves and pipe gap clearance.",
      },
      {
        title: "Lightweight Mobile & Desktop Play",
        description: "Loads in under 50 milliseconds with zero dependencies, fully responsive on iPhone, Android, Mac, and PC.",
      },
      {
        title: "High Score Tracking",
        description: "Retains your session best score locally in browser storage without transmitting telemetry.",
      },
    ],
    shortcuts: [
      { key: "Spacebar / Up Arrow", action: "Flap bird wings upward" },
      { key: "Click / Tap", action: "Flap on touchscreens or with mouse" },
    ],
    faqs: [
      {
        question: "How do you play Flappy Bird?",
        answer: "Tap the screen or press the spacebar to flap your wings and gain altitude. Avoid hitting the pipes or falling onto the ground.",
      },
      {
        question: "Is this the authentic physics model?",
        answer: "Yes, it faithfully replicates the original acceleration decay, parabolic flap trajectories, and collision bounding boxes.",
      },
    ],
    author: { name: "Nebez Briefkani", url: "https://github.com/nebez/floppybird" },
    license: "MIT",
    upstreamUrl: "https://github.com/nebez/floppybird",
  },

  // 10. Atari Breakout
  "atari-breakout": {
    slug: "atari-breakout",
    targetKeyword: "atari breakout online",
    secondaryKeywords: ["brick breaker game web", "classic breakout unblocked", "retro breakout canvas"],
    headline: "Atari Breakout - HTML5 Canvas Brick Breaker",
    summary: "Classic retro brick breaker arcade game inspired by Atari Breakout. Deflect the rebounding ball with your paddle to smash through colorful rows of bricks.",
    category: "games",
    language: "en",
    useCases: [
      {
        title: "Classic Arcade Nostalgia",
        description: "Relive the legendary 1976 arcade sensation with smooth 60 FPS canvas physics and responsive paddle tracking.",
      },
      {
        title: "Angle & Velocity Calculation",
        description: "Hit the ball with the outer edges of the paddle to create sharp angle cuts and penetrate upper brick layers.",
      },
      {
        title: "Quick Casual Sessions",
        description: "Pure client-side offline game ideal for quick 3-minute mental breaks between coding tasks.",
      },
    ],
    shortcuts: [
      { key: "Mouse Move", action: "Smooth analog paddle tracking" },
      { key: "Left / Right Arrow", action: "Keyboard paddle control" },
    ],
    faqs: [
      {
        question: "How do I control the paddle?",
        answer: "Move your mouse horizontally across the canvas or use the Left and Right arrow keys on your keyboard.",
      },
      {
        question: "How do I win the game?",
        answer: "Clear all 35 colored bricks before losing all 3 lives to achieve a complete victory.",
      },
    ],
    author: { name: "Mozilla Developer Network & Contributors", url: "https://developer.mozilla.org/en-US/docs/Games/Tutorials/2D_Breakout_game_pure_JavaScript" },
    license: "MIT",
    upstreamUrl: "https://github.com/end3r/Gamedev-Canvas-tutorial",
  },

  // 11. Tic Tac Toe AI
  "tic-tac-toe-ai": {
    slug: "tic-tac-toe-ai",
    targetKeyword: "tic tac toe online",
    secondaryKeywords: ["tic tac toe vs ai", "unbeatable tic tac toe", "minimax tic tac toe"],
    headline: "Tic Tac Toe vs Unbeatable AI (Minimax)",
    summary: "Play classic 3x3 Tic Tac Toe against an unbeatable AI powered by the Minimax decision algorithm. Can you force a draw against perfect game theory play?",
    category: "games",
    language: "en",
    useCases: [
      {
        title: "Game Theory & AI Demonstration",
        description: "Experience how the Minimax recursive tree algorithm evaluates all future board states to ensure optimal defense and victory.",
      },
      {
        title: "Quick Brain Stimulation",
        description: "Test your opening placement tactics and defensive blocking in instant 30-second games.",
      },
      {
        title: "Clean Modern Interface",
        description: "Minimalist dark zinc board with smooth tactile state indicators and immediate restart capabilities.",
      },
    ],
    shortcuts: [
      { key: "Click Grid Cell", action: "Place X marker" },
    ],
    faqs: [
      {
        question: "Can I beat this AI?",
        answer: "In a standard 3x3 Tic Tac Toe game, a perfect Minimax algorithm will never lose. If you play flawlessly, the best possible outcome is a draw!",
      },
      {
        question: "How does the Minimax algorithm work?",
        answer: "It recursively explores every possible future move branch, maximizing the AI's score (+10) while assuming the human plays the optimal countermove (-10).",
      },
    ],
    author: { name: "Open Source Game Algorithms", url: "https://en.wikipedia.org/wiki/Minimax" },
    license: "MIT",
    upstreamUrl: "https://github.com/topics/minimax-algorithm",
  },
};
