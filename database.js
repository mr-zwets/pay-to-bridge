import pg from "pg";
import * as dotenv from "dotenv";
dotenv.config();

const { Pool } = pg;
const pool = new Pool();

export async function writeInfoToDb(infoObj){
  try {
    let allKeys = "";
    let allValues = "";
    for (const key in infoObj) {
      allKeys += key + ", ";
      const nextValue =
        typeof infoObj[key] == "string" ? `'${infoObj[key]}'` : infoObj[key];
      allValues += nextValue + ", ";
    }
    allKeys = allKeys.slice(0, -2);
    allValues = allValues.slice(0, -2);
    const result = await pool.query(
      `INSERT INTO bridge (${allKeys}) VALUES(${allValues}) RETURNING *;`
    );
    return result.rows[0];
  } catch (e) {
    console.log(e);
  }
}

export async function getAllBridgeInfo(){
  try {
    const result = await pool.query(`SELECT * FROM bridge ORDER BY id DESC;`);
    return result.rows;
  } catch (e) {
    console.log(e);
  }
}

export async function getRecentBridgeInfo(){
  try {
    const result = await pool.query(`SELECT * FROM bridge ORDER BY id DESC LIMIT 20;`);
    return result.rows;
  } catch (e) {
    console.log(e);
  }
}

export async function bridgeInfoEthAddress(ethAddress){
  try {
    const result = await pool.query(`SELECT * FROM bridge WHERE sbchOriginAddress='${ethAddress}';`);
    return result.rows;
  } catch (e) {
    console.log(e);
  }
}

export async function checkAmountBridgedDb() {
  try {
    const result = await pool.query(`SELECT * FROM bridge WHERE txIdBCH IS NOT NULL;`);
    return result.rows.length;
  } catch (e) {
    console.log(e);
  }
}

export async function addBridgeInfoToNFT(nftNumber, infoObj) {
  try {
    const { timeBridged, signatureProof, txIdBCH, destinationAddress } = infoObj;
    const result = await pool.query(
      `UPDATE bridge SET timeBridged='${timeBridged}', signatureProof='${signatureProof}', txIdBCH='${txIdBCH}', destinationAddress='${destinationAddress}' WHERE nftNumber='${nftNumber}' RETURNING *;`
    );
  } catch (e) {
    console.log(e);
  }
}

export async function createOrder(sbchOriginAddress, destinationAddress, signatureProof, amountNfts, nftList) {
  try{
    const result = await pool.query(
      `INSERT INTO bridgeRequest (sbchOriginAddress, destinationAddress, signatureProof, amountNfts) VALUES('${sbchOriginAddress}', '${destinationAddress}', '${signatureProof}', ${amountNfts}, array[${nftList}]) RETURNING *;`
    );
    return result.rows[0];
  } catch (e) {
    console.log(e);
  }
}

export async function getOrderById(orderId) {
  try{
    const result = await pool.query(
      `SELECT * FROM bridgeRequest WHERE orderId = ${orderId};`
    );
    return result.rows[0];
  } catch (e) {
    console.log(e);
  }
}

export async function addPaymentInfoToOrder(orderId, paymentObj) {
  try{
    const {prompttxid, amountbchpaid, timepaid} = paymentObj
    const result = await pool.query(
      `UPDATE bridgeRequest SET prompttxid='${prompttxid}', amountbchpaid='${amountbchpaid}', timepaid='${timepaid}' WHERE id=${orderId} RETURNING *;`
    );
    return result.rows[0];
  } catch (e) {
    console.log(e);
  }
}

export async function addTxIdToOrder(orderId, txid) {
  try{
    const result = await pool.query(
      `UPDATE bridgeRequest SET txIdBCH='${txid}' WHERE id=${orderId} RETURNING *;`
    );
    return result.rows[0];
  } catch (e) {
    console.log(e);
  }
}

export async function addOrderIdToNft(nftNumber, orderId) {
  try{
    const result = await pool.query(
      `UPDATE bridge SET orderId='${orderId}' WHERE nftNumber=${nftNumber} RETURNING *;`
    );
    return result.rows[0];
  } catch (e) {
    console.log(e);
  }
}
