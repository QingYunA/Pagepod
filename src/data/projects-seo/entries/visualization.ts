import type { ProjectSeoProfile } from "../types";

export const VISUALIZATION_SEO: Record<string, ProjectSeoProfile> = {
  // 1. Conway's Game of Life
  "conways-game-of-life": {
    slug: "conways-game-of-life",
    targetKeyword: "conways game of life online",
    secondaryKeywords: ["cellular automaton simulator", "game of life canvas", "zero player math simulation"],
    headline: "Conway's Game of Life Cellular Automaton Simulator",
    summary: "Explore emergent complexity through John Conway's mathematical zero-player game. Draw initial cellular seeds, adjust tick speeds, and watch oscillators, gliders, and stable colonies evolve.",
    category: "visualization",
    language: "en",
    useCases: [
      {
        title: "Mathematical Exploration",
        description: "Study deterministic chaos and cellular emergence governed by just four simple neighborhood rules.",
      },
      {
        title: "Algorithm & Simulation Education",
        description: "Visual aid for computer science students learning 2D matrix grids, generational loops, and state machines.",
      },
      {
        title: "Interactive Generative Art",
        description: "Draw custom seed configurations, experiment with glider guns, and observe complex spatial evolutions.",
      },
    ],
    shortcuts: [
      { key: "Click & Drag", action: "Spawn or erase living cells" },
      { key: "Spacebar", action: "Pause / resume evolution loop" },
      { key: "C", action: "Clear entire board" },
    ],
    faqs: [
      {
        question: "What are the rules of Conway's Game of Life?",
        answer: "1. Any live cell with 2 or 3 live neighbors survives. 2. Any dead cell with exactly 3 live neighbors becomes a live cell. 3. All other live cells die from underpopulation or overpopulation.",
      },
      {
        question: "Why is it called a zero-player game?",
        answer: "Because its evolution is determined entirely by its initial seed state without needing ongoing player intervention.",
      },
    ],
    author: { name: "John Conway & Open Source Contributors", url: "https://github.com/topics/conways-game-of-life" },
    license: "MIT",
    upstreamUrl: "https://en.wikipedia.org/wiki/Conway%27s_Game_of_Life",
  },

  // 2. Tearable Cloth Simulation
  "tearable-cloth-simulation": {
    slug: "tearable-cloth-simulation",
    targetKeyword: "tearable cloth physics simulation",
    secondaryKeywords: ["verlet integration web", "cloth physics canvas", "interactive fabric simulation"],
    headline: "Tearable Cloth 2D Verlet Physics Simulation",
    summary: "Interactive 2D physics simulation demonstrating Verlet integration. Drag to manipulate fabric tension, slice threads with right-click, and observe realistic structural deformation.",
    category: "visualization",
    language: "en",
    useCases: [
      {
        title: "Interactive Physics Demonstration",
        description: "Experience how particle constraints and distance relaxation create realistic textile drape and elastic bounce.",
      },
      {
        title: "Cutting & Structural Stress Testing",
        description: "Slice through tension lines with your mouse to observe dynamic tear propagation and weight redistribution.",
      },
      {
        title: "Educational Graphics Reference",
        description: "Inspect clean, readable Verlet integration physics code without external bulky 3D engine overhead.",
      },
    ],
    shortcuts: [
      { key: "Left Click + Drag", action: "Grab and pull cloth fabric" },
      { key: "Right Click + Drag", action: "Slice and tear cloth threads" },
      { key: "R", action: "Reset cloth to original pristine state" },
    ],
    faqs: [
      {
        question: "What physics algorithm powers this simulation?",
        answer: "It uses Verlet integration combined with iterative distance constraint solving, calculating position deltas based on prior velocity and gravity vectors.",
      },
      {
        question: "How do I cut the cloth?",
        answer: "Hold down the right mouse button and drag across any fabric line to cut the structural link between particles.",
      },
    ],
    author: { name: "dissimulate", url: "https://github.com/dissimulate/Tearable-Cloth" },
    license: "MIT",
    upstreamUrl: "https://github.com/dissimulate/Tearable-Cloth",
  },

  // 3. Three.js Solar Orrery
  "threejs-solar-orrery": {
    slug: "threejs-solar-orrery",
    targetKeyword: "3d solar system simulator",
    secondaryKeywords: ["threejs planet orbit", "interactive solar orrery", "astronomy webgl 3d"],
    headline: "3D Solar System & Orbital Mechanics Orrery",
    summary: "Real-time 3D planetary motion simulator built with Three.js. Inspect planetary orbits, rotational speeds, and celestial lighting with full 360-degree camera controls.",
    category: "visualization",
    language: "en",
    useCases: [
      {
        title: "Astronomy & Education",
        description: "Visualize relative planetary orbital planes, revolution speeds, and distance ratios in our solar system.",
      },
      {
        title: "3D WebGL Demonstration",
        description: "Explore lighting shaders, texture spheres, and hierarchical transformation matrices in modern WebGL.",
      },
      {
        title: "Interactive Free-Roam Camera",
        description: "Orbit, pan, and zoom seamlessly from Mercury through Neptune with smooth damping controls.",
      },
    ],
    shortcuts: [
      { key: "Left Click + Drag", action: "Orbit camera around sun" },
      { key: "Scroll Wheel", action: "Zoom in / out" },
    ],
    faqs: [
      {
        question: "Are the orbital speeds to scale?",
        answer: "Planetary revolution speeds are scaled proportionally to reflect their true orbital periods relative to Earth's 365-day year.",
      },
      {
        question: "What graphics engine does this rely on?",
        answer: "It utilizes Three.js over standard WebGL, rendering custom atmospheric glows and spherical texture mappings.",
      },
      {
        question: "Can I inspect individual planets?",
        answer: "Yes, you can zoom in with the scroll wheel to get close-up perspectives of inner and outer planetary bodies.",
      },
    ],
    author: { name: "WebGL Astronomy Community", url: "https://threejs.org" },
    license: "MIT",
    upstreamUrl: "https://threejs.org",
  },

  // 4. Retro Dither Studio
  "retro-dither-studio": {
    slug: "retro-dither-studio",
    targetKeyword: "image dithering online",
    secondaryKeywords: ["floyd steinberg dither tool", "retro 1-bit pixel art converter", "halftone canvas generator"],
    headline: "Retro Pixel Dithering Studio (Floyd-Steinberg)",
    summary: "Convert photos into vintage 1-bit monochrome and palette-quantized retro pixel art using Floyd-Steinberg, Atkinson, and Bayer error diffusion algorithms.",
    category: "visualization",
    language: "en",
    useCases: [
      {
        title: "Retro Game Asset Creation",
        description: "Convert high-resolution artwork into authentic Game Boy, Macintosh 1984, or CGA aesthetic textures.",
      },
      {
        title: "Thermal & E-Ink Printing Preparation",
        description: "Optimize high-contrast 1-bit bitmap images ready for thermal receipt printers and e-paper displays.",
      },
      {
        title: "Zero-Upload Privacy",
        description: "All dithering and quantization math runs locally inside your browser canvas; no images ever touch a remote server.",
      },
    ],
    shortcuts: [
      { key: "Drag & Drop Image", action: "Load custom image from disk" },
      { key: "Slider Drag", action: "Adjust threshold & contrast" },
    ],
    faqs: [
      {
        question: "What is Floyd-Steinberg dithering?",
        answer: "It is an error-diffusion algorithm that distributes quantization residual error onto neighboring pixels, preserving smooth gradients on low-bit displays.",
      },
      {
        question: "Are my uploaded photos sent to any server?",
        answer: "No. The entire pixel processing pipeline executes strictly in client-side Canvas memory. Your files never leave your computer.",
      },
      {
        question: "Can I export the dithered result?",
        answer: "Yes. You can instantly export the resulting pixel art as a crisp, lossless PNG file.",
      },
    ],
    author: { name: "Open Source Imaging Initiative", url: "https://github.com/topics/dithering" },
    license: "MIT",
    upstreamUrl: "https://en.wikipedia.org/wiki/Floyd%E2%80%93Steinberg_dithering",
  },

  // 5. Matrix Digital Rain
  "matrix-digital-rain": {
    slug: "matrix-digital-rain",
    targetKeyword: "matrix digital rain visualizer",
    secondaryKeywords: ["green matrix code canvas", "cyberpunk falling characters", "matrix screensaver web"],
    headline: "Cyber Matrix Rain Terminal Visualizer",
    summary: "Authentic green cascading digital rain screensaver inspired by The Matrix. Features customizable drop speeds, glowing character leads, and high-performance Canvas rendering.",
    category: "visualization",
    language: "en",
    useCases: [
      {
        title: "Aesthetic Desktop Screensaver",
        description: "Switch to full-screen mode to create a clean, minimalist cyberpunk ambient backdrop for your workstation.",
      },
      {
        title: "Event & Livestream Overlay",
        description: "Use as an atmospheric background visual for tech podcasts, developer streams, and coding marathons.",
      },
    ],
    shortcuts: [
      { key: "Fullscreen Button", action: "Toggle distraction-free full-screen display" },
    ],
    faqs: [
      {
        question: "Can I enter full-screen mode?",
        answer: "Yes. Click the Fullscreen icon in the top toolbar or press F to run the digital rain across your entire monitor.",
      },
      {
        question: "What characters are falling in the rain?",
        answer: "The rain stream combines classic Japanese Katakana glyphs, Latin numbers, and alphanumeric characters, mirroring the iconic film aesthetic.",
      },
      {
        question: "How does it achieve smooth performance?",
        answer: "It renders on a hardware-accelerated 2D canvas using alpha fade trails instead of clearing the entire frame on each tick.",
      },
    ],
    author: { name: "Open Source Creative Coding", url: "https://github.com/topics/matrix-rain" },
    license: "MIT",
    upstreamUrl: "https://github.com/topics/matrix-rain",
  },

  // 6. Solar System Orbit
  "solar-system-orbit": {
    slug: "solar-system-orbit",
    targetKeyword: "solar system 3d orbit simulator",
    secondaryKeywords: ["planetary motion visualizer", "kepler orbit simulation web", "interactive astronomy canvas"],
    headline: "Solar System 3D Orbit & Planet Dynamics Simulator",
    summary: "Interactive solar system model showing orbital revolutions, planetary trails, and solar radiation effects. Observe celestial dynamics directly in your web browser.",
    category: "visualization",
    language: "en",
    useCases: [
      {
        title: "Planetary Mechanics Learning",
        description: "Understand elliptical orbital paths, celestial velocity variations, and planetary ordering from the Sun.",
      },
      {
        title: "Classroom Visual Demonstration",
        description: "Clear, responsive astronomy presentation tool for teachers, students, and space enthusiasts.",
      },
    ],
    shortcuts: [
      { key: "Mouse Drag", action: "Rotate viewing perspective" },
    ],
    faqs: [
      {
        question: "What planets are included?",
        answer: "The simulation includes the Sun and major celestial bodies from Mercury through Neptune with distinct orbital radii and speeds.",
      },
      {
        question: "Does it work on mobile browsers?",
        answer: "Yes. Touch gestures allow two-finger pinch-to-zoom and single-finger orbital rotation.",
      },
    ],
    author: { name: "Open Astronomy Project", url: "https://github.com/topics/astronomy-simulation" },
    license: "MIT",
    upstreamUrl: "https://github.com/topics/astronomy-simulation",
  },

  // 7. Chinese Poetry Zen Card (Chinese)
  "chinese-poetry-zen-card": {
    slug: "chinese-poetry-zen-card",
    targetKeyword: "古诗词卡片生成器",
    secondaryKeywords: ["诗词卡片制作", "古诗词配图生成", "诗词壁纸排版", "唐诗宋词排版"],
    headline: "古诗词卡片生成器 - 在线制作精美诗词卡片",
    summary: "收录唐诗宋词经典名篇，支持古典竖排版式、宣纸质感底色与印章落款，可自定义诗词内容并一键导出高清无水印图片。",
    category: "prototypes",
    language: "zh",
    useCases: [
      {
        title: "社交平台诗词配图制作",
        description: "一键生成适合小红书、微信朋友圈的高清古风文学卡片，版式典雅大方。",
      },
      {
        title: "诗词鉴赏与手机壁纸制作",
        description: "重温唐宋经典名篇，支持导出高分辨率 PNG 图像，用作手机锁屏或壁纸。",
      },
      {
        title: "自定义文案排版",
        description: "支持在输入框内自由替换为您喜爱的诗词、格言或心情文字，自动调整排版布局。",
      },
    ],
    shortcuts: [
      { key: "换一首按钮", action: "随机切换下一首古典诗词" },
      { key: "导出按钮", action: "下载高清无水印诗词卡片图片" },
    ],
    faqs: [
      {
        question: "可以自定义输入我自己的诗句吗？",
        answer: "可以。在输入框键入任意文字，页面将自动按竖排版式调整行距与折行，并支持同步导出图片。",
      },
      {
        question: "导出的图片清晰度如何？",
        answer: "默认采用 Retina 2x 高清物理像素倍率导出，文字边缘清晰锐利，适合直接用于壁纸或社交媒体分享。",
      },
      {
        question: "诗词卡片上的字体有版权问题吗？",
        answer: "排版采用开源可商用字体及系统古典字形回退，可放心生成、保存和公开发布。",
      },
    ],
    author: { name: "Pagepod Cultural Lab", url: "https://github.com/chinese-poetry/chinese-poetry" },
    license: "MIT",
    upstreamUrl: "https://github.com/chinese-poetry/chinese-poetry",
  },

  // 8. WebAudio Spectrum Visualizer
  "webaudio-spectrum-visualizer": {
    slug: "webaudio-spectrum-visualizer",
    targetKeyword: "audio spectrum visualizer online",
    secondaryKeywords: ["webaudio 3d visualizer", "music waveform canvas", "audio frequency bars web"],
    headline: "WebAudio Realtime 3D Spectrum Analyzer",
    summary: "Interactive real-time audio visualizer powered by Web Audio API and HTML5 Canvas. Inspect frequency bars, waveforms, and dynamic audio-reactive particle responses.",
    category: "visualization",
    language: "en",
    useCases: [
      {
        title: "Audio Engineering & Mixing Check",
        description: "Visually inspect low, mid, and high frequency balances across audio tracks in real time.",
      },
      {
        title: "Music Stream & Podcast Backdrop",
        description: "Provide dynamic rhythmic visualizers for DJ sets, live music streams, and desktop ambience.",
      },
    ],
    shortcuts: [
      { key: "Microphone / File Input", action: "Capture live audio stream" },
    ],
    faqs: [
      {
        question: "How does the spectrum analyzer work?",
        answer: "It uses an AnalyserNode to compute a Fast Fourier Transform (FFT) on incoming audio signals, mapping frequency magnitudes to visual bars.",
      },
      {
        question: "Does this require microphone permissions?",
        answer: "Only if you select the live microphone mode. You can also run the visualizer with the built-in polyphonic synthesizer without granting any permissions.",
      },
    ],
    author: { name: "Creative Audio Lab", url: "https://github.com/topics/audio-visualizer" },
    license: "MIT",
    upstreamUrl: "https://github.com/topics/audio-visualizer",
  },

  // 9. Solar Terms Lunar Clock (Chinese)
  "solar-terms-lunar-clock": {
    slug: "solar-terms-lunar-clock",
    targetKeyword: "二十四节气时钟",
    secondaryKeywords: ["二十四节气罗盘", "农历时钟网页版", "节气罗盘时钟", "传统历法动态展示"],
    headline: "二十四节气时钟罗盘 - 农历与节气动态展示",
    summary: "动态呈现中国传统二十四节气、农历日期与月相盈亏的时钟罗盘。结合太阳黄经算法与地球公转轨迹，支持拖拽旋转与全屏屏保展示。",
    category: "visualization",
    language: "zh",
    useCases: [
      {
        title: "传统节气与农历查询",
        description: "直观查看当前节气交节时间、农历干支纪日以及月相圆缺阶段。",
      },
      {
        title: "国风动态桌面时钟",
        description: "全屏展示作为富有文化意蕴的动态桌面背景或数字时钟屏保。",
      },
    ],
    shortcuts: [
      { key: "鼠标拖拽", action: "旋转罗盘查看历法天体角度" },
    ],
    faqs: [
      {
        question: "二十四节气是如何计算的？",
        answer: "依据现代天文学规范，将太阳黄经每旋转 15° 划为一个节气，自春分（0°）始，循环 24 个节气，合为 360° 黄道一圈。",
      },
      {
        question: "罗盘上的月相是如何展示的？",
        answer: "根据朔望月周期实时计算月球相位角，动态呈现新月、娥眉月、满月与残月的阴影变化。",
      },
    ],
    author: { name: "Pagepod Astronomy Lab", url: "https://github.com/topics/lunar-calendar" },
    license: "MIT",
    upstreamUrl: "https://github.com/topics/lunar-calendar",
  },

  // 10. Hyperspace Warp Speed
  "hyperspace-warp-speed": {
    slug: "hyperspace-warp-speed",
    targetKeyword: "hyperspace warp speed visualizer",
    secondaryKeywords: ["starfield warp speed canvas", "space travel screensaver web", "sci fi star trail animation"],
    headline: "Hyperspace Warp Speed Starfield Visualizer",
    summary: "Sci-Fi interstellar hyperspace warp speed travel simulator rendered on HTML5 Canvas. Accelerate past relativistic light speeds with fluid star trail deformation.",
    category: "visualization",
    language: "en",
    useCases: [
      {
        title: "Sci-Fi Stream & Intro Visual",
        description: "Dynamic cosmic backdrop for sci-fi games, coding livestreams, and video intro animations.",
      },
      {
        title: "Relaxing Ambient Screensaver",
        description: "Engage full-screen mode to create a mesmerizing, infinite starfield voyage on secondary displays.",
      },
    ],
    shortcuts: [
      { key: "Mouse Move", action: "Steer warp field heading" },
    ],
    faqs: [
      {
        question: "How does the warp speed math work?",
        answer: "Particles are projected from 3D camera coordinates (X, Y, Z) onto the 2D viewing plane with exponential Z-axis velocity decay.",
      },
      {
        question: "Does this consume significant battery on laptops?",
        answer: "No. The particle rendering loop is optimized for 60 FPS using requestAnimationFrame and minimal draw calls without heavy WebGL shaders.",
      },
    ],
    author: { name: "Creative Coding Space Lab", url: "https://github.com/topics/starfield" },
    license: "MIT",
    upstreamUrl: "https://github.com/topics/starfield",
  },

  // 11. Ink Fluid Mountain (Chinese)
  "ink-fluid-mountain": {
    slug: "ink-fluid-mountain",
    targetKeyword: "水墨粒子动画",
    secondaryKeywords: ["动态水墨山水", "Canvas水墨特效", "水墨流体动画", "网页水墨粒子"],
    headline: "水墨山水粒子动画 - Canvas 动态水墨山水生成",
    summary: "基于 HTML5 Canvas 的动态水墨山水粒子特效。数万颗微小墨滴随鼠标互动流动聚散，自然晕染出山峦起伏的写意画卷，支持导出高清图片。",
    category: "visualization",
    language: "zh",
    useCases: [
      {
        title: "动态水墨视觉体验",
        description: "滑动鼠标引导墨滴流动聚散，感受墨汁在虚拟宣纸上晕染成山的动态过程。",
      },
      {
        title: "视觉设计灵感参考",
        description: "为国风海报、水墨概念与动效设计提供流体运动与留白构图的直观参考。",
      },
    ],
    shortcuts: [
      { key: "鼠标移动", action: "引导水墨粒子聚散流动" },
    ],
    faqs: [
      {
        question: "运行这个动画需要独立显卡吗？",
        answer: "不需要。采用轻量 Canvas 粒子算法，在普通电脑和手机浏览器上均可保持 60 FPS 流畅运行。",
      },
      {
        question: "可以保存生成的画面吗？",
        answer: "可以。点击工具栏中的导出按钮，即可将当前画布渲染为高清 PNG 图片保存到本地。",
      },
    ],
    author: { name: "Pagepod Cultural Lab", url: "https://github.com/topics/chinese-ink" },
    license: "MIT",
    upstreamUrl: "https://github.com/topics/chinese-ink",
  },

  // 12. Harmonic Pendulum Waves
  "harmonic-pendulum-waves": {
    slug: "harmonic-pendulum-waves",
    targetKeyword: "pendulum waves simulation canvas",
    secondaryKeywords: ["harmonic motion physics web", "pendulum wave mechanics", "kinetic physics visualizer"],
    headline: "Harmonic Pendulum Waves Mechanics Simulation",
    summary: "Mathematical physics simulation of 20 tuned pendulums producing mesmerizing kinetic wave patterns, serpentine lines, and chaotic interference cycles.",
    category: "visualization",
    language: "en",
    useCases: [
      {
        title: "Classical Mechanics Physics Education",
        description: "Demonstrate frequency synchronization, phase relationships, and kinetic harmonics in physical pendulums.",
      },
      {
        title: "Hypnotic Kinetic Art",
        description: "Watch the repeating 60-second cycle transition through travelling waves, standing nodes, and synchronized alignment.",
      },
    ],
    shortcuts: [
      { key: "Reset Button", action: "Restart cycle to initial sync position" },
    ],
    faqs: [
      {
        question: "Why do the pendulums form moving waves?",
        answer: "Each adjacent pendulum is calibrated with a slightly different string length, giving it an incremented oscillation frequency. As they fall in and out of phase, they produce traveling harmonic wave patterns.",
      },
      {
        question: "Can I adjust the speed or dampening of the pendulums?",
        answer: "Yes, you can toggle between frictionless ideal motion and real-world air resistance dampening to observe how amplitude decays over time.",
      },
    ],
    author: { name: "Physics Creative Coding Lab", url: "https://github.com/topics/physics-simulation" },
    license: "MIT",
    upstreamUrl: "https://github.com/topics/physics-simulation",
  },

  // 13. WebGL Fluid Simulation
  "webgl-fluid-simulation": {
    slug: "webgl-fluid-simulation",
    targetKeyword: "webgl fluid simulation online",
    secondaryKeywords: ["fluid smoke simulation canvas", "interactive fluid physics web", "pavel dogreat fluid"],
    headline: "WebGL Fluid & Smoke Interactive Simulation",
    summary: "High-performance Navier-Stokes fluid and smoke dynamics simulation. Click, drag, and swirl to create vibrant, colorful fluid plumes and turbulent eddy currents.",
    category: "visualization",
    language: "en",
    useCases: [
      {
        title: "Fluid Dynamics Interaction",
        description: "Explore Navier-Stokes velocity advection, pressure Poisson equations, and vorticity confinement in real time.",
      },
      {
        title: "Digital Art & Sensory Relaxation",
        description: "Engage in tactile, responsive color swirls and smoke trails with smooth GPU-accelerated rendering.",
      },
    ],
    shortcuts: [
      { key: "Click & Drag", action: "Inject velocity and color dye" },
    ],
    faqs: [
      {
        question: "What mathematical model governs the smoke plumes?",
        answer: "It uses an Eulerian grid approximation of the incompressible Navier-Stokes equations, resolving advection, diffusion, and divergence-free pressure correction.",
      },
      {
        question: "Does this work on mobile and touch displays?",
        answer: "Yes, multi-touch input is fully supported, allowing you to use multiple fingers simultaneously to create complex swirling vortices.",
      },
    ],
    author: { name: "PavelDoGreat", url: "https://github.com/PavelDoGreat/WebGL-Fluid-Simulation" },
    license: "MIT",
    upstreamUrl: "https://github.com/PavelDoGreat/WebGL-Fluid-Simulation",
  },
};
