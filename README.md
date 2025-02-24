# MolliNalli Workshop

## 总览

MolliNalli 是一个基于 Monad 的游戏，它的设计思路来源于知名桌游 德国心脏病。

玩家需要通过快速判断三张牌上的相同动物的数量是否为 4 的倍数，如果是，那么就按下 Ring Bell，如果不是，那么就按下 Pass

## 准备工作
首先我们需要clone当前仓库。
```bash
git clone https://github.com/monad-developers/MolliNalli.git
cd MolliNalli
```
当前默认分支应该为 `starter`。

### 安装依赖
因为当前是一个Monorepo，所以我们只需要执行 `yarn install` 即可。

```bash
yarn install
```
此时，基础的依赖已经安装完成。接下来可以开始编写游戏逻辑。

## 游戏编写

因为原版的德国心脏病是一个多人游戏，所以我们在设计的时候也会加上多人的功能，并且可以在未来添加排行榜这种功能。不过在这个版本中，我们先不实现。

因此，我们先构建一个合约，来存放游戏逻辑。我们在 `packages/foundry/contracts`下创建文件 `MolliNalli.sol`。

```bash
touch packages/foundry/contracts/MolliNalli.sol
```

并且简单的编写一个空的合约代码。并且我们设置一下游戏的各种常量。

```solidity
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

contract MolliNalli {
    // 常量设置
    uint8 public immutable MAX_PLAYERS = 4; // 最多4人
    uint256 public immutable CARD_MASK = type(uint32).max; // 卡牌掩码，稍后解释
    uint8 public immutable MAX_ACTION = 30; // 每个玩家最多30轮，稍后解释
}
```

好了，轻松愉快的部分结束了，我们现在来完成第一个目标，实现一个多人游戏加入功能。

### 多人游戏实现

这个功能应该通过几个方式实现，首先我们要可以判断游戏的状态，比如是否游戏中，是否等待中。因此我们需要有一个状态变量，并且还要防止玩家多次加入，因此我们也需要存储已经加入的玩家。这已经是一个最基础的版本。

对了，可别忘了一些错误的定义和事件的定义。

```solidity
// 之前的代码 ...

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
    // ...
    struct Player {
        bool isReady; // 是否准备
        bool out; // 是否出局
    }

    // 状态变量设置
    GameStage public stage = GameStage.NOT_START;
    mapping(address => Player) public players;
    address[] public playersAddr;

    event GameStarted(address[] players, uint256 seed); // seed是我们游戏中生成牌的种子，用于后续的牌的生成
    event GameEnded(address indexed playerAddr, Player player, uint256 endTime);

    // 多人游戏加入函数实现

    /**
     * 获取玩家信息
     * @param playerAddr 玩家地址
     * @return Player 玩家信息
     */
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
        players[msg.sender] =
            Player({ isReady: true, out: false });
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
        // 初始化玩家状态
        for (uint256 i = 0; i < playersAddr.length; ++i) {
            address playerAddr = playersAddr[i];

            Player storage player = players[playerAddr];
            // TODO: generate seed
        }

        emit GameStarted(playersAddr, seed);
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
}
```

这样我们一个多人系统就设计完成了，但是现在还没有实现游戏逻辑，因此这部分的逻辑还需要继续完善，我们往下走。

### 核心游戏逻辑
我们一开始说了游戏是一个致敬德国心脏病的游戏，因此游戏逻辑一定会判断是否有指定数量的卡，在这个游戏中，我们要求玩家需要对三张牌进行判断，每张牌最多会有4个吉祥物，或者一个也没有。我们总共有三种吉祥物，并且当三张牌中的吉祥物数量中任意一个的数量为4的倍数时，我们就认为现在必须按下Ring Bell，否则就按下Pass。

当按下Ring Bell或者Pass时，我们就会把第一张牌移除，然后加入一张新的牌，以此迭代。

在这个地方我们有一个非常简单的写法，比如我们可以定义一个`struct`，比如
```solidity
struct Card {
    uint8 slot0;
    uint8 slot1;
    uint8 slot2;
    uint8 slot3;
}
```
然后每一个slot上面通过一个类型来设定，比如0是没有，1是我们的吉祥物Chog，2是Moyaki，3是Molandak。

