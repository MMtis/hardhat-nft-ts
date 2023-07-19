// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

error RandomIpfsNFT__AlreadyInitialized();
error RandomIpfsNFT__RangeOutOfBounds();
error RandomIpfsNFT__NeedMoreETHSent();
error RandomIpfsNFT__TransferFailed();

contract RandomIpfsNFT is VRFConsumerBaseV2, ERC721URIStorage, Ownable {
    //users have to pay to mint an NFT
    //owner of the contact can withdraw ETH

    // Type declaration
    using Counters for Counters.Counter;
    enum Breed {
        PUG,
        SHIBA_INU,
        ST_BERNARD
    }

    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    uint64 private immutable i_subscriptionId;
    bytes32 private immutable i_gasLane;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    // VRF helpers
    mapping(uint256 => address) public s_requestIdSender;

    // NFT Variables
    Counters.Counter private s_tokenCounter;
    uint256 internal constant MAX_CHANCE_VALUE = 100;
    string[] internal s_dogTokenURIs;
    uint256 internal immutable i_mintFee;
    bool private s_initialized;

    // Events
    event NFTRequested(uint256 indexed requestId, address requester);
    event NFTMinted(Breed dogBreed, address minter);

    constructor(
        address vrfCoordinatorV2,
        bytes32 gasLane,
        uint64 subscriptionId,
        uint32 callbackGasLimit,
        string[3] memory dogTokenURIs,
        uint256 mintFee
    ) VRFConsumerBaseV2(vrfCoordinatorV2) ERC721("Random IPFS NFT", "RIN") {
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_gasLane = gasLane;
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
        _initializeContract(dogTokenURIs);
        i_mintFee = mintFee;
    }

    function requestNft() public payable returns (uint256 requestId) {
        if (msg.value < i_mintFee) {
            revert RandomIpfsNFT__NeedMoreETHSent();
        }
        requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );
        s_requestIdSender[requestId] = msg.sender;
        emit NFTRequested(requestId, msg.sender);
    }

    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal override {
        address dogOwner = s_requestIdSender[requestId];
        uint256 newTokenId = s_tokenCounter.current();

        uint256 moddedRng = randomWords[0] % MAX_CHANCE_VALUE;

        Breed dogBreed = getBreedFromModdedRng(moddedRng);
        _safeMint(dogOwner, newTokenId);
        _setTokenURI(newTokenId, s_dogTokenURIs[uint256(dogBreed)]);
        s_tokenCounter.increment();

        emit NFTMinted(dogBreed, dogOwner);
    }

    function withdraw() public onlyOwner {
        uint256 amount = address(this).balance;
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) {
            revert RandomIpfsNFT__TransferFailed();
        }
    }

    function _initializeContract(string[3] memory dogTokenUris) private {
        if (s_initialized) {
            revert RandomIpfsNFT__AlreadyInitialized();
        }
        s_dogTokenURIs = dogTokenUris;
        s_initialized = true;
    }

    function getBreedFromModdedRng(uint256 moddedRng) public pure returns (Breed) {
        uint256 cumulativeSum = 0;
        uint256[3] memory chanceArray = getChanceArray();
        for (uint256 i = 0; i < chanceArray.length; i++) {
            if (moddedRng > cumulativeSum && moddedRng < chanceArray[i]) {
                return Breed(i);
            }
            cumulativeSum += chanceArray[i];
        }
        revert RandomIpfsNFT__RangeOutOfBounds();
    }

    function getChanceArray() public pure returns (uint256[3] memory) {
        return [10, 30, MAX_CHANCE_VALUE];
    }

    function getTokenCounter() public view returns (uint256) {
        return s_tokenCounter.current();
    }

    function getMintFee() public view returns (uint256) {
        return i_mintFee;
    }

    function getRequestIdSender(uint256 requestId) public view returns (address) {
        return s_requestIdSender[requestId];
    }

    function getInitialized() public view returns (bool) {
        return s_initialized;
    }

    function getDogTokenUris(uint256 index) public view returns (string memory) {
        return s_dogTokenURIs[index];
    }
}
