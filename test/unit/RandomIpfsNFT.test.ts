import { assert, expect } from "chai"
import { network, deployments, ethers, getNamedAccounts } from "hardhat"
import { developmentChains, networkConfig } from "../../helper-hardhat-config"
import { RandomIpfsNFT, VRFCoordinatorV2Mock } from "../../typechain-types"
import { BigNumber } from "ethers"

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("RandomIpfsNFT Unit test", function () {
          let randomIpfsNFT: RandomIpfsNFT,
              deployer: string,
              name: string,
              symbol: string,
              counter: string,
              mintFee: BigNumber,
              vrfCoordinatorV2Mock: VRFCoordinatorV2Mock
          const chainId = network.config.chainId

          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer
              await deployments.fixture(["main"])
              randomIpfsNFT = await ethers.getContract("RandomIpfsNFT", deployer)
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
              name = await randomIpfsNFT.name()
              symbol = await randomIpfsNFT.symbol()
              counter = (await randomIpfsNFT.getTokenCounter()).toString()
              mintFee = await randomIpfsNFT.getMintFee()
          })

          describe("constructor", function () {
              it("initializes the Random Ipfs NFT correctly", async function () {
                  const dogTokenUriZero = await randomIpfsNFT.getDogTokenUris(0)
                  const isInitialized = await randomIpfsNFT.getInitialized()
                  assert.equal(name, "Random IPFS NFT")
                  assert.equal(symbol, "RIN")
                  assert.equal(counter, "0")
                  assert(dogTokenUriZero.includes("ipfs://"))
                  assert.equal(isInitialized, true)
              })
          })
          describe("requestNft", function () {
              it("reverts when you don't pay enough", async function () {
                  await expect(randomIpfsNFT.requestNft()).to.be.revertedWith(
                      "RandomIpfsNFT__NeedMoreETHSent"
                  )
              })
          })
          it("reverts if payment amount is less than the mint fee", async function () {
              const fee = await randomIpfsNFT.getMintFee()
              await expect(
                  randomIpfsNFT.requestNft({
                      value: fee.sub(ethers.utils.parseEther("0.001")),
                  })
              ).to.be.revertedWith("RandomIpfsNFT__NeedMoreETHSent")
          })
          it("emits an event and kicks off a random word request", async function () {
              const txResponse = await randomIpfsNFT.requestNft({ value: mintFee })
              const txReceipt = await txResponse.wait(1)
              await expect(txResponse).to.emit(
                  vrfCoordinatorV2Mock,

                  "RandomWordsRequested"
              )
              await expect(txResponse).to.emit(
                  randomIpfsNFT,

                  "NFTRequested"
              )
              const requestId = txReceipt.events![1].args!.requestId
              assert(requestId.toNumber() > 0)
              assert.equal(await randomIpfsNFT.getRequestIdSender(requestId.toNumber()), deployer)
          })

          describe("fulfillRandomWords", function () {
              let requestId: BigNumber
              beforeEach(async function () {
                  const txResponse = await randomIpfsNFT.requestNft({ value: mintFee })
                  const txReceipt = await txResponse.wait(1)
                  requestId = txReceipt.events![1].args!.requestId
              })
              it("mints NFT after random number is returned", async function () {
                  await new Promise<void>(async (resolve, reject) => {
                      randomIpfsNFT.once("NFTMinted", async () => {
                          console.log("found the event!")
                          try {
                              const ownerBalance = (
                                  await randomIpfsNFT.balanceOf(deployer)
                              ).toNumber()
                              const owner = await randomIpfsNFT.ownerOf(0)
                              assert.equal(ownerBalance, 1)
                              assert.equal(owner, deployer)

                              const packedData = ethers.utils.defaultAbiCoder.encode(
                                  ["uint256", "uint256"],
                                  [requestId, 0]
                              )
                              const hashedData = ethers.utils.keccak256(packedData)
                              const result = await randomIpfsNFT.getBreedFromModdedRng(
                                  ethers.BigNumber.from(hashedData).mod(100)
                              )
                              assert.equal(
                                  await randomIpfsNFT.getDogTokenUris(result),
                                  await randomIpfsNFT.tokenURI(parseInt(counter))
                              )

                              const newTokenCounter = (
                                  await randomIpfsNFT.getTokenCounter()
                              ).toNumber()
                              assert.equal(newTokenCounter, 1)
                          } catch (e) {
                              reject(e) // timeout if > 300 s
                          }
                          resolve()
                      })
                      // setting up the listener
                      // below, we will fire the event, and the listener will pick it up, and resolve

                      // we call fulfillRandomWords of VRFCoordinator contract
                      // which then calls the VRFConsumerBase rawFulfillRandomWords function with raffle contract
                      // because it is inherited
                      // which then calls the overriden fulfillRandomWords of RandomIpfsNFT contract
                      await vrfCoordinatorV2Mock.fulfillRandomWords(
                          requestId,
                          randomIpfsNFT.address
                      )
                  })
              })
              describe("getBreedFromModdedRng", () => {
                  it("should return pug if moddedRng < 10", async function () {
                      const expectedValue = await randomIpfsNFT.getBreedFromModdedRng(7)
                      assert.equal(0, expectedValue)
                  })
                  it("should return shiba-inu if moddedRng is between 10 - 39", async function () {
                      const expectedValue = await randomIpfsNFT.getBreedFromModdedRng(21)
                      assert.equal(1, expectedValue)
                  })
                  it("should return st. bernard if moddedRng is between 40 - 99", async function () {
                      const expectedValue = await randomIpfsNFT.getBreedFromModdedRng(77)
                      assert.equal(2, expectedValue)
                  })
                  it("should revert if moddedRng > 99", async function () {
                      await expect(randomIpfsNFT.getBreedFromModdedRng(100)).to.be.revertedWith(
                          "RandomIpfsNFT__RangeOutOfBounds"
                      )
                  })
              })
          })
      })
