// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

// TODO: 修改MolliNalli Game的逻辑，整个游戏改成自己快速点击抽牌，然后等到条件满足的时候可以点击Bell！完美的Click Game!
// 比如一次每个人发非常多的牌，然后使用类似滑动窗口的模式滑动
import "./lib/CardTypeLib.sol";

error ErrorStarted();
error ErrorIsFull();
error ErrorNotAdmin();
error ErrorNotPlayer();
error ErrorJoined();
error ErrorEnded();
error ErrorNotPlaying();
error ErrorOutPlayer();

enum CardType {
    None,
    Chog,
    Moyaki,
    Molandak
}

enum GameStage {
    NOT_START,
    PLAYING,
    ENDED
}

contract MolliNalli {
    using CardTypeLib for uint256;

    uint8 public immutable MAX_PLAYERS = 4;
    uint256 public immutable CARD_MASK = type(uint32).max;
    uint8 public immutable MAX_ACTION_PER_ROUND = 6;
    uint8 public immutable MAX_ACTION = MAX_ACTION_PER_ROUND * 4;

    struct Player {
        bool isReady;
        bool out; // 出局
        uint8 score;
        uint8 actionCount;
        uint8 turn;
        uint48 startTime;
        uint256 seed;
    }

    /**
     * @dev The stage of the game
     * 0: Not started, wait join
     * 1: Started
     * 2: ended
     */
    uint8 public stage;
    mapping(address => Player) public players;
    address[] public playersAddr;

    struct Leaderboard {
        address playerAddr;
        uint96 score;
    }

    mapping(address => uint96) public leaderboardValue;
    Leaderboard[20] public leaderboardRank;

    /**
     * @dev Card seed
     * Can storage the card information
     * There have 3 Type animal in the card and 1 ~ 4 number animal in the card
     * Asset the animal is chog,moyaki,molandak
     * So one card is 4 * 2 = 8 bit like |00|01|10|11| means pos0: zero, pos1: type1, pos2: type2, pos3: type3
     * One time draw 4 card so 32 bit will be one card means uint256 will have 8 card
     * every time only show 4 card
     */
    event GameStarted(address[] players, uint256 seed);
    event GameEnded(address indexed playerAddr, Player player, uint256 endTime);
    event UpdateSeed(address indexed player, uint256 seed);

    function getPlayer(address player) public view returns (Player memory) {
        return players[player];
    }

    /**
     * 用户每次决策都是一个action，直接根据seed来计算输赢然后积分。
     * @param pressed 是否拍下bell
     */
    function action(bool pressed) external isPlayer isPlaying {
        Player storage player = players[msg.sender];
        uint8 actionCount = player.actionCount;
        if (actionCount == MAX_ACTION) {
            revert ErrorEnded();
        }

        uint256 seed = player.seed;
        bool win = seed.checkThreeCardIsBell(player.turn) == pressed;

        player.score += win ? 1 : 0;
        player.actionCount = ++actionCount;
        player.turn += 1;

        afterAction(player);
    }

    function afterAction(Player storage player) private {
        uint8 actionCount = player.actionCount;
        if (actionCount == MAX_ACTION) {
            stage = uint8(GameStage.ENDED);
            addWin();
            endGame();
        }
        if (actionCount % MAX_ACTION_PER_ROUND == 0) {
            // 更新seed
            player.seed = uint256(keccak256(abi.encode(player.seed)));
            player.turn = 0;
            emit UpdateSeed(msg.sender, player.seed);
        }

        // 只能错三次
        if (actionCount - player.score > 3) {
            player.out = true;
            emit GameEnded(msg.sender, player, block.timestamp);

            // 检查是否达到游戏结束条件
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
     * 游戏结束结算
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

        stage = uint8(GameStage.NOT_START);
    }

    function addWin() private{
      // add win player to leaderboard
      leaderboardValue[msg.sender] += 1;
      uint96 winCount = leaderboardValue[msg.sender];
      // sort leaderboard by score
      uint96 min = type(uint96).max;
      uint minIndex = 0;
      for (uint256 i = 0; i < leaderboardRank.length; ++i) {
        Leaderboard storage leaderboard = leaderboardRank[i];
        if (leaderboard.score < min) {
          min = leaderboard.score;
          minIndex = i;
        }
        if(min == 0){
          break;
        }
      }
      
      if (winCount > min) {
        Leaderboard storage leaderboard = leaderboardRank[minIndex];
        leaderboard.playerAddr = msg.sender;
        leaderboard.score = winCount;
      }
    }

    /**
     * @dev Join the game
     */
    function joinGame() external {
        if (stage != 0) {
            revert ErrorStarted();
        }
        if (playersAddr.length >= MAX_PLAYERS) {
            revert ErrorIsFull();
        }
        if (players[msg.sender].isReady) {
            revert ErrorJoined();
        }
        players[msg.sender] =
            Player({ score: 0, seed: 0, isReady: true, actionCount: 0, startTime: 0, turn: 0, out: false });
        playersAddr.push(msg.sender);
    }

    /**
     * @dev Start the game
     */
    function startGame() external isPlayer {
        if (stage == uint8(GameStage.PLAYING)) {
            revert ErrorStarted();
        }
        stage = 1;

        setup();
    }

    /**
     * 游戏启动
     */
    function setup() private {
        uint256 seed = generateSeed();

        for (uint256 i = 0; i < playersAddr.length; ++i) {
            address playerAddr = playersAddr[i];

            Player storage player = players[playerAddr];
            player.seed = seed;
            player.startTime = uint48(block.timestamp);
            player.isReady = true;
        }

        emit GameStarted(playersAddr, seed);
    }

    /**
     * @dev Generate a random seed
     */
    function generateSeed() private view returns (uint256) {
        bytes memory b = abi.encodePacked(block.timestamp, block.number);
        for (uint256 i = 0; i < playersAddr.length; i++) {
            b = abi.encodePacked(b, playersAddr[i]);
        }
        return uint256(keccak256(b));
    }

    modifier isPlayer() {
        require(players[msg.sender].isReady, ErrorNotPlayer());
        require(players[msg.sender].out == false, ErrorOutPlayer());
        _;
    }

    modifier isPlaying() {
        require(stage == uint8(GameStage.PLAYING) && stage != uint8(GameStage.ENDED), ErrorNotPlaying());
        _;
    }
}
