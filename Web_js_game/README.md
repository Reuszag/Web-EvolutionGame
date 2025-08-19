- Displaying the Game Board – When the game starts, the game screen appears, generating a board of selectable size (4x4, 6x6, 8x8).
- Random Starting Technologies – At the start of the game, 4, 6, or 8 random level 1 technologies are placed on the board.
- Tooltip System – Hovering over an element for 3 seconds displays a tooltip with the evolution chain and description.
- Generating New Technologies – The player can generate new level 1 technologies on the board (by clicking on an empty cell or the "DRAW" button).
- Merging Technologies – If two identical elements merge, a higher-level technology is created.


- Start Screen – The player can enter their name and choose a difficulty level.
- Game UI – The player's name, score, and the level's time limit are displayed.
- Game UI – The selected difficulty level determines the time limit, board size, and available evolution elements.
- [Scoring – Completing evolution chains adds points to the total score and the respective technology's score.
- Time Management – The time limit (10-15-20 minutes) decreases as the game progresses.
- Time Management – The game ends when the set time limit runs out.
- Game Over Screen – A popup appears at the end of the game displaying the results.
- Leaderboard – The final score is compared to the top scores for the selected difficulty level.
- Polished Appearance – The game has a visually appropriate design (grid layout, tooltip animations, icons).


- Step Animations – Merging technologies includes an animated transition.
- Weighted Random Generation – New technology generation takes difficulty level into account.
- Save Feature – The game continuously saves its state to localStorage. If a saved state exists when the page loads, it is restored; otherwise, a new game starts.

- Restart Option – The Game Over screen provides options to start a new game or restart with the same settings.
