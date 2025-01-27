// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

enum GameStage {
    NOT_START, // 未开始
    PLAYING // 游戏中

}

error ErrorStarted(); // 游戏已开始
error ErrorIsFull(); // 游戏已满
error ErrorNotAdmin(); // 非管理员
error ErrorNotPlayer(); // 非玩家
error ErrorJoined(); // 已加入
error ErrorEnded(); // 游戏已结束
error ErrorNotPlaying(); // 非游戏中状态
error ErrorOutPlayer(); // 玩家已经出局

contract MolliNalli {
    uint256 private constant TYPE_MASK = 0x03; // Binary: 11
    uint256 private constant BITS_PER_TYPE = 2; // 二进制位数
    uint256 private constant ANIMAL_COUNT = 4; // 一张牌上最多4个吉祥物
    uint256 private constant ANIMAL_TYPE = 3; // 吉祥物种类
    uint256 private constant BELL_TARGET = 4; // 目标值
    uint8 public immutable MAX_PLAYERS = 4; // 最多4人
    uint256 public immutable CARD_MASK = type(uint32).max; // 卡牌掩码，稍后解释
    uint8 public immutable MAX_ACTION = 30; // 每个玩家最多30轮

    struct Player {
        bool isReady; // 是否准备
        bool out; // 出局
        uint8 score; // 分数
        uint8 actionCount; // 操作次数
        uint256 seed; // 牌的生成种子
    }

    // 状态变量设置
    GameStage public stage = GameStage.NOT_START;
    mapping(address => Player) public players;
    address[] public playersAddr;

    event GameStarted(address[] players, uint256 seed); // seed是我们游戏中生成牌的种子，用于后续的牌的生成
    event GameEnded(address indexed playerAddr, Player player, uint256 endTime);

    // 多人游戏加入函数实现
    function getPlayer(address playerAddr) public view returns (Player memory) {
        return players[playerAddr];
    }

    /**
     * 加入游戏
     */
    function joinGame() external {
        // 如果游戏已经开始则报错
        if (stage != GameStage.NOT_START) {
            revert ErrorStarted();
        }
        // 超过最大玩家则报错
        if (playersAddr.length >= MAX_PLAYERS) {
            revert ErrorIsFull();
        }

        // 如果玩家已经加入则报错
        if (players[msg.sender].isReady) {
            revert ErrorJoined();
        }
        // 设置游戏初始状态
        players[msg.sender] = Player({
          isReady: true,
          out: false,
          score: 0,
          actionCount: 0,
          seed: 0
        });
        playersAddr.push(msg.sender);
    }

    /**
     * 启动游戏
     */
    function startGame() external isPlayer {
        // 如果游戏已经开始则报错
        if (stage == GameStage.PLAYING) {
            revert ErrorStarted();
        }
        stage = GameStage.PLAYING;

        setup();
    }

    /**
     * 游戏启动的初始化配置
     */
    function setup() private {
        uint256 seed = generateSeed();

        // 初始化玩家状态
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
        // 使用伪随机生成种子
        bytes memory b = abi.encodePacked(block.timestamp, block.number);
        for (uint256 i = 0; i < playersAddr.length; i++) {
            b = abi.encodePacked(b, playersAddr[i]);
        }
        return uint256(keccak256(b));
    }
    // 判断是否是玩家，并且没有出局

    modifier isPlayer() {
        require(players[msg.sender].isReady, ErrorNotPlayer());
        require(players[msg.sender].out == false, ErrorOutPlayer());
        _;
    }

    // 判断是否在游戏中
    modifier isPlaying() {
        require(stage == GameStage.PLAYING, ErrorNotPlaying());
        _;
    }
    /**
     * 判断当前turn下的三张牌是否满足Ring或者Pass
     */

    function checkCard(uint256 value, uint8 turn) public pure returns (bool) {
        // 储存每个吉祥物的数量
        uint8[4] memory types;
        // 因为每轮要移除第一张牌，所以移除相应轮次的牌数
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

    /**
     * 用户每次决策都是一个action，直接根据seed来计算输赢然后积分。
     * @param pressed 是否拍下bell,true为ring bell,false为pass
     */
    function action(bool pressed) external isPlayer isPlaying {
        Player storage player = players[msg.sender];
        uint8 actionCount = player.actionCount;
        if (actionCount == MAX_ACTION) {
            revert ErrorEnded();
        }

        uint256 seed = player.seed;
        // 判断用户的判断是否正确
        bool win = checkCard(seed, actionCount) == pressed;

        player.score += win ? 1 : 0;
        player.actionCount = ++actionCount;

        afterAction(player);
    }

    function afterAction(Player storage player) private {
        uint8 actionCount = player.actionCount;
        // 当达到最大操作次数时结束游戏
        if (actionCount == MAX_ACTION) {
            // addWin(); // TODO: create a leaderboard
            endGame();
        }

        // 当错误三次时，我们直接淘汰玩家
        if (actionCount - player.score > 3) {
            player.out = true;
            emit GameEnded(msg.sender, player, block.timestamp);

            // 检查是否达到游戏结束条件，比如当前玩家已经是最后一个出局的了，此时就可以判断是否能结束游戏
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

        stage = GameStage.NOT_START;
    }
}
