let timerInterval;
let currentLevel;
let gameState = [];
const IMAGE_FOLDER = "logos/";
const TOOLTIP_FOLDER = "evolutions/";
let tooltipTimeout;
let eligibleEvolutions = [];

let selectedCell = null;
let isProcessing = false;

let playerScore = 0;
let chainScores = {};


function initializeGame(playerName, difficulty, savedState = null) {
  if (savedState) {
    playerName = savedState.playerName;
    difficulty = savedState.difficulty;
    
    currentLevel = levels[difficulty];
    if (!currentLevel) {
      console.error("Invalid difficulty in saved game.");
      return;
    }
    
    document.querySelector("#welcomeText").textContent = 
      `Player: ${playerName} | Difficulty: ${currentLevel.name}`;
    
    const { rows, cols } = currentLevel;
    createGameBoard(rows, cols);
    filterEligibleEvolutions(difficulty);
    playerScore = savedState.playerScore;
    chainScores = savedState.chainScores;
    createScoreDisplay();
    updateScoreDisplay();
    displayGameLeaderboard();
    restoreGameBoard(savedState.gameState);
    createDrawButton();
    
    const timeRemaining = savedState.timeRemaining || 0;
    if (timeRemaining > 0) {
      startCountdown(timeRemaining);
    } else {
      startCountdown(currentLevel.time * 60);
    }
  } else {
    currentLevel = levels[difficulty];
    if (!currentLevel) {
      console.error("Invalid difficulty selected.");
      return;
    }
    
    document.querySelector("#welcomeText").textContent = 
      `Player: ${playerName} | Difficulty: ${currentLevel.name}`;
    
    const { rows, cols, time } = currentLevel;
    
    createGameBoard(rows, cols);
    filterEligibleEvolutions(difficulty);
    initializeScores();
    createScoreDisplay();
    displayGameLeaderboard();
    populateGameBoard(difficulty);
    createDrawButton();
    startCountdown(time * 60);
  }
  
  startAutoSave();
}


function initializeScores() {
  playerScore = 0;
  chainScores = {};
  
  evolutions.forEach(evolution => {
    chainScores[evolution.name] = 0;
  });
  
  updateScoreDisplay();
}

function createScoreDisplay() {
  const gameControls = document.querySelector("#gameControls");
  
  if (!document.querySelector("#playerScoreDisplay")) {
    const playerScoreDiv = document.createElement("div");
    playerScoreDiv.id = "playerScoreDisplay";
    playerScoreDiv.className = "score-display";
    playerScoreDiv.innerHTML = `<strong>Player Score:</strong> <span>0</span>`;
    gameControls.appendChild(playerScoreDiv);
  }
  
  if (!document.querySelector("#chainScoresDisplay")) {
    const chainScoresDiv = document.createElement("div");
    chainScoresDiv.id = "chainScoresDisplay";
    chainScoresDiv.className = "chain-scores";
    gameControls.appendChild(chainScoresDiv);
  }
  
  updateChainScoreElements();
}

function updateChainScoreElements() {
  const chainScoresDisplay = document.querySelector("#chainScoresDisplay");
  chainScoresDisplay.innerHTML = "";
  
  const difficulty = currentLevel.name.toLowerCase();
  
  const difficultiesToShow = [];
  if (difficulty === "easy") {
    difficultiesToShow.push("easy");
  } else if (difficulty === "medium") {
    difficultiesToShow.push("easy", "medium");
  } else if (difficulty === "hard") {
    difficultiesToShow.push("easy", "medium", "hard");
  }
  
  const chainsHeader = document.createElement("div");
  chainsHeader.className = "chains-header";
  chainsHeader.textContent = "Chain Scores:";
  chainScoresDisplay.appendChild(chainsHeader);
  
  evolutions.filter(evolution => 
    difficultiesToShow.includes(evolution.difficulty)
  ).forEach(evolution => {
    const chainDiv = document.createElement("div");
    chainDiv.className = `chain-score ${evolution.difficulty}`;
    chainDiv.innerHTML = `
      <span class="chain-name">${evolution.name}:</span> 
      <span class="chain-score-value">0</span>
    `;
    chainScoresDisplay.appendChild(chainDiv);
  });
}

