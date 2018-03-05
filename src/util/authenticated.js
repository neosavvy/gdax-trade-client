const Gdax = require('gdax');

class ExtendedAuthenticatedClient extends Gdax.AuthenticatedClient {
    constructor(key, secret, passphrase, apiURI, options = {}) {
        super(key, secret, passphrase, apiURI);
    }

    listPositions(params, callback) {
        return this.get(['position'], callback);
    }

}

module.exports = ExtendedAuthenticatedClient