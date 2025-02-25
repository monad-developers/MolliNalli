# MolliNalli Workshop

## Overview

MolliNalli is a Monad-based game, inspired by the well-known board game Halli Galli.

Players must quickly determine whether the number of identical animals on three cards is a multiple of four. If it is, they press the Ring Bell; if not, they press Pass.

## Setup

First, we need to clone the current repository.
```bash
git clone https://github.com/monad-developers/MolliNalli.git
cd MolliNalli
```
Current default branch should be `starter`.

### Install dependencies
Because we are working on a Monorepo, we only need to execute `yarn install` to install dependencies.

```bash
yarn install
```

At this point, the basic dependencies have been installed. Now we can start writing the game logic.


## Game Writing

Because the original version of Germany's Heart Disease is a multiplayer game, we will also add multiplayer features and a leaderboard in the future. However, for now, we will not implement it.

So, we will build a contract to store the game logic. We will create a file `MolliNalli.sol` in the `packages/foundry/contracts` directory.

```bash
touch packages/foundry/contracts/MolliNalli.sol
```

And we will write a simple empty contract code. And we will set some game constants.

```solidity
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

contract MolliNalli {
    // Constant Setting
    uint8 public immutable MAX_PLAYERS = 4; // Max players
    uint256 public immutable CARD_MASK = type(uint32).max; // Card mask, later explain
    uint8 public immutable MAX_ACTION = 30; // Max action per player, later explain
}
```

Alright, the light-hearted part of the tutorial is over, we now come to the first goal, implementing a multi-player game join function.

### Multiplayer implementation

This feature should be implemented through several ways, first of all, we need to determine the game status, whether the game is in progress, whether it is waiting. Therefore, we need to have a status variable and prevent players from joining multiple times. This is already a basic version.

Also, remember some errors and events definition.

```solidity
// Previous code...

enum GameStage {
    NOT_START, // Not started
    PLAYING // playing
}

error ErrorStarted(); // Game started
error ErrorIsFull(); // Game full
error ErrorNotAdmin(); // Not admin
error ErrorNotPlayer(); // Not player
error ErrorJoined(); // Already joined
error ErrorEnded(); // Game ended
error ErrorNotPlaying(); // Not playing
error ErrorOutPlayer(); // Player out

contract MolliNalli {
    // ...
    struct Player {
        bool isReady; // is ready
        bool out; // is out
    }

    // Status variable setting
    GameStage public stage = GameStage.NOT_START;
    mapping(address => Player) public players;
    address[] public playersAddr;

    event GameStarted(address[] players, uint256 seed); // seed is the seed used for card generation later, to 
    event GameEnded(address indexed playerAddr, Player player, uint256 endTime);

    // Multiplayer join function implementation

    /**
     * Get player information
     * @param playerAddr Player address
     * @return Player Player information
     */
    function getPlayer(address playerAddr) public view returns (Player memory) {
        return players[playerAddr];
    }
    /**
     * Join game
     */
    function joinGame() external {
        // If the game has started, report an error
        if (stage != GameStage.NOT_START) {
            revert ErrorStarted();
        }
        // If more than the maximum number of players are in the game, report an error
        if (playersAddr.length >= MAX_PLAYERS) {
            revert ErrorIsFull();
        }

        // If the player has already joined, report an error
        if (players[msg.sender].isReady) {
            revert ErrorJoined();
        }
        // Set the game initial state
        players[msg.sender] =
            Player({ isReady: true, out: false });
        playersAddr.push(msg.sender);
    }

    /**
     * Start game
     */
    function startGame() external isPlayer {
        // If the game has started, report an error
        if (stage == GameStage.PLAYING) {
            revert ErrorStarted();
        }
        stage = GameStage.PLAYING;

        setup();
    }

    /**
     * Game startup initialization configuration
     */
    function setup() private {
        // Initialize player status
        for (uint256 i = 0; i < playersAddr.length; ++i) {
            address playerAddr = playersAddr[i];

            Player storage player = players[playerAddr];
            // TODO: generate seed
        }

        emit GameStarted(playersAddr, seed);
    }
    // Check if it's a player and not out of the game
    modifier isPlayer() {
        require(players[msg.sender].isReady, ErrorNotPlayer());
        require(players[msg.sender].out == false, ErrorOutPlayer());
        _;
    }

    // Check if it's in the game
    modifier isPlaying() {
        require(stage == GameStage.PLAYING, ErrorNotPlaying());
        _;
    }
}
```