function updateScoreDisplay() {
  const playerScoreElement = document.querySelector("#playerScoreDisplay span");
  if (playerScoreElement) {
    playerScoreElement.textContent = playerScore;
  }
  
  Object.keys(chainScores).forEach(chainName => {
    const chainElement = document.querySelector(`.chain-score .chain-name`);
    const elements = document.querySelectorAll(`.chain-score .chain-name`);
    
    for (let i = 0; i < elements.length; i++) {
      if (elements[i].textContent.includes(chainName)) {
        const scoreElement = elements[i].closest('.chain-score').querySelector('.chain-score-value');
        if (scoreElement) {
          scoreElement.textContent = chainScores[chainName];
        }
        break;
      }
    }
  });
}

function checkEvolutionCompleted(evolutionName, step) {
  const evolution = evolutions.find(evo => evo.name === evolutionName);
  
  if (!evolution) return false;
  
  return step === evolution.steps.length;
}

function awardPointsForChain(evolutionName) {
  const evolution = evolutions.find(evo => evo.name === evolutionName);
  
  if (!evolution) return;
  
  const points = evolution.points;
  
  playerScore += points;
  chainScores[evolutionName] += points;
  
  updateScoreDisplay();
  
  const currentDifficulty = currentLevel.name.toLowerCase();
  const playerNameElement = document.querySelector("#welcomeText");
  const playerName = playerNameElement.textContent.split('|')[0].replace('Player:', '').trim();
  
  if (checkForHighScore(playerScore, currentDifficulty)) {
    addScoreToLeaderboard(playerName, playerScore, currentDifficulty);
  }
  
  showNotification(`Chain Complete! +${points} points for ${evolutionName}!`);
  
  saveGameState();
}

function createDrawButton() {
  if (document.querySelector("#drawButton")) {
    return;
  }
  
  const drawButton = document.createElement("button");
  drawButton.id = "drawButton";
  drawButton.className = "draw-button";
  drawButton.textContent = "Draw";
  
  drawButton.addEventListener("click", () => {
    placeRandomImage();
  });
  
  const gameControls = document.querySelector("#gameControls");
  gameControls.appendChild(drawButton);
}

function filterEligibleEvolutions(difficulty) {
  let eligibleDifficulties = [];
  
  if (difficulty === "easy") {
    eligibleDifficulties = ["easy"];
  } else if (difficulty === "medium") {
    eligibleDifficulties = ["easy", "medium"];
  } else if (difficulty === "hard") {
    eligibleDifficulties = ["easy", "medium", "hard"];
  }
  
  eligibleEvolutions = evolutions.filter(evolution => 
    eligibleDifficulties.includes(evolution.difficulty)
  );
}

function createGameBoard(rows, cols) {
  const board = document.querySelector("#gameBoard");
  board.innerHTML = "";
  
  board.className = currentLevel.name.toLowerCase();
  
  gameState = Array(rows).fill().map(() => Array(cols).fill(null));

  for (let row = 0; row < rows; row++) {
    const rowDiv = document.createElement("div");
    rowDiv.style.display = "flex";

    for (let col = 0; col < cols; col++) {
      const cell = document.createElement("div");
      cell.className = "game-cell";
      cell.dataset.row = row;
      cell.dataset.col = col;
      
      cell.addEventListener("click", handleCellClick);
      
      rowDiv.appendChild(cell);
    }

    board.appendChild(rowDiv);
  }
}

function populateGameBoard(difficulty) {
  const { rows, cols } = currentLevel;
  
  const allPositions = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      allPositions.push({ row, col });
    }
  }
  
  const shuffledPositions = shuffleArray([...allPositions]);
  
  const cellsToFill = difficulty === "easy" ? 4 : difficulty === "medium" ? 6 : 8;
  const positionsToFill = shuffledPositions.slice(0, cellsToFill);
  
  for (let i = 0; i < positionsToFill.length; i++) {
    const position = positionsToFill[i];
    placeRandomImageAt(position.row, position.col);
  }
}

