'use strict'

const { TransactionHandler } = require('sawtooth-sdk/processor/handler'),
	{
		InvalidTransaction,
		InternalError
	} = require('sawtooth-sdk/processor/exceptions'),
	crypto = require('crypto'),
	{ TextEncoder, TextDecoder } = require('text-encoding/lib/encoding')

const encoder = new TextEncoder('utf8'),
	decoder = new TextDecoder('utf8')

function hash(data) {
	return crypto
		.createHash('sha512')
		.update(data)
		.digest('hex')
}

const FAMILY_NAME = 'Calculator',
	NAMESPACE = hash(FAMILY_NAME).substring(0, 6)

function getAddress(publicKey) {
	const keyHash = hash(publicKey),
		nameHash = hash(FAMILY_NAME)
	return nameHash.slice(0, 6) + keyHash.slice(0, 64)
}

async function writeToStore(context, address, data) {
	const dataBytes = encoder.encode(data),
		entries = {
			[address]: dataBytes
		}
	// const attribute = [['result',data]]

	const Status = await context.setState(entries)
	context.addReceiptData(Buffer.from(Status, 'utf8'))
	return Status
}

function calculate(context, result, userPublicKey) {
	const address = getAddress(userPublicKey)
	return writeToStore(context, address, result)
}

//transaction handler class

class CalcHandler extends TransactionHandler {
	constructor() {
		super(FAMILY_NAME, ['1.0'], [NAMESPACE])
	}
	//apply function
	apply(transactionProcessRequest, context) {
		try {
			const header = transactionProcessRequest.header,
				userPublicKey = header.signerPublicKey,
				PayloadBytes = decoder.decode(transactionProcessRequest.payload),
				load = PayloadBytes.toString().split(','),
				Payload = JSON.parse(load),
				operator = Payload[0],
				first = Payload[1],
				second = Payload[2]
			let result = 0
			switch (operator) {
				case '+':
					result = first + second
					break
				case '-':
					result = first - second
					break
				case '*':
					result = first * second
					break
				case '/':
					result = first / second
					break
			}
			return calculate(context, result, userPublicKey)
		} catch (err) {
			// throw new InternalError(err)
		}
	}
}

module.exports = CalcHandler
