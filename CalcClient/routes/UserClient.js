const { createHash } = require('crypto'),
	{ CryptoFactory, createContext } = require('sawtooth-sdk/signing'),
	protobuf = require('sawtooth-sdk/protobuf'),
	fetch = require('node-fetch'),
	{ Secp256k1PrivateKey } = require('sawtooth-sdk/signing/secp256k1'),
	{ TextEncoder } = require('text-encoding/lib/encoding'),
	encoder = new TextEncoder('utf8'),
	FAMILY_NAME = 'Calculator',
	config = require('../config/config.js')
function hash(v) {
	return createHash('sha512')
		.update(v)
		.digest('hex')
}

function getSigner(privateKey) {
	const context = createContext('secp256k1'),
		secp256k1pk = Secp256k1PrivateKey.fromHex(privateKey.trim())
	return new CryptoFactory(context).newSigner(secp256k1pk)
}

function getAddress(publicKey) {
	const keyHash = hash(publicKey),
		nameHash = hash(FAMILY_NAME)
	return nameHash.slice(0, 6) + keyHash.slice(0, 64)
}

async function createTransaction(
	familyName,
	inputList,
	outputList,
	signer,
	payload,
	familyVersion = '1.0'
) {
	const payloadBytes = encoder.encode(payload)
	//create transaction header
	const transactionHeaderBytes = protobuf.TransactionHeader.encode({
		familyName: familyName,
		familyVersion: familyVersion,
		inputs: inputList,
		outputs: outputList,
		signerPublicKey: signer.getPublicKey().asHex(),
		nonce: '' + Math.random(),
		batcherPublicKey: signer.getPublicKey().asHex(),
		dependencies: [],
		payloadSha512: hash(payloadBytes)
	}).finish()
	// create transaction
	const transaction = protobuf.Transaction.create({
		header: transactionHeaderBytes,
		headerSignature: signer.sign(transactionHeaderBytes),
		payload: payloadBytes
	})
	const transactions = [transaction]
	//create batch header
	const batchHeaderBytes = protobuf.BatchHeader.encode({
		signerPublicKey: signer.getPublicKey().asHex(),
		transactionIds: transactions.map((txn) => txn.headerSignature)
	}).finish()
	const batchSignature = signer.sign(batchHeaderBytes)
	//create batch
	const batch = protobuf.Batch.create({
		header: batchHeaderBytes,
		headerSignature: batchSignature,
		transactions: transactions
	})
	//create batchlist
	const batchListBytes = protobuf.BatchList.encode({
		batches: [batch]
	}).finish()
	return sendTransaction(batchListBytes, batchHeaderBytes)
}

/*
function to submit the batchListBytes to validator
*/
function sendTransaction(batchListBytes, batchHeaderBytes) {
	const fetchapi = config.api + '/batches'
	const resp = fetch(fetchapi, {
		method: 'POST',
		headers: { 'Content-Type': 'application/octet-stream' },
		body: batchListBytes
	})
	return batchHeaderBytes
	// console.log('response', resp)
}

class UserClient {
	async calculate(action, first, second, key) {
		try {
			const signer = getSigner(key),
				publicKey = signer.getPublicKey().asHex(),
				address = getAddress(publicKey),
				inputAddressList = [address],
				outputAddressList = [address],
				load = [action, first, second],
				payload = JSON.stringify(load),
				res = await createTransaction(
					FAMILY_NAME,
					inputAddressList,
					outputAddressList,
					signer,
					payload
				)
			return protobuf.BatchHeader.decode(res)
		} catch (error) {
			console.error(error)
		}
	}
}

module.exports = {
	UserClient
}

// const config = {
// 	privKey: 'f47168f4aaec899c8a6b1bc9c75d4b28514ae293bc29860c4b07bf771c3890bc',
// 	api: 'http://rest-api:8008'
// }
// module.exports = config
