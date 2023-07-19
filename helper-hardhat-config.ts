
export interface networkConfigItem {
    name?: string
    subscriptionId?: string 
    callbackGasLimit?: string 
    vrfCoordinatorV2?: string
    gasLane?: string 
    ethUsdPriceFeed?: string
    mintFee?: string
  }
  
export interface networkConfigInfo {
    [key: number]: networkConfigItem;
    default: networkConfigItem;
}

export const networkConfig: networkConfigInfo = {
    default: {
        name: "hardhat",
        gasLane: "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
        callbackGasLimit: "500000",
        mintFee: "10000000000000000", //0.01
    },
    11155111: {
        name: "sepolia",
        vrfCoordinatorV2: "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625",
        gasLane: "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
        subscriptionId: "2238",
        callbackGasLimit: "500000",
        mintFee: "10000000000000000", //0.01
        ethUsdPriceFeed: "0x694AA1769357215DE4FAC081bf1f309aDC325306",
    },
    31337: {
        name: "localhost",
        gasLane: "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
        callbackGasLimit: "500000",
        mintFee: "10000000000000000", //0.01
    },
}

export const DECIMALS = "18"
export const INITIAL_PRICE = "200000000000000000000"
export const developmentChains = ["hardhat", "localhost"]
export const VERIFICATION_BLOCK_CONFIRMATIONS = 6