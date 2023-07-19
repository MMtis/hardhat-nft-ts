// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

pragma solidity ^0.8.7;

contract BasicNFT is ERC721 {
    using Counters for Counters.Counter;
    Counters.Counter private s_tokenCounter;
    string public constant TOKEN_URI =
        "ipfs://bafybeig37ioir76s7mg5oobetncojcm3c3hxasyd4rvid4jqhy4gkaheg4/?filename=0-PUG.json";

    constructor() ERC721("DOGIE", "DOG") {}

    function mintNFT() public returns (uint256) {
        _safeMint(msg.sender, s_tokenCounter.current());
        s_tokenCounter.increment();
        return s_tokenCounter.current();
    }

    function tokenURI(uint256 /*tokenId*/) public pure override returns (string memory) {
        return TOKEN_URI;
    }

    function getTokenCounter() public view returns (uint256) {
        return s_tokenCounter.current();
    }
}
