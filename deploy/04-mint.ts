import { DeployFunction } from "hardhat-deploy/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import {
    developmentChains,
    VERIFICATION_BLOCK_CONFIRMATIONS,
    networkConfig,
} from "../helper-hardhat-config"

const mint: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { getNamedAccounts, network, ethers } = hre
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId!
    let blocksToMine = chainId == 31337 ? 1 : 3

    // Basic NFT
    const basicNFT = await ethers.getContract("BasicNFT", deployer)
    const basicMintTx = await basicNFT.mintNFT()
    await basicMintTx.wait(blocksToMine)
    console.log(`Basic NFT index 0 has tokenURI: ${await basicNFT.tokenURI(0)}`)

    // Dynamic SVG NFT
    const highValue = ethers.utils.parseEther("4000")
    const dynamicSvgNFT = await ethers.getContract("DynamicSvgNFT", deployer)
    const dynamicSvgNFTMintTx = await dynamicSvgNFT.mintNFT(highValue)
    await dynamicSvgNFTMintTx.wait(blocksToMine)
    console.log(`Dynamic SVG NFT index 0 tokenURI: ${await dynamicSvgNFT.tokenURI(0)}`)

    // Random IPFS NFT
    const randomIpfsNFT = await ethers.getContract("RandomIpfsNFT", deployer)
    const mintFee = await randomIpfsNFT.getMintFee()

    await new Promise<void>(async (resolve, reject) => {
        setTimeout(resolve, 300000) // 5 minutes
        randomIpfsNFT.once("NFTMinted", async function () {
            console.log(`Random IPFS NFT index 0 tokenURI: ${await randomIpfsNFT.tokenURI(0)}`)
            resolve()
        })
        const randomIpfsNFTMintTx = await randomIpfsNFT.requestNft({ value: mintFee.toString() })
        const randomIpfsNFTMintTxReceipt = await randomIpfsNFTMintTx.wait(blocksToMine)
        if (developmentChains.includes(network.name)) {
            const requestId = randomIpfsNFTMintTxReceipt.events[1].args.requestId.toString()
            const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
            await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, randomIpfsNFT.address)
        }
    })
}
export default mint
module.exports.tags = ["all", "mint"]