function getRandomStep1Item() {
  if (eligibleEvolutions.length === 0) {
    return null;
  }
  
  const randomEvolutionIndex = Math.floor(Math.random() * eligibleEvolutions.length);
  const randomEvolution = eligibleEvolutions[randomEvolutionIndex];
  
  const step1 = randomEvolution.steps.find(step => step.step === 1);
  if (step1) {
    return {
      name: step1.name,
      img: step1.img,
      evolutionName: randomEvolution.name,
      difficulty: randomEvolution.difficulty,
      description: step1.description || `${step1.name} - Step 1 of ${randomEvolution.name}`,
      tooltipImg: randomEvolution.tooltip,
      step: 1
    };
  }
  
  return null;
}

function placeRandomImageAt(row, col) {
  if (gameState[row][col]) {
    console.log("Cell already has an image.");
    return false;
  }
  
  const randomItem = getRandomStep1Item();
  
  if (randomItem) {
    gameState[row][col] = randomItem;
    
    const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    if (cell) {
      cell.textContent = "";
      cell.innerHTML = "";
      
      const imgElement = document.createElement("img");
      imgElement.src = IMAGE_FOLDER + randomItem.img;
      imgElement.alt = randomItem.name;
      imgElement.title = randomItem.name;
      imgElement.style.width = "100%";
      imgElement.style.height = "100%";
      
      cell.dataset.itemName = randomItem.name;
      cell.dataset.evolutionName = randomItem.evolutionName;
      cell.dataset.description = randomItem.description;
      cell.dataset.tooltipImg = randomItem.tooltipImg;
      
      cell.addEventListener("mouseenter", startTooltipTimer);
      cell.addEventListener("mouseleave", cancelTooltip);
      
      cell.appendChild(imgElement);
      return true;
    }
  }
  return false;
}

function placeRandomImage() {
  const { rows, cols } = currentLevel;
  
  const emptyCells = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (!gameState[row][col]) {
        emptyCells.push({ row, col });
      }
    }
  }
  
  if (emptyCells.length > 0) {
    const randomIndex = Math.floor(Math.random() * emptyCells.length);
    const { row, col } = emptyCells[randomIndex];
    const placed = placeRandomImageAt(row, col);
    
    if (placed) {
      saveGameState();
    }
  } else {
    console.log("No empty cells available.");
    
    showNotification("No empty cells available on the board.");
  }
}

function showNotification(message) {
  const notification = document.querySelector("#notification");
  notification.textContent = message;
  notification.classList.remove("hidden");
  
  setTimeout(() => {
    notification.classList.add("hidden");
  }, 3000);
}

function handleCellClick(event) {
  if (isProcessing) {
    return;
  }
  
  const cell = event.currentTarget;
  const row = parseInt(cell.dataset.row);
  const col = parseInt(cell.dataset.col);
  
  if (!gameState[row][col]) {
    console.log(`Cell at ${row},${col} has no image. Placing a random image.`);
    placeRandomImageAt(row, col);
    saveGameState();
    return;
  }
  
  if (!selectedCell) {
    cell.classList.add("selected");
    selectedCell = cell;
    return;
  }
  
  if (selectedCell === cell) {
    cell.classList.remove("selected");
    selectedCell = null;
    return;
  }
  
  cell.classList.add("selected-second");
  
  const selectedRow = parseInt(selectedCell.dataset.row);
  const selectedCol = parseInt(selectedCell.dataset.col);
  
  const firstItem = gameState[selectedRow][selectedCol];
  const secondItem = gameState[row][col];
  
  if (firstItem.name === secondItem.name) {
    console.log("Match found.");
    processMatch(selectedCell, cell);
  } else {
    console.log("No match.");
    selectedCell.classList.add("no-match-shake");
    cell.classList.add("no-match-shake");
    
    setTimeout(() => {
      selectedCell.classList.remove("no-match-shake");
      cell.classList.remove("no-match-shake");
      
      selectedCell.classList.remove("selected");
      cell.classList.remove("selected-second");
      selectedCell = null;
    }, 500);
  }
}

