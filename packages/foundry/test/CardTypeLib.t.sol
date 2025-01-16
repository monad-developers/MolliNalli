// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/lib/CardTypeLib.sol";

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
        require(TEST_VALUE_3.checkThreeCardIsBell(), "Should be true: has exactly 4 type3");
        require(TEST_VALUE_6.checkThreeCardIsBell(), "Should be true: has 4 type1 (and 4 type2)");
        require(TEST_VALUE_7.checkThreeCardIsBell(), "Should be true: has 4 type3 (and 2 of others)");

        // Test cases where it should return false
        require(!TEST_VALUE_1.checkThreeCardIsBell(), "Should be false: has 6 type1");
        require(!TEST_VALUE_2.checkThreeCardIsBell(), "Should be false: has 5 type2");
        require(!TEST_VALUE_4.checkThreeCardIsBell(), "Should be false: has 6 type1");
        require(!TEST_VALUE_5.checkThreeCardIsBell(), "Should be false: all zeros");
        require(!TEST_VALUE_8.checkThreeCardIsBell(), "Should be false: has 3 type1, 3 type2, 2 type3");
    }
}
