const API = "https://minesweeper-j1d6.onrender.com";

let token = localStorage.getItem("token") || ""; //if we already have an account here we do that if not we just dont 
let account = null;
let currentRoom = null;
let pollInterval = null; //multiplayer thing. ill have to double check on that later
let selectedSkin = "flag_red";

const currentPlayerSpan = document.getElementById("currentPlayer"); //getters, sorted by length. i was bored.
const difficultySelect = document.getElementById("difficulty");
const leaderboardBody = document.getElementById("leaderboardBody");
const gameOverOverlay = document.getElementById("gameOverOverlay");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const createRoomBtn = document.getElementById("createRoomBtn");
const roomCodeInput = document.getElementById("roomCode");
const turnsLeftSpan = document.getElementById("turnsLeft");
const gameOverTitle = document.getElementById("gameOverTitle");
const skinSelector = document.getElementById("skinSelector");
const startGameBtn = document.getElementById("startGameBtn");
const leaveRoomBtn = document.getElementById("leaveRoomBtn");
const leaveGameBtn = document.getElementById("leaveGameBtn");
const registerBtn = document.getElementById("registerBtn");
const joinRoomBtn = document.getElementById("joinRoomBtn");
const skipTurnBtn = document.getElementById("skipTurnBtn");
const authSection = document.getElementById("auth");
const menuSection = document.getElementById("menu");
const roomSection = document.getElementById("room");
const gameSection = document.getElementById("game");
const playerStats = document.getElementById("playerStats");
const gameOverMsg = document.getElementById("gameOverMsg");
const gameOverBtn = document.getElementById("gameOverBtn");
const roomIdSpan = document.getElementById("roomId");
const playerList = document.getElementById("playerList");
const playerName = document.getElementById("playerName");
const logoutBtn = document.getElementById("logoutBtn");
const loginBtn = document.getElementById("loginBtn");
const board = document.getElementById("board");

const skinList = ["🚩", "🏴‍☠️", "⭐"];
const tileSize = window.innerWidth < 601 ? 24 : 32; // smaller tiles for phone

loginBtn.addEventListener("click", login);
registerBtn.addEventListener("click", register);
logoutBtn.addEventListener("click", logout);
createRoomBtn.addEventListener("click", createRoom);
joinRoomBtn.addEventListener("click", joinRoom);
startGameBtn.addEventListener("click", startGame);
leaveRoomBtn.addEventListener("click", leaveRoom);
skipTurnBtn.addEventListener("click", skipTurn);
leaveGameBtn.addEventListener("click", leaveRoom);
gameOverBtn.addEventListener("click", closeGameOver);



function authHeaders() { //just to avoid writing the same things over and over at the fetches
    return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
    };
}

function saveToken() { //locally saves account
    localStorage.setItem("token", token);
}

function clearToken() { // unsaves account. wow.
    token = "";
    localStorage.removeItem("token");
}

function showError(error) {  //just shows whatever the user is doing wrong.
    alert(error);
}

function showSection(section) { //the menu is divided to sections right. just hides the unimportant ones. this code so polymorphism
    for (const s of [authSection, menuSection, roomSection, gameSection]) {
        s.style.display = "none";
    }
    if (section) section.style.display = "";
}

function startPolling() { //multiplayer thingy, basically fetches allll the data for the room every 2 seconds or so
    pollInterval = setInterval(async () => {
        await loadRoom(currentRoom.id);
    }, 2000); //2000ms
}

function stopPolling() { //just stops the fetching
    if (pollInterval) { 
        clearInterval(pollInterval);
        pollInterval = null;
    }
}