Thus, we have completed the design of a multiplayer system, but the game logic has not yet been implemented. Therefore, this part of the logic still needs further refinement, and we will proceed accordingly.

### Core Game Logic

Initially, we mentioned that the game is a tribute to the German game "Halli Galli," so the game logic must determine whether there is a specified number of cards. In this game, we require players to judge three cards, each of which can have up to four mascots or none at all. We have a total of three mascots, and when the number of any one mascot among the three cards is a multiple of four, we consider that the Ring Bell must be pressed now; otherwise, the Pass is pressed.  
When the Ring Bell or Pass is pressed, we remove the first card and add a new one, iterating in this manner.  
Here, we have a very simple way of writing it, for example, we can define a `struct`, such as  

```solidity
struct Card {
  uint8 slot0;
  uint8 slot1;
  uint8 slot2;
  uint8 slot3;
}
```
Then, each slot is set with a type, for example, 0 means none, 1 is our mascot Chog, 2 is Moyaki, and 3 is Molandak.  
In this way, we can transform a uint256 random number into eight cards, and each time we display three cards, we judge whether the result of these three cards satisfies Ring or Pass.  

**However!**

Having 8 cards seems like it would end the game too quickly, so let's make a small optimization. We can observe that since the three mascots can be represented with just 2 bits, we can actually fit the data of one card's 4 slots into a single uint8. For example, `01 00 01 10` would represent `slot0:01, slot1:00, slot2:01, slot3:10`. Here, 00 indicates that there is no card.

In this way, a single uint256 seed can accommodate 32 cards!
```solidity
uint256 private constant TYPE_MASK = 0x03; // Binary: 11
uint256 private constant BITS_PER_TYPE = 2; // Binary digits
uint256 private constant ANIMAL_COUNT = 4; // One card can have up to 4 mascots.
uint256 private constant ANIMAL_TYPE = 3; // Types of Mascots
uint256 private constant BELL_TARGET = 4; // Target value

/**
 * Determine whether the three cards in the current turn satisfy Ring or Pass.
 */
function checkCard(uint256 value, uint8 turn) public pure returns (bool) {
    // Store the quantity of each mascot
    uint8[4] memory types;
    // Since the first card is removed in each round, the number of cards removed corresponds to the round number.
    value = value >> (turn * BITS_PER_TYPE * ANIMAL_COUNT);

    for(uint8 i = 0; i < 3 * ANIMAL_COUNT; ++i) {
        uint8 index = uint8(value & TYPE_MASK);
        value = value >> BITS_PER_TYPE;
        types[index] += 1;
    }
    
    for(uint8 i = 1; i <= ANIMAL_TYPE; ++i) {
        if (types[i] == BELL_TARGET) {
            return true;
        }
    }
    return false;
}
```

Now, we have completed the core game logic, and we only need to write the game logic in the function according to the game logic.

First, we need to add some fields to the `Player` structure.

```solidity
// Modify the Player structure
struct Player {
    bool isReady; // Ready or not
    bool out; // Out or not
    uint8 score; // Score
    uint8 actionCount; // Action count
    uint256 seed; // Seed for generating cards
}
/**
  * Users make decisions one action at a time, directly based on the seed to calculate the winner and the score.
  * @param pressed Whether the user presses the bell or not,true means ring the bell,false means pass
  */
function action(bool pressed) external isPlayer isPlaying {
    Player storage player = players[msg.sender];
    uint8 actionCount = player.actionCount;
    if (actionCount == MAX_ACTION) {
        revert ErrorEnded();
    }

    uint256 seed = player.seed;
    // Determine if the user's judgment is correct
    bool win = checkCard(seed,actionCount) == pressed;

    player.score += win ? 1 : 0;
    player.actionCount = ++actionCount;

    afterAction(player);
}

function afterAction(Player storage player) private {
    uint8 actionCount = player.actionCount;
    // End the game when the maximum number of operations is reached.
    if (actionCount == MAX_ACTION) {
        // addWin(); // TODO: create a leaderboard
        endGame();
    }

    // When the user makes three errors, we directly kick the player out.
    if (actionCount - player.score > 3) {
        player.out = true;
        emit GameEnded(msg.sender, player, block.timestamp);

        // Check if the player is the last one to leave.
        for (uint256 i = 0; i < playersAddr.length; ++i) {
            address playerAddr = playersAddr[i];
            if (players[playerAddr].out == false) {
                return;
            }
        }
        endGame();
    }
}

/**
 * Game ends
 */
function endGame() private {
    // stop game and reset and emit event
    Player[] memory playersTemp = new Player[](playersAddr.length);
    for (uint256 i = 0; i < playersAddr.length; ++i) {
        address playerAddr = playersAddr[i];
        Player memory player = players[playerAddr];
        playersTemp[i] = player;

        players[playerAddr].isReady = false;
        if (player.out == false) {
            emit GameEnded(playerAddr, player, block.timestamp);
        }
    }
    delete playersAddr;

    stage = GameStage.NOT_START;
}
```
So, where does our player's seed come from? We can set it in the setup function, assigning seeds to all players, which can be the same or different.

