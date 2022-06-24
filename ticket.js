const Run = require("run-sdk");
const fs = require("fs");
const fetch = require("node-fetch");
const { uuid } = require("uuidv4");

const purse = "L13VWD6yZVrs3RRWH41g8faicNxzWrzPChaD5syiiH2X9JDgkJQh";
const owner = "L5VrBXKwDNRzq4iG5S5cQ3PdAM8xFmqKYhVFw2EDSnsXTwuYPoP2";
const run = new Run({
	owner: owner,
	purse: purse,
	trust: "*",
	timeout: 60000,
	api: "run",
});
// console.log(run.purse.address);

const OrderLockLocation =
	"d6170025a62248d8df6dc14e3806e68b8df3d804c800c7bfb23b0b4232862505_o1";
//regular deploy  of SLBase NFT Class
const deploy = async () => {
	const OrderLock = await run.load(OrderLockLocation);
	class SLBaseNFT extends Jig {
		init(owner, no, metadata = {}) {
			const minting = caller === this.constructor;
			if (!minting) throw new Error("Must create using mint()");
			this.sender = caller && caller.owner ? caller.owner : null;
			if (no) {
				this.no = no;
				metadata.no = no;
			}
			if (metadata) {
				this.metadata = metadata;
			}
			if (owner) this.owner = owner;
			this.redeemStatus = false;
		}

		static mint(owner, metadata) {
			const classMetadata = this.metadata || {};
			this.total++;
			if (classMetadata.numbered) {
				return new this(owner, this.total, metadata);
			}
			return new this(owner, 0, metadata);
		}

		static updateMetadata(metadata) {
			this.metadata = metadata;
		}

		static send(to) {
			this.owner = to;
		}
	}

	SLBaseNFT.friends = [Run.extra.B, OrderLock];
	const tx = new Run.Transaction();
	tx.update(() => {
		run.deploy(SLBaseNFT);
	});
	const txid = await tx.publish();
	console.log("sl base class: ", { txid });
};

// first we deploy our base class of smartledger if we haven't already
// deploy();

//then we place it in location below
// SLBaseNFTClassLocation
const slBaseClass =
	"6d1605a41c9c8179b69ae0bb78bf89e6f0018cfad171ac8639fef06d9d81d38d";

//Ticketmint NFT Class
const TicketMintClass = async () => {
	const SLBaseNFTClass = await run.load(`${slBaseClass}_o1`);
	await SLBaseNFTClass.sync();
	const OrderLock = await run.load(OrderLockLocation);
	class TicketmintNFT extends SLBaseNFTClass {
		setMintTime(mintTime) {
			this.mintTime = mintTime;
		}
		setMetadata(metadata) {
			this.metadata = metadata;
		}
		setMessage(message) {
			this.message = message;
		}
		setSatoshis(amount) {
			this.satoshis = amount;
			this.backing = this.satoshis;
		}
		setEventDetails(event, issuer) {
			this.issuer = issuer;
			this.id = event.id;
			this.name = event.name;
			this.gps = event.gps;
			this.time = event.time;
			this.date = event.date;
		}
		withdraw() {
			this.satoshis = 0;
		}
		send(to) {
			this.owner = to;
		}
		redeem() {
			this.redeemStatus = true;
		}
	}
	TicketmintNFT.metadata = {
		emoji: "🎟️",
		description: "TicketMint Presents",
		symbol: "TMP",
		name: "TM Presents",
	};
	TicketmintNFT.sealed = true;
	TicketmintNFT.interactive = false;
	TicketmintNFT.friends = [Run.extra.B, OrderLock];
	const tx = new Run.Transaction();
	tx.update(() => {
		run.deploy(TicketmintNFT);
	});
	const txid = await tx.publish();
	console.log("TicketMint Class Mint: ", { txid });
};

//then we define our ticketclass as opposed to another type of nft
// TicketMintClass();

//berry txid
//class _o1
//ticketinstance _o2
//redeemed ticket _o1

//then we place our ticket class below...
const ticketmintNFTClass =
	"eb6abb19c5e8559c30d1e8c27a7d37feeb5a36eca46c8057833cbf7939e27235";

