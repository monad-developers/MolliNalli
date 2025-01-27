/**
 * This file is autogenerated by Scaffold-ETH.
 * You should not edit it manually or your changes might be overwritten.
 */
import { GenericContractsDeclaration } from "~~/utils/scaffold-eth/contract";

const deployedContracts = {
  31337: {
    MolliNalli: {
      address: "0x375d6039674fff99904ce155fd708f2bd6e4a957",
      abi: [
        {
          type: "function",
          name: "CARD_MASK",
          inputs: [],
          outputs: [
            {
              name: "",
              type: "uint256",
              internalType: "uint256",
            },
          ],
          stateMutability: "view",
        },
        {
          type: "function",
          name: "MAX_ACTION",
          inputs: [],
          outputs: [
            {
              name: "",
              type: "uint8",
              internalType: "uint8",
            },
          ],
          stateMutability: "view",
        },
        {
          type: "function",
          name: "MAX_PLAYERS",
          inputs: [],
          outputs: [
            {
              name: "",
              type: "uint8",
              internalType: "uint8",
            },
          ],
          stateMutability: "view",
        },
        {
          type: "function",
          name: "action",
          inputs: [
            {
              name: "pressed",
              type: "bool",
              internalType: "bool",
            },
          ],
          outputs: [],
          stateMutability: "nonpayable",
        },
        {
          type: "function",
          name: "checkCard",
          inputs: [
            {
              name: "value",
              type: "uint256",
              internalType: "uint256",
            },
            {
              name: "turn",
              type: "uint8",
              internalType: "uint8",
            },
          ],
          outputs: [
            {
              name: "",
              type: "bool",
              internalType: "bool",
            },
          ],
          stateMutability: "pure",
        },
        {
          type: "function",
          name: "getPlayer",
          inputs: [
            {
              name: "playerAddr",
              type: "address",
              internalType: "address",
            },
          ],
          outputs: [
            {
              name: "",
              type: "tuple",
              internalType: "struct MolliNalli.Player",
              components: [
                {
                  name: "isReady",
                  type: "bool",
                  internalType: "bool",
                },
                {
                  name: "out",
                  type: "bool",
                  internalType: "bool",
                },
                {
                  name: "score",
                  type: "uint8",
                  internalType: "uint8",
                },
                {
                  name: "actionCount",
                  type: "uint8",
                  internalType: "uint8",
                },
                {
                  name: "seed",
                  type: "uint256",
                  internalType: "uint256",
                },
              ],
            },
          ],
          stateMutability: "view",
        },
        {
          type: "function",
          name: "joinGame",
          inputs: [],
          outputs: [],
          stateMutability: "nonpayable",
        },
        {
          type: "function",
          name: "players",
          inputs: [
            {
              name: "",
              type: "address",
              internalType: "address",
            },
          ],
          outputs: [
            {
              name: "isReady",
              type: "bool",
              internalType: "bool",
            },
            {
              name: "out",
              type: "bool",
              internalType: "bool",
            },
            {
              name: "score",
              type: "uint8",
              internalType: "uint8",
            },
            {
              name: "actionCount",
              type: "uint8",
              internalType: "uint8",
            },
            {
              name: "seed",
              type: "uint256",
              internalType: "uint256",
            },
          ],
          stateMutability: "view",
        },
        {
          type: "function",
          name: "playersAddr",
          inputs: [
            {
              name: "",
              type: "uint256",
              internalType: "uint256",
            },
          ],
          outputs: [
            {
              name: "",
              type: "address",
              internalType: "address",
            },
          ],
          stateMutability: "view",
        },
        {
          type: "function",
          name: "stage",
          inputs: [],
          outputs: [
            {
              name: "",
              type: "uint8",
              internalType: "enum GameStage",
            },
          ],
          stateMutability: "view",
        },
        {
          type: "function",
          name: "startGame",
          inputs: [],
          outputs: [],
          stateMutability: "nonpayable",
        },
        {
          type: "event",
          name: "GameEnded",
          inputs: [
            {
              name: "playerAddr",
              type: "address",
              indexed: true,
              internalType: "address",
            },
            {
              name: "player",
              type: "tuple",
              indexed: false,
              internalType: "struct MolliNalli.Player",
              components: [
                {
                  name: "isReady",
                  type: "bool",
                  internalType: "bool",
                },
                {
                  name: "out",
                  type: "bool",
                  internalType: "bool",
                },
                {
                  name: "score",
                  type: "uint8",
                  internalType: "uint8",
                },
                {
                  name: "actionCount",
                  type: "uint8",
                  internalType: "uint8",
                },
                {
                  name: "seed",
                  type: "uint256",
                  internalType: "uint256",
                },
              ],
            },
            {
              name: "endTime",
              type: "uint256",
              indexed: false,
              internalType: "uint256",
            },
          ],
          anonymous: false,
        },
        {
          type: "event",
          name: "GameStarted",
          inputs: [
            {
              name: "players",
              type: "address[]",
              indexed: false,
              internalType: "address[]",
            },
            {
              name: "seed",
              type: "uint256",
              indexed: false,
              internalType: "uint256",
            },
          ],
          anonymous: false,
        },
        {
          type: "error",
          name: "ErrorEnded",
          inputs: [],
        },
        {
          type: "error",
          name: "ErrorIsFull",
          inputs: [],
        },
        {
          type: "error",
          name: "ErrorJoined",
          inputs: [],
        },
        {
          type: "error",
          name: "ErrorNotPlayer",
          inputs: [],
        },
        {
          type: "error",
          name: "ErrorNotPlaying",
          inputs: [],
        },
        {
          type: "error",
          name: "ErrorOutPlayer",
          inputs: [],
        },
        {
          type: "error",
          name: "ErrorStarted",
          inputs: [],
        },
      ],
      inheritedFunctions: {},
      deploymentFile: "run-1737919618.json",
      deploymentScript: "Deploy.s.sol",
    },
  },
} as const;

export default deployedContracts satisfies GenericContractsDeclaration;
