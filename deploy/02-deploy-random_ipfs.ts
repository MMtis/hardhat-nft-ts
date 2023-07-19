import {
    developmentChains,
    VERIFICATION_BLOCK_CONFIRMATIONS,
    networkConfig,
} from "../helper-hardhat-config"
import verify from "../utils/verify"
import { DeployFunction } from "hardhat-deploy/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import { storeImages, storeTokenUriMetadata } from "../utils/uploadToPinata"
import { storeNFTs } from "../utils/uploadToNftStorage"

const imagesLocation = "./images/randomNFT"
const metadataTemplate = {
    name: "",
    description: "",
    image: "",
    attributes: [
        {
            trait_type: "Cuteness",
            value: 100,
        },
    ],
}

const FUND_AMOUNT = "10000000000000000000" // 10 Link

const deployRandomIpfsNft: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts, network, ethers } = hre
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId!
    let tokenUris = [
        "ipfs://QmaVkBn2tKmjbhphU7eyztbvSQU5EXDdqRyXZtRhSGgJGo",
        "ipfs://QmYQC5aGZu2PTH8XzbJrbDnvhj3gVs7ya33H9mqUNvST3d",
        "ipfs://QmZYmH5iDbD6v3U2ixoVAjioSzvWJszDzYdbeCLquGSpVm",
    ]

    // get the IPFS hashes of our images
    if (process.env.UPLOAD_TO_PINATA == "true") {
        tokenUris = await handleTokenUris()
        console.log(tokenUris)
    } else if (process.env.UPLOAD_TO_NFT_STORAGE == "true") {
        tokenUris = await storeNFTs(imagesLocation)
        console.log(tokenUris)
    }

    // 1. With our own IPFS node. https://docs.ipfs.io/ (or programatically)
    // 2. Pinata https://www.pinata.cloud/ (centralized)
    // 3. NFT.storage https://nft.storage/ (using filecoin to pin data)

    let vrfCoordinatorV2Address, subscriptionId, VRFCoordinatorV2Mock

    if (developmentChains.includes(network.name)) {
        VRFCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        vrfCoordinatorV2Address = VRFCoordinatorV2Mock.address
        const tx = await VRFCoordinatorV2Mock.createSubscription()
        const txReceipt = await tx.wait(1)
        subscriptionId = txReceipt.events[0].args.subId
        await VRFCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT)
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId].vrfCoordinatorV2
        subscriptionId = networkConfig[chainId].subscriptionId
    }
    log("-------------------------------------")
    // await storeImages(imagesLocation)

    const waitBlockConfirmations = developmentChains.includes(network.name)
        ? 1
        : VERIFICATION_BLOCK_CONFIRMATIONS

    const args = [
        vrfCoordinatorV2Address,
        networkConfig[chainId].gasLane,
        subscriptionId,
        networkConfig[chainId].callbackGasLimit,
        tokenUris,
        networkConfig[chainId].mintFee,
    ]

    const randomIpfsNFT = await deploy("RandomIpfsNFT", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: waitBlockConfirmations || 1,
    })
    log("----------------------------------")

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying...")
        await verify(randomIpfsNFT.address, args)
    }

    // Add our contract to allowed subscription consumers list
    if (developmentChains.includes(network.name)) {
        const VRFCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        await VRFCoordinatorV2Mock.addConsumer(subscriptionId, randomIpfsNFT.address)
        console.log("Customer added for " + subscriptionId)
        const added: boolean = await VRFCoordinatorV2Mock.consumerIsAdded(
            subscriptionId,
            randomIpfsNFT.address
        )
        const subsciptionBalance: Number = await VRFCoordinatorV2Mock.getSubscription(
            subscriptionId
        )
        console.log(added)
        console.log(subsciptionBalance)
    }

    log("----------------------------------")
}

async function handleTokenUris() {
    const tokenUris = []
    // store the image in IPFS
    // store the metadata in IPFS
    const { responses: imageUploadResponses, files } = await storeImages(imagesLocation)
    for (const imageUploadResponseIndex in imageUploadResponses) {
        // create metadata
        // upload metadata
        let tokenUriMetadata = { ...metadataTemplate }
        tokenUriMetadata.name = files[imageUploadResponseIndex].replace(".png", "")
        tokenUriMetadata.description = `An adorable ${tokenUriMetadata.name} pup!`
        tokenUriMetadata.image = `ipfs://${imageUploadResponses[imageUploadResponseIndex].IpfsHash}`
        console.log(`Uploading ${tokenUriMetadata.name}...`)
        // store the JSON to pinata / IPFS
        const metadataUploadResponse = await storeTokenUriMetadata(tokenUriMetadata)
        tokenUris.push(`ipfs://${metadataUploadResponse!.IpfsHash}`)
    }
    console.log("Token URIs uploaded! They are:")
    console.log(tokenUris)

    return tokenUris
}

export default deployRandomIpfsNft
deployRandomIpfsNft.tags = ["all", "randomipfs", "main"]
