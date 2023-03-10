import net from 'net';
import crypto from 'crypto';

export default function LightningRPC(path)
{
	this.path = path;
	this.socket = openSocketConnection(path);
	this.buffer = '';

	this.call = function(method, params, filter, callback) {
		this.currentCallback = callback;
		const id = crypto.randomBytes(16).toString("hex");
		const message = JSON.stringify({jsonrpc: "2.0", method, params, filter, id});
		this.socket.write(message);
	}

	this.listinvoices = function(label) {
		return new Promise((resolve, reject) => {
			this.call("listinvoices", label, undefined, (response, error) => {
				if (error || response?.result === 'undefined') {
					console.log("Error getting invoices", error)
					reject(error);
				} else {
					const invoices = response?.result;
					resolve(invoices);
				}
			});
		});
	}

	this.waitanyinvoice = function(index) {
		return new Promise((resolve, reject) => {
		this.call("waitanyinvoice", index, undefined, (response, error) => {
			if (error || response?.result === 'undefined') {
				console.log("Error getting invoices", error)
				reject(error);
			} else {
				const res = response?.result;
				resolve(res);
			}
		});
		});
	}

	this.filteredInvoices = function(filter) {
		return new Promise((resolve, reject) => {
		this.call("listinvoices", {}, filter, (response, error) => {
			if (error || response?.result?.invoices === 'undefined') {
				console.log("Error getting invoices", error)
				reject(error);
			} else {
				const invoices = response?.result?.invoices;
				resolve(invoices);
			}
		});
		});
	}

	this.invoice = function(msatoshi, description) {
		return new Promise((resolve, reject) => {
			const params = {
				"msatoshi": msatoshi,
				"label": crypto.randomBytes(16).toString("hex"),
				"description": description,
				"expiry": 1422,
				"deschashonly": true
			};
//			this.call("invoice", params, {bolt11: true}, (response, error) => {
			this.call("invoice", params, undefined, (response, error) => {
				if (error || response?.result?.bolt11 === 'undefined') {
					console.log("Error creating invoice", error)
					reject(error);
				} else {
					const bolt11 = response?.result?.bolt11;
					console.log("Invoice created");
					console.log(response.result)
					resolve(bolt11);
				}
			});
		});
	}

	this.socket.on('data', (data) => {
		this.handleJsonChunks(data, (json) => {
			if (json?.error) {
				this.currentCallback(null, json.error);
			} else {
				this.currentCallback(json);
			}
		});
	});

	this.socket.on('error', (err) => {
		console.log('Error connecting to Lightning RPC', err);
		this.socket.destroy();
	});

	this.handleJsonChunks = function (data, onDataComplete) {
		try {
			this.buffer += data.toString();
			let json = JSON.parse(this.buffer);
			onDataComplete(json);
			this.buffer = '';
		} catch (err) {
			// The buffer does not contain a complete JSON object yet, so wait for more data
		}
	}

	function openSocketConnection(path) {
		const socket = net.createConnection(path, () => {
			console.log('Connected to Lightning RPC');
		})
		return socket;
	}
}