```solidity
function setup() private {
    uint256 seed = generateSeed();

    // Initialize player status
    for (uint256 i = 0; i < playersAddr.length; ++i) {
        address playerAddr = playersAddr[i];

        Player storage player = players[playerAddr];
        player.seed = seed;
    }

    emit GameStarted(playersAddr, seed);
}

/**
 * @dev Generate a random seed
 */
function generateSeed() private view returns (uint256) {
    // Use pseudo-random seed
    bytes memory b = abi.encodePacked(block.timestamp, block.number);
    for (uint256 i = 0; i < playersAddr.length; i++) {
        b = abi.encodePacked(b, playersAddr[i]);
    }
    return uint256(keccak256(b));
}
```

Don't forget to modify the assignment part of the player in the join function:
```solidity
players[msg.sender] = Player({
  isReady: true,
  out: false,
  score: 0,
  actionCount: 0,
  seed: 0
});
```

Now, our game is written! The complete file is as follows:
```solidity
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.27;

enum GameStage {
    NOT_START,
    PLAYING 
}

error ErrorStarted(); 
error ErrorIsFull(); 
error ErrorNotAdmin(); 
error ErrorNotPlayer(); 
error ErrorJoined(); 
error ErrorEnded(); 
error ErrorNotPlaying(); 
error ErrorOutPlayer(); 

contract MolliNalli {
    uint8 public immutable MAX_PLAYERS = 4; 
    uint256 public immutable CARD_MASK = type(uint32).max; 
    uint8 public immutable MAX_ACTION = 30; 

    uint256 private constant TYPE_MASK = 0x03; 
    uint256 private constant BITS_PER_TYPE = 2; 
    uint256 private constant ANIMAL_COUNT = 4; 
    uint256 private constant ANIMAL_TYPE = 3; 
    uint256 private constant BELL_TARGET = 4; 

    struct Player {
        bool isReady; 
        bool out; 
        uint8 score; 
        uint8 actionCount; 
        uint256 seed; 
    }

    GameStage public stage = GameStage.NOT_START;
    mapping(address => Player) public players;
    address[] public playersAddr;

    event GameStarted(address[] players, uint256 seed); 
    event GameEnded(address indexed playerAddr, Player player, uint256 endTime);

    function getPlayer(address playerAddr) public view returns (Player memory) {
        return players[playerAddr];
    }

    function joinGame() external {
        if (stage != GameStage.NOT_START) {
            revert ErrorStarted();
        }
        if (playersAddr.length >= MAX_PLAYERS) {
            revert ErrorIsFull();
        }
        if (players[msg.sender].isReady) {
            revert ErrorJoined();
        }
        players[msg.sender] = Player({ isReady: true, out: false, score: 0, actionCount: 0, seed: 0 });
        playersAddr.push(msg.sender);
    }

    function startGame() external isPlayer {
        if (stage == GameStage.PLAYING) {
            revert ErrorStarted();
        }
        stage = GameStage.PLAYING;

        setup();
    }

    function action(bool pressed) external isPlayer isPlaying {
        Player storage player = players[msg.sender];
        uint8 actionCount = player.actionCount;
        if (actionCount == MAX_ACTION) {
            revert ErrorEnded();
        }

        uint256 seed = player.seed;
        bool win = checkCard(seed, actionCount) == pressed;

        player.score += win ? 1 : 0;
        player.actionCount = ++actionCount;

        afterAction(player);
    }

    function afterAction(Player storage player) private {
        uint8 actionCount = player.actionCount;
        if (actionCount == MAX_ACTION) {
            endGame();
        }

        if (actionCount - player.score > 3) {
            player.out = true;
            emit GameEnded(msg.sender, player, block.timestamp);

            for (uint256 i = 0; i < playersAddr.length; ++i) {
                address playerAddr = playersAddr[i];
                if (players[playerAddr].out == false) {
                    return;
                }
            }
            endGame();
        }
    }

    function endGame() private {
        // stop game and reset and emit event
        Player[] memory playersTemp = new Player[](playersAddr.length);
        for (uint256 i = 0; i < playersAddr.length; ++i) {
            address playerAddr = playersAddr[i];
            Player memory player = players[playerAddr];
            playersTemp[i] = player;

            players[playerAddr].isReady = false;
            if (player.out == false) {
                emit GameEnded(playerAddr, player, block.timestamp);
            }
        }
        delete playersAddr;

        stage = GameStage.NOT_START;
    }

    function setup() private {
        uint256 seed = generateSeed();

        for (uint256 i = 0; i < playersAddr.length; ++i) {
            address playerAddr = playersAddr[i];

            Player storage player = players[playerAddr];
            player.seed = seed;
        }

        emit GameStarted(playersAddr, seed);
    }

    function generateSeed() private view returns (uint256) {
        bytes memory b = abi.encodePacked(block.timestamp, block.number);
        for (uint256 i = 0; i < playersAddr.length; i++) {
            b = abi.encodePacked(b, playersAddr[i]);
        }
        return uint256(keccak256(b));
    }

    function checkCard(uint256 value, uint8 turn) public pure returns (bool) {
        uint8[4] memory types;
        value = value >> (turn * BITS_PER_TYPE * ANIMAL_COUNT);

        for (uint8 i = 0; i < 3 * ANIMAL_COUNT; ++i) {
            uint8 index = uint8(value & TYPE_MASK);
            value = value >> BITS_PER_TYPE;
            types[index] += 1;
        }

        for (uint8 i = 1; i <= ANIMAL_TYPE; ++i) {
            if (types[i] == BELL_TARGET) {
                return true;
            }
        }
        return false;
    }

    modifier isPlayer() {
        require(players[msg.sender].isReady, ErrorNotPlayer());
        require(players[msg.sender].out == false, ErrorOutPlayer());
        _;
    }

        _;
    }
}
```
## Attempting to Deploy the Contract