这样，我们就可以把一个uint256的随机数变成，8张牌，然后我们每次展示3张牌，并且判断这三张牌是否的结果是否满足Ring或者Pass。

**但是！**

8张牌好像会让游戏结束的很快，因此我们来做一点点小的优化，我们可以注意到，因为三个吉祥物刚好可以用2个位来表示，因此我们其实可以在一个uint8中就放下一张牌4个slot的数据。比如 `01 00 01 10` 表示为 `slot0:01,slot1:00,slot2:01,slot3:10`。而00表示的就是没有牌。

这样，我们一个uint256的seed就可以放下32张牌了！
```solidity
// 定义一些常量
uint256 private constant TYPE_MASK = 0x03; // Binary: 11
uint256 private constant BITS_PER_TYPE = 2; // 二进制位数
uint256 private constant ANIMAL_COUNT = 4; // 一张牌上最多4个吉祥物
uint256 private constant ANIMAL_TYPE = 3; // 吉祥物种类
uint256 private constant BELL_TARGET = 4; // 目标值

/**
 * 判断当前turn下的三张牌是否满足Ring或者Pass
 */
function checkCard(uint256 value, uint8 turn) public pure returns (bool) {
    // 储存每个吉祥物的数量
    uint8[4] memory types;
    // 因为每轮要移除第一张牌，所以移除相应轮次的牌数
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

此时我们已经完成了最核心的代码编写！接下来，我们只需要在函数中按照游戏逻辑调用即可。
不过，为了统计玩家的得分情况，我们需要给Player结构体添加一些字段。

```solidity
// 修改Player结构体
struct Player {
    bool isReady; // 是否准备
    bool out; // 出局
    uint8 score; // 分数
    uint8 actionCount; // 操作次数
    uint256 seed; // 牌的生成种子
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
    bool win = checkCard(seed,actionCount) == pressed;

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
```
那么，我们玩家的seed从哪来？ 我们可以在setup函数中设定，给所有玩家设定种子，可以一样，也可以不一样。

```solidity
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
```

别忘了修改join函数中，player的赋值部分：
```solidity
players[msg.sender] = Player({
  isReady: true,
  out: false,
  score: 0,
  actionCount: 0,
  seed: 0
});
```

此时我们的游戏已经编写完成！完整文件如下：
```solidity
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.27;

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
    // 常量设置
    uint8 public immutable MAX_PLAYERS = 4; // 最多4人
    uint256 public immutable CARD_MASK = type(uint32).max; // 卡牌掩码，稍后解释
    uint8 public immutable MAX_ACTION = 30; // 每个玩家最多30轮，稍后解释
        // 定义一些常量
    uint256 private constant TYPE_MASK = 0x03; // Binary: 11
    uint256 private constant BITS_PER_TYPE = 2; // 二进制位数
    uint256 private constant ANIMAL_COUNT = 4; // 一张牌上最多4个吉祥物
    uint256 private constant ANIMAL_TYPE = 3; // 吉祥物种类
    uint256 private constant BELL_TARGET = 4; // 目标值

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

    /**
     * 获取玩家信息
     * @param playerAddr 玩家地址
     * @return Player 玩家信息
     */
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
        players[msg.sender] = Player({ isReady: true, out: false, score: 0, actionCount: 0, seed: 0 });
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
}
```
## 尝试部署合约
此时我们就可以使用ScaffoldEth自带的账号控制系统来部署合约了。

如果你之前没有使用过ScaffoldEth，那么你需要先执部署账号初始化命令
```bash
yarn account:generate
```

然后修改`/packages/foundry/.env`中的`ETH_KEYSTORE_ACCOUNT`为`scaffold-eth-custom` （没有可以从.env.example复制）

### 设定网络
在此之前我们还需要设定网络信息，首先是Foundry的网络信息

```toml
# packages/foundry/foundry.toml
# 在 [rpc_endpoints] 下添加
monadDevnet= "https://rpc-devnet.monadinfra.com/rpc/3fe540e310bbb6ef0b9f16cd23073b0a"
```

然后我们修改前端的网络设置，进入目录 `packages/nextjs/utils/scaffold-eth`,新建一个文件为`customChains.ts`。
```bash
touch packages/nextjs/utils/scaffold-eth/customChains.ts
```
打开编辑
```typescript
import { defineChain } from "viem";

