/**
 * Before running this file,
 * 1. `yarn install` to install packages
 * 2. Please use the provided docker-compose file to initiate the Iroha + Postgres environment
 * 3. You have to wait ~ 35 seconds for the Iroha container to be ready.
 * 4. Then, run this script with: `yarn build && npx ts-node example/chain.ts`
 * @see https://github.com/hyperledger/iroha-javascript
 */
/* eslint-disable no-console */

import grpc from "grpc";
import {
  QueryService_v1Client as QueryService,
  CommandService_v1Client as CommandService,
  CommandService_v1Service,
} from "../lib/proto/endpoint_grpc_pb";
import commands from "../lib/commands";
import queries from "../lib/queries";
import { TxBuilder, BatchBuilder } from "../lib/chain";

//Iroha credentials
const IROHA_ADDRESS = "localhost:50051";
const adminPriv =
  "f101537e319568c765b2cc89698325604991dca57b9716b58016b253506cab70";
const testPriv =
  "7e00405ece477bb6dd9b03a78eee4e708afc2f5bcdce399573a5958942f4a390";
//init command and query Services
const commandService = new CommandService(
  IROHA_ADDRESS,
  grpc.credentials.createInsecure(),
  { deadline: "3000" }
);
const queryService = new QueryService(
  "localhost:50051",
  grpc.credentials.createInsecure()
);
const commandOptions = {
  privateKeys: [adminPriv], // Array of private keys in hex format
  creatorAccountId: "admin@test", // Account id, ex. admin@test
  quorum: 1,
  commandService: commandService,
  timeoutLimit: 5000, // Set timeout limit
};
const commandOptions2 = {
  privateKeys: [adminPriv], // Array of private keys in hex format
  creatorAccountId: "admin@test", // Account id, ex. admin@test
  quorum: 2,
  commandService: commandService,
  timeoutLimit: 5000, // Set timeout limit
};
const queryOptions = {
  privateKey: adminPriv,
  creatorAccountId: "admin@test",
  queryService: queryService,
  timeoutLimit: 5000,
};

//the setup
const firstTx = new TxBuilder()
  .addSignatory({
    accountId: "admin@test",
    publicKey:
      "716fe505f69f18511a1b083915aa9ff73ef36e6688199f3959750db38b8f4bfc",
  })
  .addMeta("admin@test", 1).tx;

const secondTx = new TxBuilder()
  .setAccountQuorum({
    accountId: "admin@test",
    quorum: 2,
  })
  .addMeta("admin@test", 1).tx;

new BatchBuilder([firstTx, secondTx])
  .setBatchMeta(0)
  .sign([adminPriv], 0)
  .sign([adminPriv], 1)
  .send(commandService)
  .then((res) => console.log(res))
  .catch((err) => console.error(err));

/** Let's do a pending transaction. Note that we pass in commandOptions2(quorum=2, but only 1 signature/priv key)
 * This leads to a pending transaction due to insufficient no. of signatures according to Iroha's doc:
 * @see https://iroha.readthedocs.io/en/main/concepts_architecture/glossary.html?highlight=pending#pending-transactions
 * Note that this command will end up as being stuck.
 */
commands
  .createAsset(commandOptions2, {
    assetName: "coolcoin",
    domainId: "test",
    precision: 3,
  })
  .then((res: any) => {
    //this line will not get printed!!
    console.log(
      "Print a line if the generating pending transaction command is resolved."
    );
    return console.log(res);
  })
  .catch((err) => {
    return console.log(err);
  });

// queries
//   .getPendingTransactions(queryOptions, {
//     pageSize: 5,
//     firstTxHash: undefined,
//     ordering: {
//       field: undefined,
//       direction: undefined,
//     },
//   })
//   .then((res: any) => {
//     return console.log(res[0].payload.reducedPayload.commandsList);
//   })
//   .catch((err) => {
//     return console.log(err);
//   });