At this point, we can use the account control system that comes with ScaffoldEth to deploy the contract.

If you haven't used ScaffoldEth before, you'll need to execute the account initialization command first.
```bash
yarn account:generate
```

Then modify `ETH_KEYSTORE_ACCOUNT` in `/packages/foundry/.env` to `scaffold-eth-custom` (if it doesn't exist, you can copy it from .env.example).

### Setting up the Network
Before this, we need to set up the network information, starting with the Foundry's network information.

```toml
# packages/foundry/foundry.toml
# In [rpc_endpoints] below, add
monadTestnet= "https://testnet-rpc.monad.xyz"
```

Then we need to set up the network information in the front end. We first modify the `packages/nextjs/scaffold.config.ts` file.
```bash
touch packages/nextjs/utils/scaffold-eth/customChains.ts
```
And open the file to edit.
```typescript
import { defineChain } from "viem";

// monad testnet chain
export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "TMON", symbol: "TMON", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://testnet-rpc.monad.xyz"],
    },
  },
  blockExplorers: {
    default: {
      name: "Monad Explorer",
      url: "https://testnet.monadexplorer.com/",
    },
  },
});
```

Then modify `packages/nextjs/scaffold.config.ts`
```typescript
//   targetNetworks: [chains.foundry], to
targetNetworks: [monadTestnet],
```

At this point, the network environment is ready. Execute the following commands to deploy the code. Before deployment, please ensure that your address has sufficient funds.

You can use `yarn account` to view your address and the balance on it. Note that if you have set it up correctly, your result will definitely include a string like `-- monadTestnet -- 📡`.

When you confirm that there is enough balance in the address, please execute
```bash
yarn deploy --network monadTestnet
```
You should get something like this.
```bash
## Setting up 1 EVM.

==========================

Chain ****

Estimated gas price: 52 gwei

Estimated total gas used for script: 995532

Estimated amount required: 0.051767664 ETH

==========================

✅  [Success] Hash: ******
Contract Address: ****
Block: 2381846
Paid: 0.0382897 ETH (765794 gas * 50 gwei)

✅ Sequence #1 on 20143 | Total Paid: 0.0382897 ETH (765794 gas * avg 50 gwei)
                                                                                                                                                                

==========================

ONCHAIN EXECUTION COMPLETE & SUCCESSFUL.

Transactions saved to: ***/20143/run-latest.json

Sensitive values saved to: ***/20143/run-latest.json

node scripts-js/generateTsAbis.js
📝 Updated TypeScript contract definition file on ../nextjs/contracts/deployedContracts.ts
```

Thus, our contract code deployment is complete.

## Building the Frontend

At this point, we can proceed to build the frontend code. In the frontend code, we will omit all non-essential content and focus solely on the code that interacts with the blockchain. Thanks to the built-in functions provided by viem and scaffold, we can easily accomplish this step.

First, in this game, we need to construct the read code that retrieves the state of the multiplayer game and ensures it supports reconnection in case of disconnection. Therefore, each time we join, we need to first obtain an overall state so that the program can determine whether the game has not yet started or has already begun.

Thus, we need to insert the following code, which is the part that directly reads the state variables from the contract. As you can see, we are retrieving a constant, a variable, and a function call value.
```typescript
// packages/nextjs/app/game/page.tsx 
// TODO: Contract state initialization
const { data, isFetched, error } = useReadContracts({
  contracts: [
    {
      ...deployedContract,
      functionName: "MAX_ACTION",
    },
    {
      ...deployedContract,
      functionName: "stage",
    },
    {
      ...deployedContract,
      functionName: "getPlayer",
      args: [address],
    },
  ],
});
```

Now that we have the values in the initial state, we need to move into the core logic of the game. At this node, we need to monitor changes in the player and listen for game events, such as the event signaling the start of the game and the event indicating the end of the game.

So we will construct two Hooks to help us accomplish this function, one is `useEndInfo`, and the other is `useStart`.
```typescript
// packages/nextjs/hooks/game/hooks.ts

// Read the game end event on the chain
// Use filters to specify only the events where the current player ends the game
// useScaffoldEventHistory is essentially a wrapped getLogs

const { data } = useScaffoldEventHistory({
  enabled: !!blockNumber,
  contractName: "MolliNalli",
  eventName: "GameEnded",
  fromBlock: blockNumber || 0n,
  filters: { playerAddr: address },
  watch: true,
});

// Read on-chain game start Event
const { data } = useScaffoldEventHistory({
  enabled: !!blockNumber,
  contractName: "MolliNalli",
  eventName: "GameStarted",
  fromBlock: blockNumber || 0n,
  watch: true,
});
```
We also have a main logic Hook, `useGameLogic`, which contains three Actions for invoking contract execution, and we need to refine it further.

```typescript
const joinGame = useCallback(async () => {
  writeContractAsync({
    functionName: "joinGame",
  });
}, [writeContractAsync]);

const startGame = useCallback(async () => {
  writeContractAsync({
    functionName: "startGame",
  });
}, [writeContractAsync]);

const action = useCallback(
  async (bell: boolean, localNonce: number) => {
    return writeContract({
      functionName: "action",
      args: [bell],
      nonce: localNonce,
      maxFeePerGas: parseGwei("60"),
      gas: 163560n,
    });
  },
  [writeContract],
);
```

When we listen to the GameStarted event, we can know when the game starts, and when the game starts, we need to calculate the cards. About the card calculation step, I have already made the functions, so it does not need to worry about it. At this time, we only need to call the action after clicking the Ring Bell or Pass button.

```typescript
// packages/nextjs/app/game/page.tsx 
// TODO: Build action to handle user decisions
const action = async (bell: boolean) => {
  triggerAction(bell, localNonce);
  setLocalNonce(nonce => nonce + 1);
  setSeedInfo(seedInfo => {
    if (!seedInfo) return null;
    const shouldBell = checkCard(seedInfo.seed, seedInfo.actionCount);
    const result = {
      ...seedInfo,
      actionCount: seedInfo.actionCount + 1,
      score: seedInfo.score + (shouldBell == bell ? 1 : 0),
    };
    if (result.actionCount - result.score > 3) {
      setGameStage(GameStage.WAITING_END);
    }
    return result;
  });
  notification.success("✅ Transaction send success!");
}
```

At this time, the front-end part is completed, and we can deploy it to Monad Testnet for testing.

### Deploy the command
After deployment, simply enter `yarn start` to start the frontend.
