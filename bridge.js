import { TestNetWallet, Wallet, TokenMintRequest } from "mainnet-js";
import { bigIntToVmNumber, binToHex } from '@bitauth/libauth';
import { ethers } from "ethers";
import { writeInfoToDb, getAllBridgeInfo, getRecentBridgeInfo, checkAmountBridgedDb, addBridgeInfoToNFT, bridgeInfoEthAddress, createOrder } from "./database.js"
import abi from "./abi.json" assert { type: 'json' }
import express from "express";
import cors from "cors";
import 'dotenv/config'

const tokenId = process.env.TOKENID;
const network =  process.env.NETWORK;
const derivationPathAddress = process.env.DERIVATIONPATH;
const seedphrase = process.env.SEEDPHRASE;
const serverUrl = process.env.SERVER_URL;
const contractAddress = process.env.CONTRACTADDR;
const secretToken = process.env.SECRET_TOKEN;

let nftsBridged = 0;
const amountBridgedDb = await checkAmountBridgedDb();
if(amountBridgedDb){
  console.log(`Read amountBridgedDb on restart, setting nftsBridged to ${amountBridgedDb}`);
  nftsBridged = amountBridgedDb;
}
let bridgingNft = false;

// set up express for endpoints
const app = express();
const port = 3000;
const url = process.env.NODE_ENV === "development"? "http://localhost:3000" : serverUrl;
app.use(cors());
app.use(express.json()); //req.body

// set up endpoints
app.get('/', (req, res) => {
  res.json({nftsBridged});
})

// process the payment callback we receive from Prompt.Cash
app.post('/callback', async(req, res) => {
  // The content type to respond is ignored by Prompt.Cash but you should return HTTP Status Code 200
  res.contentType("text/plain; charset=UTF-8'");
  res.send("ok"); // any response is fine (ignored by Prompt.Cash)

  console.log("Received callback", req.body)

  // check if the payment is complete
  if (req.body.token === secretToken) { // prevent spoofing
      if (req.body.payment.status === "PAID") {
          // Payment complete. Update your database and ship your order.
      }
  }
})

app.post("/signbridging", async (req, res) => {
  try{
    const { sbchOriginAddress, destinationAddress, signature, amountNfts, nftList } = req.body;
    const signingAddress = ethers.utils.verifyMessage( destinationAddress , signature );
    if(signingAddress != sbchOriginAddress) return
    const order = await createOrder(sbchOriginAddress, destinationAddress, signature, amountNfts, nftList);
    const orderId = order.id
    if(orderId) res.json({orderId});
    else res.status(404).send();
  } catch(error){
    error
  }
});

app.get("/all", async (req, res) => {
  const infoAllBridged = await getAllBridgeInfo();
  if (infoAllBridged) {
    res.json(infoAllBridged);
  } else {
    res.status(404).send();
  }
});

app.get("/recent", async (req, res) => {
  const infoRecentBridged = await getRecentBridgeInfo();
  if (infoRecentBridged) {
    res.json(infoRecentBridged);
  } else {
    res.status(404).send();
  }
});

app.get("/address/:originAddress", async (req, res) => {
  const infoAddress = await bridgeInfoEthAddress(req.params.originAddress);
  if (infoAddress) {
    res.json(infoAddress);
  } else {
    res.status(404).send();
  }
});

// initialize SBCH network provider
let provider = new ethers.providers.JsonRpcProvider('https://smartbch.greyh.at');
// initilize reapers contract
const reapersContract = new ethers.Contract(contractAddress, abi, provider);

// mainnet-js generates m/44'/0'/0'/0/0 by default so have to switch it
const walletClass = network == "mainnet" ? Wallet : TestNetWallet;
const wallet = await walletClass.fromSeed(seedphrase, derivationPathAddress);
console.log(`wallet address: ${wallet.getDepositAddress()}`);
const balance = await wallet.getBalance();
console.log(`Bch amount in walletAddress is ${balance.bch}bch or ${balance.sat}sats`);

// listen to all reaper transfers
const burnAddress = "0x000000000000000000000000000000000000dEaD"
const burnAddress2 = "0x0000000000000000000000000000000000000000"
reapersContract.on("Transfer", (from, to, amount, event) => {
  const erc721numberHex = event.args[2]?._hex
  const nftNumber = parseInt(erc721numberHex, 16);
  if(to != burnAddress && to !=burnAddress2) return
  console.log(`${ from } burnt reaper #${nftNumber}`);
  const timeBurned = new Date().toISOString();
  const burnInfo = {
    timeBurned,
    txIdSmartBCH: event?.transactionHash,
    nftNumber,
    sbchOriginAddress: from
  }
  writeInfoToDb(burnInfo);
});

async function tryBridging(sbchOriginAddress, destinationAddress, signatureProof){
  // if bridging is already happening, wait 2 seconds
  if(bridgingNft) {
    await new Promise(r => setTimeout(r, 2000));
    return await tryBridging(sbchOriginAddress, destinationAddress, signatureProof);
  } else {
    try{
      bridgingNft = true;
      const infoAddress = await bridgeInfoEthAddress(sbchOriginAddress);
      const listNftItems = infoAddress.filter(item => !item.timebridged)
      const listNftNumbers = listNftItems.map(item => item.nftnumber)
      if(!listNftNumbers.length) throw("empty list!")
      const txid = await bridgeNFTs(listNftNumbers, destinationAddress, signatureProof);
      bridgingNft = false;
      return txid
    } catch (error) { 
      console.log(error);
      bridgingNft = false;
      return
    }
  }
}

async function bridgeNFTs(listNftNumbers, destinationAddress, signatureProof){
  try{
    // create bridging transaction
    const mintRequests = [];
    listNftNumbers.forEach(nftNumber => {
      // vm numbers start counting from zero
      const vmNumber = bigIntToVmNumber(BigInt(nftNumber) - 1n);
      const nftCommitment = binToHex(vmNumber);
      const mintNftOutput = new TokenMintRequest({
        cashaddr: destinationAddress,
        commitment: nftCommitment,
        capability: "none",
        value: 1000,
      })
      mintRequests.push(mintNftOutput);
    })
    const { txId } = await wallet.tokenMint( tokenId, mintRequests );
    console.log(txId)
    nftsBridged += listNftNumbers.length;
    // create db entries
    const timeBridged = new Date().toISOString();

    listNftNumbers.forEach(nftNumber => {
      const bridgeInfo = {
        timeBridged,
        signatureProof,
        txIdBCH: txId,
        destinationAddress
      }
      addBridgeInfoToNFT(nftNumber, bridgeInfo);
    })
    return txId
  } catch (error) {
    console.log(error)
  }
}

app.listen(port, () => {
  console.log(`Server listening at ${url}`);
});