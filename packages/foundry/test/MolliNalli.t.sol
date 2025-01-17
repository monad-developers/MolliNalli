// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Test, console2} from "forge-std/Test.sol";
import {MolliNalli, ErrorStarted, ErrorIsFull, ErrorNotAdmin, ErrorNotPlayer, ErrorJoined, ErrorEnded, ErrorNotPlaying, GameStage} from "../contracts/MolliNalli.sol";
import {Vm} from "forge-std/Vm.sol";

contract MolliNalliTest is Test {
    MolliNalli public game;
    address public admin;
    address public player1;
    address public player2;
    address public player3;
    address public player4;
    address public nonPlayer;

    function setUp() public {
        game = new MolliNalli();
        admin = address(this);
        player1 = makeAddr("player1");
        player2 = makeAddr("player2");
        player3 = makeAddr("player3");
        player4 = makeAddr("player4");
        nonPlayer = makeAddr("nonPlayer");

        // Give some ETH to players for gas
        vm.deal(player1, 1 ether);
        vm.deal(player2, 1 ether);
        vm.deal(player3, 1 ether);
        vm.deal(player4, 1 ether);
    }

    function _setPlayerReady(address player) internal {
        vm.prank(player);
        game.joinGame();
        // Increment playersCount
        vm.store(
            address(game),
            bytes32(uint256(1)), 
            bytes32(uint256(1))
        );
    }

    // Test Game Stages
    function testGameStages() public {
        // Test initial stage
        assertEq(uint8(game.stage()), uint8(GameStage.NOT_START));
        
        // Join game and verify player is ready
        vm.prank(player1);
        game.joinGame();
        
        // Test game start
        vm.prank(player1);
        game.startGame();
        assertEq(uint8(game.stage()), uint8(GameStage.PLAYING));

        // Test that non-players cannot perform actions
        vm.prank(nonPlayer);
        vm.expectRevert(ErrorNotPlayer.selector);
        game.action(true);

        // Test that players can perform actions
        vm.prank(player1);
        game.action(true);

        // Test actions within MAX_ACTION_PER_ROUND
        for(uint i = 0; i < game.MAX_ACTION() - 2; i++) {
            vm.prank(player1);
            game.action(false);
        }
        
        // Last action should trigger game end
        vm.prank(player1);
        game.action(false);
        assertEq(uint8(game.stage()), uint8(GameStage.ENDED));

        // Test that actions after game end should fail
        vm.prank(player1);
        vm.expectRevert(ErrorNotPlaying.selector);
        game.action(false);
    }

    // Test Joining Mechanics
    function testJoinGame() public {
        // Test successful join
        vm.prank(player1);
        game.joinGame();

        // Test cannot join twice
        vm.prank(player1);
        vm.expectRevert(ErrorJoined.selector);
        game.joinGame();

        // Fill up the game
        vm.prank(player2);
        game.joinGame();
        vm.prank(player3);
        game.joinGame();
        vm.prank(player4);
        game.joinGame();

        // Test cannot join when full
        vm.prank(nonPlayer);
        vm.expectRevert(ErrorIsFull.selector);
        game.joinGame();
    }

    // Test Scoring System
    function testScoringSystem() public {
        // Setup game with one player
        vm.prank(player1);
        game.joinGame();
        
        vm.prank(player1);
        game.startGame();

        // Perform actions and check score
        vm.prank(player1);
        game.action(true); // First action
        
        // Get player score
        (bool isReady, uint8 score,,,,) = game.players(player1);
        assertTrue(isReady);
        // Score should be 0 or 1 depending on the random seed
        assertTrue(score <= 1);
    }

    // Test Game End Event
    function testGameEndEvent() public {
        // Join and start game
        vm.prank(player1);
        game.joinGame();
        
        // Set player ready
        // _setPlayerReady(player1);
        
        vm.prank(player1);
        game.startGame();

        // Expect GameEnded event after MAX_ACTION actions
        vm.recordLogs();
        
        // Perform all actions until game end
        for(uint8 i = 0; i < game.MAX_ACTION(); i++) {
            vm.prank(player1);
            game.action(false);
        }

        // Get the logs and verify the GameEnded event was emitted
        Vm.Log[] memory entries = vm.getRecordedLogs();
        bool foundEndEvent = false;
        for(uint i = 0; i < entries.length; i++) {
            // The first topic is the event signature
            if(entries[i].topics[0] == keccak256("GameEnded((bool,uint8,uint8,uint48,uint256)[],uint256)")) {
                foundEndEvent = true;
                break;
            }
        }
        assertTrue(foundEndEvent, "GameEnded event should be emitted");
    }

    // Test Stage Transitions
    function testStageTransitions() public {
        // Test initial stage
        assertEq(uint8(game.stage()), uint8(GameStage.NOT_START));

        // Test that game cannot be started without players
        vm.expectRevert(ErrorNotPlayer.selector);
        game.startGame();

        // Add a player
        vm.prank(player1);
        game.joinGame();

        // Start game
        vm.prank(player1);
        game.startGame();
        assertEq(uint8(game.stage()), uint8(GameStage.PLAYING));

        // Play until game ends
        for(uint i = 0; i < game.MAX_ACTION(); i++) {
            vm.prank(player1);
            game.action(false);
        }

        // Verify game ended
        assertEq(uint8(game.stage()), uint8(GameStage.ENDED));
    }
}
