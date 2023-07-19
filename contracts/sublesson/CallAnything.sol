// SPDX-License-Identifier: MIT

// So why do we care about all this encoding stuff?

// In order to call a function using only the data field of call, we need to encode:
// The function name
// The parameters we want to add
// Down to the binary level

// Now each contract assigns each function it has a function ID. This is known as the "function selector".
// The "function selector" is the first 4 bytes of the function signature.
// The "function signature" is a string that defines the function name & parameters.
// Let's look at this

pragma solidity ^0.8.7;

contract CallAnything {
    address public s_someAddress;
    uint256 public s_amount;

    function transfer(address someAddress, uint256 amount) public {
        // Some code
        s_someAddress = someAddress;
        s_amount = amount;
    }

    // We can get a function selector as easy as this.
    // "transfer(address,uint256)" is our function signature
    // and our resulting function selector of "transfer(address,uint256)" is output from this function
    // one thing to note here is that there shouldn't be any spaces in "transfer(address,uint256)"
    function getSelectorOne() public pure returns (bytes4 selector) {
        selector = bytes4(keccak256(bytes("transfer(address,uint256)")));
    }

    function getDataToCallTransfer(
        address someAddress,
        uint256 amount
    ) public pure returns (bytes memory) {
        return abi.encodeWithSelector(getSelectorOne(), someAddress, amount);
    }

    // So... How can we use the selector to call our transfer function now then?
    function callTransferFunctionDirectly(
        address someAddress,
        uint256 amount
    ) public returns (bytes4, bool) {
        (bool success, bytes memory returnData) = address(this).call(
            // getDataToCallTransfer(someAddress, amount);
            abi.encodeWithSelector(getSelectorOne(), someAddress, amount)
        );
        return (bytes4(returnData), success);
    }

    // Using encodeWithSignature
    function callTransferFunctionDirectlyTwo(
        address someAddress,
        uint256 amount
    ) public returns (bytes4, bool) {
        (bool success, bytes memory returnData) = address(this).call(
            abi.encodeWithSignature("transfer(address,uint256)", someAddress, amount)
        );
        return (bytes4(returnData), success);
    }

    // We can also get a function selector from data sent into the call
    function getSelectorTwo() public view returns (bytes4 selector) {
        bytes memory functionCallData = abi.encodeWithSignature(
            "transfer(address,uint256)",
            address(this),
            123
        );
        selector = bytes4(
            bytes.concat(
                functionCallData[0],
                functionCallData[1],
                functionCallData[2],
                functionCallData[3]
            )
        );
    }

    // Another way to get data (hard coded)
    function getCallData() public view returns (bytes memory) {
        return abi.encodeWithSignature("transfer(address,uint256)", address(this), 123);
    }

    // Pass this:
    // 0xa9059cbb000000000000000000000000d7acd2a9fd159e69bb102a1ca21c9a3e3a5f771b000000000000000000000000000000000000000000000000000000000000007b
    // This is output of `getCallData()`
    // This is another low level way to get function selector using assembly
    // You can actually write code that resembles the opcodes using the assembly keyword!
    // This in-line assembly is called "Yul"
    // It's a best practice to use it as little as possible - only when you need to do something very VERY specific
    // calldata Layout: When a function in a contract is called, the calldata for that function call
    // consists of the function selector followed by the encoded arguments. This applies to all functions,
    // including the getSelectorThree function in your contract. When you call getSelectorThree, the calldata
    // for that function call consists of the function selector for getSelectorThree followed by the length of
    // functionCallData (because bytes is a dynamic type) and then the functionCallData itself.
    // .offset: In the assembly code, functionCallData.offset gives the position in calldata where the
    // actual functionCallData starts, which is after the function selector for getSelectorThree and the
    // length field for functionCallData.
    // calldataload: The calldataload(functionCallData.offset) operation loads the 32 bytes starting from
    // that position in calldata. These 32 bytes will be the function selector for transfer followed by the
    // first argument if it exists and any padding needed to make it 32 bytes.
    // Conversion to bytes4: The loaded 32 bytes are then assigned to selector, which is of type bytes4. This
    // effectively takes only the first 4 bytes of the loaded data, giving you the function selector for transfer.
    function getSelectorThree(
        bytes calldata functionCallData
    ) public pure returns (bytes4 selector) {
        // offset is a special attribute of calldata
        assembly {
            selector := calldataload(functionCallData.offset)
        }
    }

    // Another way to get your selector with the "this" keyword
    function getSelectorFour() public pure returns (bytes4 selector) {
        return this.transfer.selector;
    }

    // Just a function that gets the signature
    function getSignatureOne() public pure returns (string memory) {
        return "transfer(address,uint256)";
    }
}

contract CallFunctionWithoutContract {
    address public s_selectorsAndSignaturesAddress;

    constructor(address selectorsAndSignaturesAddress) {
        s_selectorsAndSignaturesAddress = selectorsAndSignaturesAddress;
    }

    // pass in 0xa9059cbb000000000000000000000000d7acd2a9fd159e69bb102a1ca21c9a3e3a5f771b000000000000000000000000000000000000000000000000000000000000007b
    // you could use this to change state
    function callFunctionDirectly(bytes calldata callData) public returns (bytes4, bool) {
        (bool success, bytes memory returnData) = s_selectorsAndSignaturesAddress.call(
            abi.encodeWithSignature("getSelectorThree(bytes)", callData)
        );
        return (bytes4(returnData), success);
    }

    // with a staticcall, we can have this be a view function!
    function staticCallFunctionDirectly() public view returns (bytes4, bool) {
        (bool success, bytes memory returnData) = s_selectorsAndSignaturesAddress.staticcall(
            abi.encodeWithSignature("getSelectorOne()")
        );
        return (bytes4(returnData), success);
    }

    function callTransferFunctionDirectlyThree(
        address someAddress,
        uint256 amount
    ) public returns (bytes4, bool) {
        (bool success, bytes memory returnData) = s_selectorsAndSignaturesAddress.call(
            abi.encodeWithSignature("transfer(address,uint256)", someAddress, amount)
        );
        return (bytes4(returnData), success);
    }
}
