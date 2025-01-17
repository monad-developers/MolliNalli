// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/MolliNalli.sol";

contract CardTypeLibTest is Test {
    using CardTypeLib for uint256;

    // 每个数字代表2位，从右到左读取
    // 第一张牌：[0,0,0,1] = 0x01
    // 第二张牌：[0,0,1,1] = 0x05
    // 第三张牌：[0,1,1,1] = 0x15
    uint256 constant TEST_VALUE_1 = 0x150501; // 总共6个type1，应该返回false

    // 第一张牌：[0,0,2,2] = 0x0A
    // 第二张牌：[0,2,2,0] = 0x28
    // 第三张牌：[2,0,0,0] = 0x80
    uint256 constant TEST_VALUE_2 = 0x80280A; // 总共5个type2，应该返回false

    // 第一张牌：[3,3,3,3] = 0xFF
    // 第二张牌：[0,0,0,0] = 0x00
    // 第三张牌：[0,0,0,0] = 0x00
    uint256 constant TEST_VALUE_3 = 0x0000FF; // 总共4个type3，应该返回true

    // 第一张牌：[1,1,1,0] = 0x54
    // 第二张牌：[1,1,0,0] = 0x50
    // 第三张牌：[1,0,0,0] = 0x40
    uint256 constant TEST_VALUE_4 = 0x405054; // 总共6个type1，不是4个，应该返回false

    // 第一张牌：[0,0,0,0] = 0x00
    // 第二张牌：[0,0,0,0] = 0x00
    // 第三张牌：[0,0,0,0] = 0x00
    uint256 constant TEST_VALUE_5 = 0x000000; // 全是0，应该返回false

    // 第一张牌：[1,1,1,1] = 0x55
    // 第二张牌：[0,0,0,0] = 0x00
    // 第三张牌：[0,0,0,0] = 0x00
    uint256 constant TEST_VALUE_6 = 0x000055; // type1正好4个，应该返回true

    // 第一张牌：[3,3,3,0] = 0xFC
    // 第二张牌：[3,0,0,0] = 0xC0
    // 第三张牌：[0,0,0,0] = 0x00
    uint256 constant TEST_VALUE_7 = 0x00C0FC; // type3正好4个，应该返回true

    // 第一张牌：[1,1,2,2] = 0x1A
    // 第二张牌：[1,2,3,2] = 0x2E
    // 第三张牌：[3,2,1,2] = 0x2D
    uint256 constant TEST_VALUE_8 = 0x2D2E1A; // type1有3个，type2有3个，type3有2个，应该返回false（没有任何类型是4个）

    function setUp() public {
        // No setup required for library tests
    }

    function testCheckThreeCardIsBell() public view {
        // Test cases where it should return true
        require(TEST_VALUE_3.checkThreeCardIsBell(0), "Should be true: has exactly 4 type3");
        require(TEST_VALUE_6.checkThreeCardIsBell(0), "Should be true: has 4 type1 (and 4 type2)");
        require(TEST_VALUE_7.checkThreeCardIsBell(0), "Should be true: has 4 type3 (and 2 of others)");

        // Test cases where it should return false
        require(!TEST_VALUE_1.checkThreeCardIsBell(0), "Should be false: has 6 type1");
        require(!TEST_VALUE_2.checkThreeCardIsBell(0), "Should be false: has 5 type2");
        require(!TEST_VALUE_4.checkThreeCardIsBell(0), "Should be false: has 6 type1");
        require(!TEST_VALUE_5.checkThreeCardIsBell(0), "Should be false: all zeros");
        require(!TEST_VALUE_8.checkThreeCardIsBell(0), "Should be false: has 3 type1, 3 type2, 2 type3");
    }
    
    function testMultiRun() public view {
        // Create a sequence of 8 cards where each card has a unique value
        // Card values: 1,2,3,4,5,6,7,8 (each in 2-digit hex format)
        uint256 cards = 0x0807060504030201;
        
        // Test multiple turns
        // Turn 0: Cards 1,2,3
        for(uint8 i = 0; i < 6; i++) {
            cards.checkThreeCardIsBell(i);
        }
        // require(cards.checkThreeCardIsBell(0), "Turn 0 should check cards 1,2,3");
        
        // // Turn 1: Cards 2,3,4
        // require(cards.checkThreeCardIsBell(1), "Turn 1 should check cards 2,3,4");
        
        // // Turn 2: Cards 3,4,5
        // require(cards.checkThreeCardIsBell(2), "Turn 2 should check cards 3,4,5");
        
        // // Turn 3: Cards 4,5,6
        // require(cards.checkThreeCardIsBell(3), "Turn 3 should check cards 4,5,6");
        
        // // Turn 4: Cards 5,6,7
        // require(cards.checkThreeCardIsBell(4), "Turn 4 should check cards 5,6,7");
        
        // // Turn 5: Cards 6,7,8
        // require(cards.checkThreeCardIsBell(5), "Turn 5 should check cards 6,7,8");
    }
}