function processMatch(firstCell, secondCell) {
  isProcessing = true;
  
  const firstRow = parseInt(firstCell.dataset.row);
  const firstCol = parseInt(firstCell.dataset.col);
  const secondRow = parseInt(secondCell.dataset.row);
  const secondCol = parseInt(secondCell.dataset.col);
  
  const item = gameState[firstRow][firstCol];
  
  const nextStep = findNextEvolutionStep(item);
  
  if (nextStep) {
    firstCell.classList.remove("selected");
    secondCell.classList.remove("selected-second");
    
    evolveCell(firstRow, firstCol, nextStep);
    
    secondCell.classList.add("dismissing");
    
    setTimeout(() => {
      secondCell.classList.remove("dismissing");
      
      clearCell(secondRow, secondCol);
      placeRandomImageAt(secondRow, secondCol);
      
      selectedCell = null;
      isProcessing = false;
      
      saveGameState();
    }, 800);
  } else {
    firstCell.classList.remove("selected");
    secondCell.classList.remove("selected-second");
    selectedCell = null;
    isProcessing = false;
  }
}


function findNextEvolutionStep(item) {
  const evolutionLine = evolutions.find(evolution => evolution.name === item.evolutionName);
  
  if (!evolutionLine) {
    return null;
  }
  
  const currentStepIndex = evolutionLine.steps.findIndex(step => step.name === item.name);
  
  if (currentStepIndex !== -1 && currentStepIndex < evolutionLine.steps.length - 1) {
    const nextStep = evolutionLine.steps[currentStepIndex + 1];
    return {
      ...nextStep,
      evolutionName: evolutionLine.name,
      difficulty: evolutionLine.difficulty,
      description: nextStep.description || `${nextStep.name} - Step ${nextStep.step} of ${evolutionLine.name}`,
      tooltipImg: evolutionLine.tooltip,
      step: nextStep.step
    };
  }
  
  return null;
}

function evolveCell(row, col, nextStep) {
  gameState[row][col] = nextStep;
  
  const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
  if (cell) {
    const imgElement = cell.querySelector("img");
    
    if (imgElement) {
      cell.classList.add("evolving");
      
      setTimeout(() => {
        imgElement.src = IMAGE_FOLDER + nextStep.img;
        imgElement.alt = nextStep.name;
        imgElement.title = nextStep.name;
      }, 400);
      
      setTimeout(() => {
        cell.classList.remove("evolving");
        
        cell.dataset.itemName = nextStep.name;
        cell.dataset.description = nextStep.description;
        
        if (checkEvolutionCompleted(nextStep.evolutionName, nextStep.step)) {
          awardPointsForChain(nextStep.evolutionName);
          
          cell.classList.add("evolution-complete");
          setTimeout(() => {
            cell.classList.remove("evolution-complete");
          }, 2000);
        }
      }, 800);
    }
  }
}

function clearCell(row, col) {
  gameState[row][col] = null;
  
  const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
  if (cell) {
    cell.textContent = "[ ]";
    cell.innerHTML = "";
    
    delete cell.dataset.itemName;
    delete cell.dataset.evolutionName;
    delete cell.dataset.description;
    delete cell.dataset.tooltipImg;
    
    cell.removeEventListener("mouseenter", startTooltipTimer);
    cell.removeEventListener("mouseleave", cancelTooltip);
  }
}

function startTooltipTimer(event) {
  const cell = event.currentTarget;
  
  if (tooltipTimeout) {
    clearTimeout(tooltipTimeout);
  }
  
  tooltipTimeout = setTimeout(() => {
    showTooltip(cell);
  }, 3000);
}

function cancelTooltip() {
  if (tooltipTimeout) {
    clearTimeout(tooltipTimeout);
  }
  hideTooltip();
}

function createTooltipElement() {
  if (!document.querySelector("#game-tooltip")) {
    const tooltip = document.createElement("div");
    tooltip.id = "game-tooltip";
    tooltip.style.position = "fixed";
    tooltip.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
    tooltip.style.color = "black";
    tooltip.style.padding = "10px";
    tooltip.style.borderRadius = "5px";
    tooltip.style.zIndex = "100";
    tooltip.style.maxWidth = "250px";
    tooltip.style.display = "none";
    document.body.appendChild(tooltip);
  }
  return document.querySelector("#game-tooltip");
}