// monad devnet chain
export const monadDevnet = defineChain({
  id: 20143,
  name: "Monad Devnet",
  nativeCurrency: { name: "DMON", symbol: "DMON", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://rpc-devnet.monadinfra.com/rpc/3fe540e310bbb6ef0b9f16cd23073b0a"],
    },
  },
  blockExplorers: {
    default: {
      name: "Monad Explorer",
      url: "https://explorer.monad-devnet.devnet101.com/",
    },
  },
});
```

然后修改 `packages/nextjs/scaffold.config.ts`
```typescript
//   targetNetworks: [chains.foundry], 改成
targetNetworks: [monadDevnet],
```

此时，网络环境已经准备就绪，执行以下命令进行代码部署，部署之前，请保证你的地址中有资金。

你可以使用 `yarn account`查看你的地址和地址上的余额。注意，如果你设置正确了你的结果中一定会包含`-- monadDevnet -- 📡`这样的字符串。

当你确定地址中有足够余额的时候，请执行
```bash
yarn deploy --network monadDevnet
```
你应该得到类似这样的输出。
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

这样我们的合约代码就部署完成了。
## 构建前端
此刻我们可以构建一下前端代码，在前端代码中，我们会省略所有不重要的内容，只关注我们和链上交互的代码，得益于viem和scffold提供的内置函数，我们可以轻松的完成这一步。

首先，这个游戏中，我们需要构建的是获取多人游戏状态的读取代码，并且让他支持断线冲连的情况，因此我们每次加入时，需要先获取一个整体状态，以便程序可以判断当前游戏是还没有开始还是已经开始。

因此我们需要插入下面的代码，这个代码是直接从合约中读取状态变量的部分，可以看到的是我们获取了一个常量，一个变量，一个函数调用值。
```typescript
// packages/nextjs/app/game/page.tsx 
// TODO: 合约状态初始化
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

现在有了初始状态下的值，我们就需要进入游戏的核心逻辑部分，这个节点我们需要监听player的变化，以及监听游戏事件，比如监听游戏开始的事件，监听游戏结束的事件。

所以我们来构建两个Hook帮助我们完成这个功能，一个是`useEndInfo`，一个是`useStart`。
```typescript
// packages/nextjs/hooks/game/hooks.ts

// 读取链上游戏结束Event
// 通过filters来指定只获取当前player结束游戏的Event
// useScaffoldEventHistory 实际上是封装好的getLogs
const { data } = useScaffoldEventHistory({
  enabled: !!blockNumber,
  contractName: "MolliNalli",
  eventName: "GameEnded",
  fromBlock: blockNumber || 0n,
  filters: { playerAddr: address },
  watch: true,
});

// 读取链上游戏开始Event
const { data } = useScaffoldEventHistory({
  enabled: !!blockNumber,
  contractName: "MolliNalli",
  eventName: "GameStarted",
  fromBlock: blockNumber || 0n,
  watch: true,
});
```
我们还有一个主逻辑的Hook，`useGameLogic`，这里面包含的是三个用于调用合约执行的Action，我们需要完善一下。

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

当我们监听了GameStarted事件后，我们就可以知道游戏什么时候开始了，当游戏开始后，我们就需要进行牌的计算。关于拍的计算步骤我已经做好了函数，因此不需要操心，此时我们只需要在点击Ring Bell或者Pass按钮后调用action即可。

```typescript
// packages/nextjs/app/game/page.tsx 
// TODO: 构建action，用来处理用户的决策
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

此时我们前端部分已经完成，接下来我们可以将其部署到Monad Devnet进行测试。

### 执行部署命令
部署完成后，直接输入`yarn start`即可启动前端。