//tickemint instance
const ticketMintInstance = async (newOwner) => {
	const MintNft = await run.load(`${ticketmintNFTClass}_o2`);
	await MintNft.sync();
	// console.log(MintNft);
	const message =
		"Congratulations! This is an authentic, blockchain verified, TicketMint NFT Ticket";

	//amount of satoshis we are placing inside the nft, this is not required
	const amount = 50;

	//this is the txid of our deployed image for our nft...
	const image = await Run.extra.B.load(
		"0ab87e4aa3b1af9b63e2f1a9acdfb89c845abf4f30e1af0df402b7f7e565ef6e"
	);
	// "cf6e63e8d76c8a36dd1b5d54ce0799e952f98524e8bc1bd244b5548c60756794";
	//use getaddy function to return address

	let address = (newOwner = undefined ? run.owner.address : newOwner); //getaddy function is below
	const metadata = { image };
	const issuer = run.owner.pubkey;
	const time = "4:20pm";
	const mintTime = new Date().toString();
	const event = {
		name: "TMP",
		id: uuid(),
		gps: "NYC",
		time: time,
		date: "4-20-22",
	};
	//then we create a new run transaction instance
	const tx = new Run.Transaction();
	// and update it with our meta data etc
	tx.update(() => {
		const nft = MintNft.mint();
		nft.setEventDetails(event, issuer);
		nft.setMessage(message);
		nft.setMetadata(metadata);
		nft.setMintTime(mintTime);
		nft.setSatoshis(amount);
	});
	// console.log(tx);
	//next we publish our transaction
	const t = await tx.publish();
	//and return our TXID
	console.log("Your Ticket TXID: ", { t });
	if (newOwner) send(address, t);
	return t;
};
//single ticket minting function
//here is where we mint a single ticket instance...

// ticketMintInstance();

//example ticket txid 3aac57f54d222cc2bb21934a0a13e99f7f3b4f96e8c9d78da9fc7984841f0a9c


//redeem ticketmint ticket
const redeemTicket = async (ticketToRedeem) => {
	const ticket = await run.load(`${ticketToRedeem}_o2`);
	await ticket.sync;
	const ticketTx = new Run.Transaction();
	ticketTx.update(() => {
		ticket.redeem();
	});
	// console.log(tx);
	const redeemTx = await ticketTx.publish();
	console.log(redeemTx);
	return redeemTx;
};

const ticketExample =
	"8cc6dd997e0bb95eb0c7045c06402f985adee99ed7a2207235a637d17837678a";
const redeemedTicketExample =
	"67584bf403d20e445abc01d66e788ebc687806441bf1fd078ffdb1d65d6ce3ea";

const reinstateExample =
	"fe7b6b7f62258e31b76e6b9f11fde2fe97ef2bcf5aac2e109cd1072df416eaec";

// redeemTicket(ticketExample);

//check ticketmint tx details
const checkTicketDetails = async (ticketLocation) => {
	//this is checking details for redeemed or unredeemed by checking first the unredeemed
	const ticketDetails = await run.load(`${ticketLocation}_o2`);
	await ticketDetails.sync();
	//get the updated/synced status of ticket and compare locations to see if newer version
	let ticketUpdate;
	if (ticketDetails.location != ticketDetails.origin) {
		ticketUpdate = await run.load(`${ticketDetails.location}`);
		await ticketUpdate.sync();
		console.log("redeem", ticketUpdate.redeemStatus);
	} else {
		console.log("Ticket not redeemed yet");
	}
	// console.log(ticketUpdate);
	// console.log("Ticket Full Details", ticketDetails);
	// console.log("base64", ticketDetails.metadata.image.base64Data);
	console.log("Event Name: ", ticketDetails.name);
	console.log("Issuer: ", ticketDetails.issuer);
	console.log("Event ID: ", ticketDetails.id);
	console.log("Event Date: ", ticketDetails.date);
	console.log("Event Time", ticketDetails.time);
	console.log("Event Location: ", ticketDetails.gps);
	console.log(`Bitcoin Backing: ${ticketDetails.backing} Satoshis`);
	console.log("NFT Blockchain Origin: ", ticketDetails.origin);
	console.log("NFT Blockchain Current Location: ", ticketDetails.location);
	console.log("Minting Time: ", ticketDetails.mintTime);

	console.log(
		"Redeem status",
		ticketUpdate ? ticketUpdate.redeemStatus : ticketDetails.redeemStatus
	);
};

// checkTicketDetails(ticketExample);

