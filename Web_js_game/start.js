window.addEventListener("load", () => {
  const startForm = document.querySelector("#startForm");
  const playerNameInput = document.querySelector("#playerName");
  const difficultySelect = document.querySelector("#difficulty");
  const nameError = document.querySelector("#nameError");
  const startScreen = document.querySelector("#startScreen");
  const gameScreen = document.querySelector("#gameScreen");
  
  addContinueButton();
  
  startForm.addEventListener("submit", (event) => {
    event.preventDefault();
    
    const playerName = playerNameInput.value.trim();
    const difficulty = difficultySelect.value;
    
    if (!playerName) {
      nameError.classList.remove("hidden");
      return;
    } else {
      nameError.classList.add("hidden");
    }
    
    startScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
    
    clearSavedGame();
    if (typeof initializeGame === "function") {
      initializeGame(playerName, difficulty);
    }
  });
});
