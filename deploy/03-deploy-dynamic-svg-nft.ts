import {
    developmentChains,
    VERIFICATION_BLOCK_CONFIRMATIONS,
    networkConfig,
} from "../helper-hardhat-config"
import verify from "../utils/verify"
import { DeployFunction } from "hardhat-deploy/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import fs from "fs"

const deployDynamicSvgNft: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts, network, ethers } = hre
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()

    const chainId = network.config.chainId!
    let ethUsdPriceFeedAddress

    if (developmentChains.includes(network.name)) {
        const ethUsdAggregator = await ethers.getContract("MockV3Aggregator")
        ethUsdPriceFeedAddress = ethUsdAggregator.address
    } else {
        ethUsdPriceFeedAddress = networkConfig[chainId].ethUsdPriceFeed
    }
    log("------------------------------------")
    const lowSVG = await fs.readFileSync("./images/dynamicNFT/frown.svg", { encoding: "utf8" })
    const highSVG = await fs.readFileSync("./images/dynamicNFT/happy.svg", { encoding: "utf8" })

    const waitBlockConfirmations = developmentChains.includes(network.name)
        ? 1
        : VERIFICATION_BLOCK_CONFIRMATIONS

    const args = [ethUsdPriceFeedAddress, lowSVG, highSVG]
    const dynamicSvgNFT = await deploy("DynamicSvgNFT", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: waitBlockConfirmations || 1,
    })

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying...")
        await verify(dynamicSvgNFT.address, args)
    }

    log("-------------------------------------")
}

export default deployDynamicSvgNft
deployDynamicSvgNft.tags = ["all", "dynamicsvg", "main"]
