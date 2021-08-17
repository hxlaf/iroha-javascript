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
    grpc.credentials.createInsecure()
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
    timeoutLimit: 10000, // Set timeout limit
};

const queryOptions = {
    privateKey: adminPriv,
    creatorAccountId: "admin@test",
    queryService: queryService,
    timeoutLimit: 10000,
};

/**
 * Section1 (setup)
 * 1. add an additional signature to admin account.
 * 2. make admin account's quorum to be 2
 */
const firstTx = new TxBuilder() //Add the second public key(signature) to 'admin@test' account
    .addSignatory({
        accountId: "admin@test",
        publicKey:
            "716fe505f69f18511a1b083915aa9ff73ef36e6688199f3959750db38b8f4bfc",
    })
    .addMeta("admin@test", 1).tx;

const secondTx = new TxBuilder() //With the extra public key(signature), we can set the quorum of 'admin@test' to 2
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

// /**
//  * Section 2: (pendingTx) This is the third pending transaction that we are targeting.
//  */
// const thirdTx = new TxBuilder()
//     .createAccount({
//         accountName: "user5",
//         domainId: "test",
//         publicKey:
//             "0000000000000000000000000000000000000000000000000000000000000001",
//     })
//     .addMeta("admin@test", 2).tx;

// const promise1 = new Promise((resolve, reject) => {
//     setTimeout(resolve, 100, "one");
//     new BatchBuilder([thirdTx])
//         .setBatchMeta(0)
//         .sign([adminPriv], 0)
//         .send(commandService)
//         .then((res) => console.log(res))
//         .catch((err) => console.error(err));
// });

// const promise2 = new Promise((resolve, reject) => {
//     setTimeout(resolve, 3000, "two");
//     queries
//         .getPendingTransactions(queryOptions, {
//             pageSize: 5,
//             firstTxHash: undefined,
//             ordering: {
//                 field: undefined,
//                 direction: undefined,
//             },
//         })
//         .then((res: any) => {
//             return console.log(res[0].payload.reducedPayload.commandsList);
//         })
//         .catch((err) => {
//             return console.log(err);
//         });
// });

// const promise3 = new Promise((resolve, reject) => {
//     setTimeout(resolve, 6000, "three");
//     new BatchBuilder([thirdTx])
//         .setBatchMeta(0)
//         .sign([testPriv], 0)
//         .send(commandService)
//         .then((res) => console.log(res))
//         .catch((err) => console.error(err));
// });

// Promise.race([promise1, promise2, promise3]).then((value) => {
//     console.log(value);
// });