function showTooltip(cell) {
  if (cell.dataset.itemName) {
    const tooltip = createTooltipElement();
    
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);
    
    const item = gameState[row][col];
    
    const tooltipImgPath = TOOLTIP_FOLDER + item.tooltipImg;
    
    tooltip.innerHTML = `
      <strong>${cell.dataset.itemName}</strong><br>
      <em>${cell.dataset.evolutionName}</em><br>
      <p>${cell.dataset.description || ""}</p>
      <img src="${tooltipImgPath}" alt="${cell.dataset.itemName}" style="max-width: 100%; margin-top: 8px;">
    `;
    
    const cellRect = cell.getBoundingClientRect();
    
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    tooltip.style.visibility = 'hidden';
    tooltip.style.display = 'block';
    const tooltipWidth = tooltip.offsetWidth;
    const tooltipHeight = tooltip.offsetHeight;
    
    let posX = cellRect.left + (cellRect.width / 2);
    let posY = cellRect.top;
    let transformValue = 'translate(-50%, -100%)';
    
    if (posY - tooltipHeight < 0) {
      posY = cellRect.bottom;
      transformValue = 'translate(-50%, 10px)';
    }
    
    if (posX - (tooltipWidth / 2) < 0) {
      posX = tooltipWidth / 2 + 10;
    } else if (posX + (tooltipWidth / 2) > windowWidth) {
      posX = windowWidth - (tooltipWidth / 2) - 10;
    }
    
    tooltip.style.left = `${posX}px`;
    tooltip.style.top = `${posY}px`;
    tooltip.style.transform = transformValue; 
    
    tooltip.style.visibility = 'visible';
  }
}