const checkReinstate = async (ticketCheck) => {
	//redeemed tickets will have _o1
	const nft = await run.load(`${ticketCheck}_o1`);
	if (nft) {
		await nft.sync();
		console.log(nft);
		// const tx = new Run.Transaction();
		// tx.update(() => {
		// 	nft.mint();
		// });
		// const checkTx = await tx.publish();
		// console.log("check reinstate", checkTx);
	}
};

// checkReinstate(redeemedTicketExample);

//destroy NFT

// const destroy = async (nftToDestroy) => {
// 	const nft = await run.load(`${nftToDestroy}_o1`);
// 	if (nft) {
// 		await nft.sync();
// 		console.log(nft);
// 		await nft.sync();
// 		const dx = new Run.Transaction();
// 		dx.update(() => {
// 			nft.destroy();
// 		});
// 		const d = await dx.publish();
// 		console.log(d);
// 	}
// };

// destroy(ticketExample);

const send = async (paymail, nft) => {
	const sendNft = await run.load(`${nft}_o2`);
	await sendNft.sync();

	//this is for getting address of any paymail, but is dangerous because we might spend utxos that are not nfts
	// const owner2 = await getAddy(`${paymail}`);
	// console.log(owner2);
	// console.log(sendNft);

	//instead we grab the relay jig address
	const owner2 = await getRelayPaymail(`${paymail}`);

	const txSend = new Run.Transaction();
	txSend.update(() => {
		sendNft.send(owner2);
	});
	// console.log(txSend);
	const t2 = await txSend.publish();
	console.log({ t2 });
};

//get paymailSend address - this works for all wallets, but relay needs other function for run owner
const getAddy = async (y) => {
	let addy = await fetch(`https://api.polynym.io/getAddress/${y}`);
	let res = await addy.json();
	// console.log(res.address);
	return res.address;
};

//get run owner address for relay paymail(different than bsv send address)
const getRelayPaymail = async (z) => {
	const s = await fetch(`https:/api.relayx.io/v1/paymail/run/${z}`);
	const ses = await s.json();
	const paymail = await ses.data;
	// console.log("relay", paymail);
	return paymail;
};
// getRelayPaymail("dappinstitute@relayx.io");

// get list of all currently owned nftyGiftz
// const getGifts = async () => {
// 	await run.inventory.sync();
// 	const myGifts = await run.inventory.jigs;
// 	let giftList = [];
// 	let locationList = [];
// 	//filter greater than 0 satoshi gifts
// 	for (i = 0; i < myGifts.length; i++) {
// 		if (myGifts[i].satoshis > 0) {
// 			const satoGifts = {
// 				loc: myGifts[i].location,
// 				sats: myGifts[i].satoshis,
// 				message: myGifts[i].message,
// 				meta: myGifts[i].metadata,
// 			};
// 			locationList.push(myGifts[i].location);
// 			giftList.push(satoGifts);
// 		}
// 	}
// 	giftList.join("");
// 	let gifts = [...new Set(giftList)];
// 	locationList.join("");
// 	let locationSet = [...new Set(locationList)];
// 	console.log("giftlist", gifts);
// 	console.log("locationList", locationList.length, locationList);
// 	console.log("locSet", locationSet.length, locationSet);
// 	return locationList;
// };
// getGifts();

//withdraw all satoshis from your all your gifts
// const withdrawAllNFTS = async () => {
// 	const myNfts = await getGifts();
// 	for (i = 0; i < myNfts.length; i++) {
// 		const redeemNft = await run.load(`${myNfts[i]}`);
// 		await redeemNft.sync();
// 		console.log(redeemNft);
// 		const txRedeem = new Run.Transaction();
// 		txRedeem.update(() => {
// 			redeemNft.withdraw();
// 		});
// 		const t3 = await txRedeem.publish();
// 		console.log({ t3 });
// 	}
// };
// withdrawAllNFTS();

// const nftExamine = async (m) => {
// 	const thisNft = await run.load(m);
// 	await thisNft.sync();
// 	let nftObject = {
// 		image: thisNft.metadata.image.base64Data,
// 		location: thisNft.location,
// 		message: thisNft.message,
// 		sats: thisNft.satoshis,
// 	};
// 	console.log(nftObject);
// 	return nftObject;
// };

const loc =
	"ea399b913266740922ea5383c3188ee898b18e7482579ec180309dd4ed1509d2_o2";
// nftExamine(loc);

const main = async () => {
	const bFile = await BFile.fromFilePath("/assets/ticketmint.png");
	const txid = await publish(bFile, networks.MAINNET, purse);
	console.log(txid);
};

// main();
