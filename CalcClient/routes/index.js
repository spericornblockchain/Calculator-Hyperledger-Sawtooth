const fetch = require('node-fetch'),
	express = require('express'),
	router = express.Router(),
	{ UserClient } = require('./UserClient'),
	config = require('../config/config.js')
const client = new UserClient()

/* GET home page. */
router.get('/', function(req, res, next) {
	res.render('index')
})
async function getReceipt(id) {
	let ReceiptRequest = config.api + '/receipts?id=',
		ReceiptResponse = await fetch((ReceiptRequest += id))
	return await ReceiptResponse.json()
}
router.post('/calculate', async (req, res, next) => {
	try {
		console.log('TCL: key', config.privKey)
		const operator = req.body.operator,
			first = req.body.first,
			second = req.body.second,
			key = config.privKey,
			transactionData = await client.calculate(operator, first, second, key),
			transactionId = transactionData.transactionIds[0]
		let idVar = setInterval(check, 10)
		let i = 0
		async function check() {
			const data = await getReceipt(transactionId)
			if (data && data.data) {
				clearInterval(idVar)
				console.log('times', i)
				const a = data.data[0].state_changes[0].value
				res.send({
					data: Buffer.from(a, 'base64').toString()
				})
			}
			i++
		}
	} catch (error) {}
})

module.exports = router
