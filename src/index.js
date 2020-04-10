/**
 * Example application that is a data consumer of the Icon blockchain through
 * the Pocket Network.
 * 
 * https://docs.pokt.network/docs/what-is-pocket-network
 * https://pokt.network
 */
const PocketProvider = require('icon-pocket-provider')
const IconService = require('icon-sdk-js')

const { Configuration, PocketAAT, HttpRpcProvider } = PocketProvider
const { IconWallet, IconBuilder, IconAmount, IconConverter, SignedTransaction } = IconService

/**
 * Supported networks: Icon Testnet (Zicon), Icon Mainnet
 * 
 * iconChainID: https://docs.pokt.network/docs/supported-networks
 * iconNetworkID: https://www.icondev.io/docs/testnet
 */
const iconChainID = "d9d669583c2d2a88e54c0120be6f8195b2575192f178f925099813ff9095d139"
const iconNetworkID = 1
const iconAPIPath = "/api/v3"

// Addresses on the Zicon testnet used for example transactions
const iconWalletAddress1 = 'hxcd6f04b2a5184715ca89e523b6c823ceef2f9c3d'
const iconPrivateKey1 = '38f792b95a5202ab431bfc799f7e1e5c74ec0b9ede5c6142ee7364f2c84d72f6'
const iconWalletAddress2 = 'hxd008c05cbc0e689f04a5bb729a66b42377a9a497'

// Address on the Pocket blockchain to use for Application Authentication Tokens
const pocketPrivateKey = '25a42ad8ef4b551c7eab68590de53419d9059e4ccdc471f71d1f37a604542ef16e2cda5a6b6709f562dfbc7628099878fabb12d4943261be3cbb76da0bced999'
const pocketPublicKey = '6e2cda5a6b6709f562dfbc7628099878fabb12d4943261be3cbb76da0bced999'
const pocketAddress = '96de69d684a1d3ed6cccd5f70d99d77e28bda55b'
const pocketPassphrase = 'yo'

// Setup the Pocket Network
const pocketNode = new URL('http://node1.testnet.pokt.network:8081')
const pocketInstance = new PocketProvider.Pocket([pocketNode], new HttpRpcProvider(pocketNode), new Configuration(5, 1000000))

/**
 * Boilerplate class based on ICON-SDK-JS quickstart examples.
 * 
 * The one change needed to use Pocket Network is to instantiate a Pocket Provider:
 * this.provider = new PocketProvider.PocketProvider(iconChainID, iconAPIPath, pocketInstance, pocketAAT)
 * 
 * instead of a new IconProvider().
 */
class IcxTransactionExample {
    /**
     * Creates a new IconService from the Icon SDK using the Pocket Provider.
     * 
     * @param {pocketAAT} pocketAAT - Application Authentication Token
     */
	constructor(iconChainID, iconAPIPath, pocketInstance, pocketAAT) {
        this.provider = new PocketProvider.PocketProvider(iconChainID, iconAPIPath, pocketInstance, pocketAAT)
        this.iconService = new IconService(this.provider)
        this.wallet = new IconWallet(Buffer.from(iconPrivateKey1, 'hex'))
        this.txHash = ''
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

pocketInstance.keybase.importAccount(Buffer.from(pocketPrivateKey, 'hex'), pocketPassphrase).then(() => {
    pocketInstance.keybase.unlockAccount(pocketAddress, pocketPassphrase, 0).then(() => {
        (async () => {
            try {
                // Create an AAT and use it for the example Icon transactions
                const pocketAAT = await PocketAAT.from('0.0.1', pocketPublicKey, pocketPublicKey, pocketPrivateKey)
                console.log(pocketAAT)
                
                const demo = new IcxTransactionExample(iconChainID, iconAPIPath, pocketInstance, pocketAAT);
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

console.log("Running...")