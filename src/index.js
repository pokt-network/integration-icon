/**
 * Example application that is a data consumer of the Icon blockchain through
 * the Pocket Network.
 * 
 * https://docs.pokt.network/docs/what-is-pocket-network
 * https://pokt.network
 */
const PocketJS = require('@pokt-network/pocket-js')
const IconService = require('icon-sdk-js')

const { IconWallet, IconBuilder, IconAmount, IconConverter, SignedTransaction } = IconService

/**
 * Supported networks: Icon Testnet (Zicon), Icon Mainnet
 * 
 * https://docs.pokt.network/docs/supported-networks
 * https://www.icondev.io/docs/testnet
 */
const iconChainID = "d9d77bce50d80e70026bd240fb0759f08aab7aee63d0a6d98c545f2b5ae0a0b8"
const iconNetworkID = 80

// Addresses on the Zicon testnet used for example transactions
const iconWalletAddress1 = 'hx902ecb51c109183ace539f247b4ea1347fbf23b5'
const iconPrivateKey1 = '38f792b95a5202ab431bfc799f7e1e5c74ec0b9ede5c6142ee7364f2c84d72f6'
const iconWalletAddress2 = 'hxd008c05cbc0e689f04a5bb729a66b42377a9a497'

// Address on the Pocket blockchain to use for Application Authentication Tokens
const pocketPrivateKey = '22c6cf663e9932bb691b1432c9d8dae906d2609ff85e08792fceb10b2a0e9feffa457de4393c386ae3c4dde8703bf25080cc9909d98b55fbc7d6f2ca057450a2'
const pocketPublicKey = 'fa457de4393c386ae3c4dde8703bf25080cc9909d98b55fbc7d6f2ca057450a2'
const pocketAddress = '2d089de210afd5176b46b38b7c5f4b1ce63622bf'
const pocketPassphrase = 'yo'

// Setup the Pocket Network
const pocketNode = new URL('http://0.0.0.0:8081')
const { Configuration, PocketAAT, HttpRpcProvider, RpcError } = PocketJS
const pocketInstance = new PocketJS.Pocket([pocketNode], new HttpRpcProvider(pocketNode), new Configuration(5, 100000, 10000000))

class IcxTransactionExample {
    /**
     * Creates a new IconService from the Icon SDK using the Pocket Provider.
     * 
     * @param {pocketAAT} pocketAAT - Application Authentication Token
     */
	constructor(pocketAAT) {
        this.provider = new IconService.PocketProvider("/api/v3", this.relay, pocketAAT)
        this.iconService = new IconService(this.provider)
        this.wallet = new IconWallet(Buffer.from(iconPrivateKey1, 'hex'))
        this.txHash = ''
    }
    
    /**
     * The relay function is passed to the Icon SDK as a callback for servicing the
     * SDK's HTTP requests.
     * 
     * @param {string} url - Icon API URL
     * @param {string} body - Request body to relay
     * @param {pocketAAT} pocketAAT - AAT to use for bandwidth
     */
    async relay(url, body, pocketAAT) {
        try {
            const relayResponse = await pocketInstance.sendRelay(
                body, 
                iconChainID, 
                pocketAAT, 
                undefined, 
                undefined, 
                "POST", 
                url
            )
            if (relayResponse instanceof RpcError) {
                console.log("Relay error:", relayResponse.message)
                throw new Error(relayResponse.message)
            }
            return JSON.parse(relayResponse.response)
        } catch(e) {
            return e
        }
    }   
    
    /**
     * Returns the current balance of a specific address
     * 
     * @param {string} address - Icon address for balance retrieval
     */
    async getWalletBalance(address) {
        const balance = await this.iconService.getBalance(address).execute()
        return balance
    }

    /**
     * Simple transaction send
     * 
     * @param {string} receivingAddress 
     */
    async sendTransaction(receivingAddress) {
        const transaction = await this.buildICXTransaction(receivingAddress)
        const signedTransaction = new SignedTransaction(transaction, this.wallet)
        this.txHash = await this.iconService.sendTransaction(signedTransaction).execute()
    }

    /**
     * ICX transaction builder
     * 
     * @param {string} receivingAddress 
     */
    async buildICXTransaction(receivingAddress) {
        const { IcxTransactionBuilder } = IconBuilder
        const icxTransactionBuilder = new IcxTransactionBuilder()

        const transaction = icxTransactionBuilder
            .nid(IconConverter.toBigNumber(iconNetworkID))
            .from(this.wallet.getAddress())
            .to(receivingAddress)
            .value(IconAmount.of(0.0001, IconAmount.Unit.ICX).toLoop())
            .stepLimit(1000000)
            .timestamp((new Date()).getTime() * 1000)
            .version(IconConverter.toBigNumber(3))
            .build()   
        return transaction
    }
}

// Create an AAT and use it for the example Icon transactions
const pocketAAT = PocketAAT.from('0.0.1', pocketPublicKey, pocketPublicKey, pocketPrivateKey)
const demo = new IcxTransactionExample(pocketAAT);

pocketInstance.keybase.importAccount(Buffer.from(pocketPrivateKey, 'hex'), pocketPassphrase).then(() => {
    pocketInstance.keybase.unlockAccount(pocketAddress, pocketPassphrase, 0).then(() => {
        (async () => {
            try {
                const balance = await demo.getWalletBalance(iconWalletAddress1)
                console.log("Wallet balance:", balance);
                (async () => {
                    try {
                        const txn = await demo.sendTransaction(iconWalletAddress2)
                        console.log("Transaction:", demo.txHash)
                    } catch(e) {
                        console.log(e)
                    }
                })()
            } catch(e) {
            console.log(e)
            }
        })()
    })
})