async function register() {
    try {
        const response = await fetch(`${API}/accounts/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username: usernameInput.value, //just sends the register credentials, if its valid we get registered
                password: passwordInput.value
            })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        token = data.token;
        account = data.account;
        saveToken(); //save account locally
        updateProfile(); // makes the profile
        loadLeaderboard(); // to uhhh add the new user to the leaderboard
        showSection(menuSection); //shows the menu to the user when logged in. they didnt need it before.
    } catch (err) {
        showError(err.message); //shows if something is wrong such as user existing, name too short, whatever
    }
}

async function login() {
    try {
        const response = await fetch(`${API}/accounts/login`, { 
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
            username: usernameInput.value, //if username and password match we get logged in
                password: passwordInput.value
            })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        token = data.token;
        account = data.account;
        saveToken();
        updateProfile(); //same as in registering really
        loadLeaderboard();
        showSection(menuSection);
    } catch (err) {
        showError(err.message);
    }
}

function logout() { //logs out. throws the user out of the rooms, pollings, to not waste server resources. back to the login screen. moves the account out of localstorage
    clearToken();
    account = null;
    currentRoom = null;
stopPolling();
    showSection(authSection);
}

async function loadProfile() {
    try {
        const response = await fetch(`${API}/accounts/me`, {
            headers: authHeaders()
        });
        if (!response.ok) {
            clearToken(); //token expired or invalid, back to login
            showSection(authSection);
            return;
        }
        account = await response.json();
        updateProfile();  //just to make all the data up to date
        showSection(menuSection); //back to the menu with all the options
    } catch (err) {
        console.error(err);
    }
}

function updateProfile() {
    if (!account) return; //if not logged in, dont. or or or if the token expires because apparently its a good practice to do this
    showSkinSelector();
    playerName.textContent = account.username; 
    playerStats.textContent = `Moves: ${account.totalMoves} | Wins: ${account.wins}`; //just shows the stats
}

async function checkAndUnlockCosmetics() {
    const thresholds = { flag_skull: 50, flag_star: 200 }; //how many moves each skin needs
    for (const [id, required] of Object.entries(thresholds)) {
     if (account.unlockedCosmetics.includes(id)) continue; //already unlocked, skip
      if (account.totalMoves < required) continue; //not enough moves yet, skip
        try {
            await fetch(`${API}/accounts/me/cosmetics/${id}/unlock`, {
                method: "POST",
                headers: authHeaders()
            });
        } catch (err) {
            console.error(err); //try catches. try catches everywhere. helps so much debugging
        }
    }
}

function showSkinSelector() {
    skinSelector.innerHTML = "";
    
    const flagSkins = {
        flag_red: "🚩",
        flag_skull: "🏴‍☠️",
        flag_star: "⭐"
    };

    Object.entries(flagSkins).forEach(([id, emoji]) => {
        if (!account.unlockedCosmetics.includes(id)) return; //only show unlocked ones
        const btn = document.createElement("button");
       btn.textContent = emoji;
        btn.onclick = () => {
            selectedSkin = id; //============================================================================================================================================================
            showSkinSelector(); // rerender to show which is selected
        };
        if (selectedSkin === id) btn.classList.add("selected");
        skinSelector.appendChild(btn);
    });
}

function getFlagSkin() { //im sorry but this just is a good emoji use case
    const skin = account.unlockedCosmetics?.includes("flag_skull") && selectedSkin === "flag_skull" ? "🏴‍☠️"
               : account.unlockedCosmetics?.includes("flag_star") && selectedSkin === "flag_star" ? "⭐"
               : "🚩";
    return skin;
}


async function createRoom() {
    try {
        const response = await fetch(`${API}/rooms`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({
                difficulty: difficultySelect.value.toLowerCase(), //api expects lowercase: easy medium hard
                movesPerTurn: parseInt(document.getElementById("movesPerTurn").value)
            })
        });
        const data = await response.json();
      if (!response.ok) throw new Error(data.error);
        currentRoom = data; //the new room is fetched from the api
        showRoom
    (); //shows it to the person
        showSection(roomSection); //puts them into the room
        startPolling(); //starts checking for stuff, such as if others joined yet here.
    } catch (err) {
        showError(err.message);
    }
}

async function joinRoom() {
    try {
        const roomId = roomCodeInput.value
        const response = await fetch(`${API}/rooms/${roomId}/join`, {
            method: "POST",
            headers: authHeaders()
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
       currentRoom = data; 
        showRoom
    (); 
        showSection(roomSection); //puts you to the room section, hides the others. looks fancier than just letting the user have them all + them just being able to switch between skins midgame would be weird
        startPolling(); //
    } catch (err) {
        showError(err.message);
    }
}

async function loadRoom(roomId) { 
    try {
        const response = await fetch(`${API}/rooms/${roomId}`, {
            headers: authHeaders()
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        currentRoom = data;
        showRoom
    ();
        if (currentRoom.board) {
            showBoard(); //if there is a board just renders it
            showSection(gameSection);
        }
        if (currentRoom.status === "won" || currentRoom.status === "lost") {
            stopPolling(); //ends if game ended
           showGameOver(currentRoom.status); //lets the user know if they won or not
        }
    } catch (err) {
        console.error(err);
    }
}

async function startGame() { //really just starts the game and updates all the related stuff to let players know
    try {
        const response = await fetch(`${API}/rooms/${currentRoom.id}/start`, {
            method: "POST",
            headers: authHeaders()
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        currentRoom = data;
        showRoom
    ();
        showBoard();
        showSection(gameSection);
    } catch (err) {
        showError(err.message);
    }
}

async function leaveRoom() {
    if (!currentRoom) return;
    try {
        await fetch(`${API}/rooms/${currentRoom.id}/leave`, {
            method: "DELETE",
            headers: authHeaders()
        });
    } catch (err) {
        console.error(err);
    }
    currentRoom = null; //leaves room, cuts off polling, back to the menu
    stopPolling();
    checkAndUnlockCosmetics(); //check for newly earned skins
    loadProfile(); //reload profile so unlocked cosmetics show up
    loadLeaderboard();
}

async function skipTurn() {
    try {
        const response = await fetch(`${API}/rooms/${currentRoom.id}/skip`, {
            method: "POST",
        headers: authHeaders()
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        currentRoom = data;
        showRoom
    ();
        showBoard();
    } catch (err) {
        showError(err.message);
    }
}

async function revealTile(row, col) {
    await playMove("reveal", row, col);
}
async function flagTile(row, col) {
    await playMove("flag", row, col);
}

async function playMove(action, row, col) {
    try {
        const response = await fetch(`${API}/rooms/${currentRoom.id}/move`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({ action, row, col })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        currentRoom = data.room;
        showRoom
    ();
        showBoard();  //updates stuff for others to see and to check if the player won or not
   if (currentRoom.status === "won" || currentRoom.status === "lost") {
            stopPolling();
            showGameOver(currentRoom.status);
        }
    } catch (err) {
        showError(err.message);
    }
}

function showGameOver(status) {
    if (status === "won") {
        gameOverTitle.textContent = "You won!";
        gameOverMsg.textContent = "The board is clear.";
    } else { //just shows the user if they won or not when the game comes to an end
        gameOverTitle.textContent = "Game over.";
        gameOverMsg.textContent = "Someone hit a mine.";
        gameOverOverlay.style.display = "flex";
    }
}

async function closeGameOver() {
    gameOverOverlay.style.display = "none";
    currentRoom = null;
    checkAndUnlockCosmetics(); 
    loadProfile(); 
    loadLeaderboard();
}

async function loadLeaderboard() {
    try {
        const response = await fetch(`${API}/leaderboard`); //fetches already sorted leaderboard, just writes them out
        const data = await response.json();
        leaderboardBody.innerHTML = "";
        data.entries.forEach(player => {
        const row = document.createElement("tr");
            row.innerHTML = `
                <td>${player.username}</td>
                <td>${player.totalMoves}</td>
                <td>${player.wins}</td>`;
            leaderboardBody.appendChild(row);
        });
    } catch (err) {
        console.error(err);
    }
}


function showRoom() {
    if (!currentRoom) return;
    roomIdSpan.textContent = currentRoom.id;
    const currentPlayer = currentRoom.players.find(
        p => p.id === currentRoom.currentTurnPlayerId
    );
    currentPlayerSpan.textContent = currentPlayer?.username; //if there is a current player show their name
    turnsLeftSpan.textContent = currentRoom.movesLeftThisTurn;
    playerList.innerHTML = ""; //clear the list before redrawing so names dont stack up
    currentRoom.players.forEach(player => {
        const li = document.createElement("li");
        li.textContent = `${player.username} (${player.moves} moves)`;
        playerList.appendChild(li);
    });
}

function showBoard() {
    if (!currentRoom?.board) return; //if the current room (assuming it exists) doesnt have a board, dont render
    board.innerHTML = "";
    let rows = currentRoom.board.length;
    let cols = currentRoom.board[0].length;

board.style.gridTemplateColumns = `repeat(${cols}, ${tileSize}px)`;
    let gameOver = currentRoom.status === "won" || currentRoom.status === "lost";
    for (let row = 0; row < rows; row++) { 
        for (let col = 0; col < cols; col++) {
            const cell = currentRoom.board[row][col];
            const tile = document.createElement("div"); //just renders the board giving it looks based on if it has been revealed or not
            tile.classList.add("tile");
            tile.style.width = `${tileSize}px`;
            tile.style.height = `${tileSize}px`;
            if (cell.revealed) {
                tile.classList.add("revealed");
                if (cell.mine === true) {
                    tile.textContent = "💣";
                } else if (cell.adjacentMines > 0) {
                    tile.textContent = cell.adjacentMines;
                }
            }
            if (cell.flagged) {
                tile.textContent = getFlagSkin(); //if its any of the possible "flags"
            }
            if (!gameOver) {
                tile.addEventListener("click", () => revealTile(row, col));
                tile.addEventListener("contextmenu", e => {
                    e.preventDefault();
                    flagTile(row, col);
                });
            }
            board.appendChild(tile);
        }
    }
}


try {
    navigator.serviceWorker.register("/service-worker.js"); //service workerrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr
} catch (err)  {
    console.log(err)
}

async function initialize() { //shows the login, logs in if user saved on localstorage
    showSection(authSection);
 if (!token) return;
    loadProfile();
    loadLeaderboard();
}

initialize();