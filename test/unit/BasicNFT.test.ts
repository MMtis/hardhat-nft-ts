import { assert, expect } from "chai"
import { network, deployments, ethers, getNamedAccounts } from "hardhat"
import { developmentChains, networkConfig } from "../../helper-hardhat-config"
import { BasicNFT } from "../../typechain-types"
import { BigNumber } from "ethers"

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("BasicNFT Unit test", function () {
          let basicNFT: BasicNFT, deployer: string, name: string, symbol: string, counter: string
          const chainId = network.config.chainId

          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer
              await deployments.fixture(["main"])
              basicNFT = await ethers.getContract("BasicNFT", deployer)
              name = await basicNFT.name()
              symbol = await basicNFT.symbol()
              counter = (await basicNFT.getTokenCounter()).toString()
          })

          describe("constructor", function () {
              it("initializes the Basic NFT correctly", async function () {
                  assert.equal(name, "DOGIE")
                  assert.equal(symbol, "DOG")
                  assert.equal(counter, "0")
              })
          })
          describe("Mint NFT", function () {
              beforeEach(async function () {
                  const txResponse = await basicNFT.mintNFT()
                  await txResponse.wait(1)
                  counter = (await basicNFT.getTokenCounter()).toString()
              })
              it("Allows users to mint an NFT, and updates appropriately", async function () {
                  const tokenURI = await basicNFT.tokenURI(0)
                  assert.equal(counter, "1")
                  assert.equal(tokenURI, await basicNFT.TOKEN_URI())
              })
              it("Updates the balance and Owner of the NFT", async function () {
                  const ownerBalance = (await basicNFT.balanceOf(deployer)).toNumber()
                  const owner = await basicNFT.ownerOf(0)
                  assert.equal(ownerBalance, 1)
                  assert.equal(owner, deployer)
              })
          })
      })