function hideTooltip() {
  const tooltip = document.querySelector("#game-tooltip");
  if (tooltip) {
    tooltip.style.display = "none";
  }
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function startCountdown(secondsLeft) {
  const timerElement = document.querySelector("#timer");

  function updateTimerDisplay() {
    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;
    timerElement.textContent = `Time Left: ${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;
  }

  updateTimerDisplay();

  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    secondsLeft--;
    updateTimerDisplay();

    if (secondsLeft <= 0) {
      clearInterval(timerInterval);
      clearInterval(autoSaveInterval);
      showGameOverScreen();
    }
  }, 1000);
}

function showGameOverScreen() {
  clearInterval(autoSaveInterval);
  
  document.querySelector("#gameScreen").classList.add("hidden");
  document.querySelector("#gameOverScreen").classList.remove("hidden");

  const gameOverScreen = document.querySelector("#gameOverScreen");
  
  if (!document.querySelector("#finalScore")) {
    const finalScoreDiv = document.createElement("div");
    finalScoreDiv.id = "finalScore";
    finalScoreDiv.className = "final-score";
    finalScoreDiv.innerHTML = `<span>Final Score: ${playerScore}</span>`;
    
    const restartBtn = document.querySelector("#restartGameBtn");
    gameOverScreen.insertBefore(finalScoreDiv, restartBtn);
  } else {
    document.querySelector("#finalScore span").textContent = `Final Score: ${playerScore}`;
  }

  displayLeaderboard();
  
  addLeaderboardManagementButtons();

  if (!document.querySelector("#backToStartBtn").hasAttribute("listenerAttached")) {
    document.querySelector("#backToStartBtn").addEventListener("click", () => {
      clearSavedGame();
      window.location.reload();
    });
    document.querySelector("#backToStartBtn").setAttribute("listenerAttached", "true");
  }

  if (!document.querySelector("#restartGameBtn").hasAttribute("listenerAttached")) {
    document.querySelector("#restartGameBtn").addEventListener("click", () => {
      restartGame();
    });
    document.querySelector("#restartGameBtn").setAttribute("listenerAttached", "true");
  }
  
  saveGameState();
}

function restartGame() {
  document.querySelector("#gameOverScreen").classList.add("hidden");
  document.querySelector("#gameScreen").classList.remove("hidden");

  selectedCell = null;
  isProcessing = false;

  initializeScores();

  const { rows, cols } = currentLevel;
  createGameBoard(rows, cols);
  
  const difficulty = currentLevel.name.toLowerCase();
  
  filterEligibleEvolutions(difficulty);
  
  displayGameLeaderboard();
  
  populateGameBoard(difficulty);

  startCountdown(currentLevel.time * 60);
  setTimeout(() => {
    saveGameState();
  }, 1000);
}

const MAX_LEADERBOARD_ENTRIES = 5;

function initializeLeaderboard() {
  const leaderboard = localStorage.getItem('mergeJsLeaderboard');
  
  if (!leaderboard) {
    const defaultLeaderboard = {
      easy: [],
      medium: [],
      hard: []
    };
    
    localStorage.setItem('mergeJsLeaderboard', JSON.stringify(defaultLeaderboard));
    return defaultLeaderboard;
  }
  
  return JSON.parse(leaderboard);
}

function checkForHighScore(score, difficulty) {
  const leaderboard = initializeLeaderboard();
  const difficultyScores = leaderboard[difficulty];
  
  if (difficultyScores.length < MAX_LEADERBOARD_ENTRIES || score > difficultyScores[difficultyScores.length - 1]?.score) {
    return true;
  }
  
  return false;
}

function addScoreToLeaderboard(playerName, score, difficulty) {
  const leaderboard = initializeLeaderboard();
  const difficultyScores = leaderboard[difficulty];
  
  const newEntry = {
    playerName,
    score,
    date: new Date().toISOString()
  };
  
  difficultyScores.push(newEntry);
  
  difficultyScores.sort((a, b) => b.score - a.score);
  
  leaderboard[difficulty] = difficultyScores.slice(0, MAX_LEADERBOARD_ENTRIES);
  
  localStorage.setItem('mergeJsLeaderboard', JSON.stringify(leaderboard));
  

  if (document.querySelector("#gameScreen") && !document.querySelector("#gameScreen").classList.contains("hidden")) {
    displayGameLeaderboard();
  }
  
  return leaderboard[difficulty].findIndex(entry => entry.date === newEntry.date) + 1;
}

function displayLeaderboard() {
  const gameOverScreen = document.querySelector("#gameOverScreen");
  const currentDifficulty = currentLevel.name.toLowerCase();
  const playerNameElement = document.querySelector("#welcomeText");
  const playerName = playerNameElement.textContent.split('|')[0].replace('Player:', '').trim();
  
  const existingLeaderboard = document.querySelector("#leaderboardContainer");
  if (existingLeaderboard) {
    existingLeaderboard.remove();
  }
  
  const leaderboardContainer = document.createElement("div");
  leaderboardContainer.id = "leaderboardContainer";
  leaderboardContainer.className = "leaderboard-container";
  
  const leaderboardTitle = document.createElement("h3");
  leaderboardTitle.textContent = `Top Scores - ${currentLevel.name}`;
  leaderboardContainer.appendChild(leaderboardTitle);
  
  const leaderboard = initializeLeaderboard();
  const difficultyScores = leaderboard[currentDifficulty];
  
  const isHighScore = playerScore > 0 && checkForHighScore(playerScore, currentDifficulty);
  let playerPosition = -1;
  
  if (isHighScore) {
    playerPosition = addScoreToLeaderboard(playerName, playerScore, currentDifficulty);
    
    const highScoreNotification = document.createElement("div");
    highScoreNotification.className = "high-score-notification";
    highScoreNotification.textContent = `New High Score! Rank: #${playerPosition}`;
    leaderboardContainer.appendChild(highScoreNotification);
  }
  
  const leaderboardTable = document.createElement("table");
  leaderboardTable.className = "leaderboard-table";
  
  const tableHeader = document.createElement("thead");
  tableHeader.innerHTML = `
    <tr>
      <th>Rank</th>
      <th>Player</th>
      <th>Score</th>
      <th>Date</th>
    </tr>
  `;
  leaderboardTable.appendChild(tableHeader);
  
  const tableBody = document.createElement("tbody");
  
  const updatedLeaderboard = initializeLeaderboard();
  const updatedScores = updatedLeaderboard[currentDifficulty];
  
  if (updatedScores.length > 0) {
    updatedScores.forEach((entry, index) => {
      const row = document.createElement("tr");
      
      const isPlayerNewScore = isHighScore && index === playerPosition - 1;
      if (isPlayerNewScore) {
        row.className = "player-score-row";
      }
      
      const scoreDate = new Date(entry.date);
      const formattedDate = `${scoreDate.getMonth() + 1}/${scoreDate.getDate()}/${scoreDate.getFullYear()}`;
      
      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${entry.playerName}</td>
        <td>${entry.score}</td>
        <td>${formattedDate}</td>
      `;
      
      tableBody.appendChild(row);
    });
  } else {
    const emptyRow = document.createElement("tr");
    emptyRow.innerHTML = `
      <td colspan="4">No scores yet. Be the first!</td>
    `;
    tableBody.appendChild(emptyRow);
  }
  
  leaderboardTable.appendChild(tableBody);
  leaderboardContainer.appendChild(leaderboardTable);
  
  const restartBtn = document.querySelector("#restartGameBtn");
  gameOverScreen.insertBefore(leaderboardContainer, restartBtn);
}


function resetLeaderboard() {
  const defaultLeaderboard = {
    easy: [],
    medium: [],
    hard: []
  };
  
  localStorage.setItem('mergeJsLeaderboard', JSON.stringify(defaultLeaderboard));
  console.log("Leaderboard reset.");
  
  playerScore = 0;
  
  if (document.querySelector("#finalScore span")) {
    document.querySelector("#finalScore span").textContent = `Final Score: ${playerScore}`;
  }
  
  if (document.querySelector("#gameScreen") && !document.querySelector("#gameScreen").classList.contains("hidden")) {
    displayGameLeaderboard();
  }
}

function addLeaderboardManagementButtons() {
  const gameOverScreen = document.querySelector("#gameOverScreen");
  
  if (!document.querySelector("#clearLeaderboardBtn")) {
    const clearBtn = document.createElement("button");
    clearBtn.id = "clearLeaderboardBtn";
    clearBtn.textContent = "Clear Leaderboard";
    clearBtn.className = "danger-button";
    
    clearBtn.addEventListener("click", () => {
      resetLeaderboard();
      displayLeaderboard();
    });
    
    gameOverScreen.appendChild(clearBtn);
  }
}
function displayGameLeaderboard() {
  const gameControls = document.querySelector("#gameControls");
  const currentDifficulty = currentLevel.name.toLowerCase();
  
  const existingLeaderboard = document.querySelector("#inGameLeaderboard");
  if (existingLeaderboard) {
    existingLeaderboard.remove();
  }
  
  const leaderboardContainer = document.createElement("div");
  leaderboardContainer.id = "inGameLeaderboard";
  leaderboardContainer.className = "leaderboard-container in-game-leaderboard";
  
  const leaderboardTitle = document.createElement("h3");
  leaderboardTitle.textContent = `Top Scores - ${currentLevel.name}`;
  leaderboardContainer.appendChild(leaderboardTitle);
  
  const leaderboard = initializeLeaderboard();
  const difficultyScores = leaderboard[currentDifficulty];
  
  const leaderboardTable = document.createElement("table");
  leaderboardTable.className = "leaderboard-table";
  
  const tableHeader = document.createElement("thead");
  tableHeader.innerHTML = `
    <tr>
      <th>Rank</th>
      <th>Player</th>
      <th>Score</th>
    </tr>
  `;
  leaderboardTable.appendChild(tableHeader);
  
  const tableBody = document.createElement("tbody");
  
  if (difficultyScores.length > 0) {
    difficultyScores.forEach((entry, index) => {
      if (index < 3) {
        const row = document.createElement("tr");
        
        row.innerHTML = `
          <td>${index + 1}</td>
          <td>${entry.playerName}</td>
          <td>${entry.score}</td>
        `;
        
        tableBody.appendChild(row);
      }
    });
  } else {
    const emptyRow = document.createElement("tr");
    emptyRow.innerHTML = `
      <td colspan="3">No scores yet.</td>
    `;
    tableBody.appendChild(emptyRow);
  }
  
  leaderboardTable.appendChild(tableBody);
  leaderboardContainer.appendChild(leaderboardTable);
  
  gameControls.appendChild(leaderboardContainer);
}

function saveGameState() {
  if (!currentLevel) return;
  
  const timerText = document.querySelector("#timer").textContent;
  const timeMatch = timerText.match(/(\d+):(\d+)$/);
  let minutes = 0;
  let seconds = 0;
  
  if (timeMatch && timeMatch.length >= 3) {
    minutes = parseInt(timeMatch[1]);
    seconds = parseInt(timeMatch[2]);
  }
  
  const timeRemaining = minutes * 60 + seconds;
  
  const gameData = {
    playerName: document.querySelector("#welcomeText").textContent.split('|')[0].replace('Player:', '').trim(),
    difficulty: currentLevel.name.toLowerCase(),
    gameState: gameState,
    playerScore: playerScore,
    chainScores: chainScores,
    timeRemaining: timeRemaining
  };
  
  localStorage.setItem('mergeJsGameSave', JSON.stringify(gameData));
}

function loadGameState() {
  const savedData = localStorage.getItem('mergeJsGameSave');
  if (!savedData) return null;
  
  try {
    return JSON.parse(savedData);
  } catch(e) {
    console.error("Error parsing saved game data:", e);
    return null;
  }
}

function clearSavedGame() {
  localStorage.removeItem('mergeJsGameSave');
}

function restoreGameBoard(savedGameState) {
  if (!savedGameState || !Array.isArray(savedGameState)) {
    console.error("Invalid saved game state");
    return;
  }
  
  gameState = savedGameState;
  
  const rows = gameState.length;
  const cols = gameState[0].length;
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const item = gameState[row][col];
      if (item) {
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        
        if (cell) {
          cell.textContent = "";
          cell.innerHTML = "";
          
          const imgElement = document.createElement("img");
          imgElement.src = IMAGE_FOLDER + item.img;
          imgElement.alt = item.name;
          imgElement.title = item.name;
          imgElement.style.width = "100%";
          imgElement.style.height = "100%";
          cell.dataset.itemName = item.name;
          cell.dataset.evolutionName = item.evolutionName;
          cell.dataset.description = item.description;
          cell.dataset.tooltipImg = item.tooltipImg;
          cell.addEventListener("mouseenter", startTooltipTimer);
          cell.addEventListener("mouseleave", cancelTooltip);
          
          cell.appendChild(imgElement);
        }
      }
    }
  }
}

let autoSaveInterval;

function startAutoSave() {
  clearInterval(autoSaveInterval);
  autoSaveInterval = setInterval(() => {
    saveGameState();
  }, 3000);
}


function startCountdown(secondsLeft) {
  const timerElement = document.querySelector("#timer");

  function updateTimerDisplay() {
    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;
    timerElement.textContent = `Time Left: ${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;
  }

  updateTimerDisplay();

  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    secondsLeft--;
    updateTimerDisplay();

    if (secondsLeft <= 0) {
      clearInterval(timerInterval);
      clearInterval(autoSaveInterval);
      clearSavedGame();
      showGameOverScreen();
    }
  }, 1000);
}
function addContinueButton() {
  const startForm = document.querySelector("#startForm");
  const savedGame = loadGameState();
  
  if (savedGame && !document.querySelector("#continueGameBtn")) {
    const continueBtn = document.createElement("button");
    continueBtn.id = "continueGameBtn";
    continueBtn.className = "continue-button";
    continueBtn.textContent = `Continue ${savedGame.playerName}'s Game`;
    
    continueBtn.addEventListener("click", () => {
      document.querySelector("#startScreen").classList.add("hidden");
      document.querySelector("#gameScreen").classList.remove("hidden");
      
      initializeGame(null, null, savedGame);
    });
    
    startForm.parentNode.insertBefore(continueBtn, startForm);
  }
}