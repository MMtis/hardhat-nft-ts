import pinataSDK from "@pinata/sdk"
import { PinataPinResponse } from "@pinata/sdk"
import path from "path"
import fs from "fs"
import "dotenv/config"

const pinataAPIKey = process.env.PINATA_API_KEY
const pinataAPISecret = process.env.PINATA_API_SECRET
const pinata = pinataSDK(pinataAPIKey, pinataAPISecret)

export async function storeImages(imagesFilePath: string) {
    const fullImagesPath = path.resolve(imagesFilePath) // will give full output of the path
    const files = fs.readdirSync(fullImagesPath)
    // console.log(files)
    let responses: PinataPinResponse[] = []
    console.log("Uploading to Pinata!")
    for (const fileIndex in files) {
        console.log(`Working on ${fileIndex}...`)
        const readableStreamForFile = fs.createReadStream(`${fullImagesPath}/${files[fileIndex]}`) // creates bytes from image
        const options = {
            pinataMetadata: {
                name: files[fileIndex],
            },
        }
        try {
            const response = await pinata.pinFileToIPFS(readableStreamForFile, options) // pinata stuff
            responses.push(response)
        } catch (error) {
            console.log(error)
        }
    }
    return { responses, files }
}

export async function storeTokenUriMetadata(metadata) {
    const options = {
        pinataMetadata: {
            name: metadata.name,
        },
    }
    try {
        const response = await pinata.pinJSONToIPFS(metadata, options)
        return response
    } catch (error) {
        console.log(error)
    }
    return null
}
