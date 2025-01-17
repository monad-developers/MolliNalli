// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "forge-std/console.sol";
library CardTypeLib {
    // Constants for bit operations
    uint256 private constant TYPE_MASK = 0x03; // Binary: 11
    uint256 private constant BITS_PER_TYPE = 2;
    uint256 private constant ANIMAL_COUNT = 4; // 一张牌上最多4个吉祥物
    uint256 private constant ANIMAL_TYPE = 3;
    uint256 private constant BELL_TARGET = 4;
    
    function checkThreeCardIsBell(uint256 value,uint8 turn) internal pure returns (bool) {
        uint8[4] memory types;
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
}
