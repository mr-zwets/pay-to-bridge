CREATE TABLE bridge(
  id SERIAL PRIMARY KEY,
  timeBurned varchar(40),
  txIdSmartBCH varchar(80),
  sbchOriginAddress varchar(80),
  nftNumber integer,
  orderId integer
);
CREATE TABLE bridgeRequest(
  id SERIAL PRIMARY KEY,
  destinationAddress varchar(80),
  sbchOriginAddress varchar(80),
  signatureProof varchar(140),
  amountNfts integer,
  nftList integer[],
  promptTxId varchar(20),
  txIdBCH varchar(80),
  amountBchPaid varchar(15),
  timePaid varchar(40)
);