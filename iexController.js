const socketClient = require('socket.io-client');
const moment = require('moment');
const URL = 'https://ws-api.iextrading.com/1.0/last';
const SYMBOLS = 'FB,AAPL,AMZN,MSFT,IBM,COKE,TSLA,MCD,TSM,INTC';
const WELCOME = 'Welcome!! (1) subscribe: subscribe data, (2) unsubscribe: unsubscribe data';


class OHLC {
    constructor(price) {
        this.symbol = price.symbol;
        this.open = null;
        this.high = null;
        this.low = null;
        this.close = null;
        this.time = price.time;
    }
    update(price) {
        if(this.isNewMinute(price.time)) {
            let data = null;
            if(this.open !== null) {
                data = {
                    symbol: this.symbol,
                    open: this.open,
                    high: this.high,
                    low: this.low,
                    close: this.close,
                    time: this.time
                };
            }
            this.init(price);
            return data;
        }else {
            if(this.open !== null) {
                if(price.price > this.high) {
                    this.high = price.price;
                }

                if(price.price < this.low) {
                    this.low = price.price;
                }

                this.close = price.price;
                this.time = price.time;
            }
            return null;
        }
    }

    init(price) {
        this.open = price.price;
        this.high = price.price;
        this.low = price.price;
        this.close = price.price;
        this.time = price.time;
    }

    isNewMinute(time) {
        let t1 = new moment(time).format('yyyy-MM-DD HH:mm');
        let t2 = new moment(this.time).format('yyyy-MM-DD HH:mm');
        return t1 !== t2;
    }
}

class IEXConnection {
    constructor(url) {
        this.socket = socketClient(url);
        this.socket.on('connect', () => {
            console.log('connected');
            this.socket.emit('subscribe', SYMBOLS);
        });
        this.socket.on('disconnect', reason => {
            console.log('disconnect: ' + reason);
            if (reason === 'io server disconnect') {
                this.socket.connect();
            }
        });

        this.socket.on('message', message => {
            console.log(message);
            let price = JSON.parse(message);
            this.lastSubscribeMap.forEach(listener => {
                if(listener && listener.subscribe) {
                    listener(price);
                }
            });

            let ohlc = this.ohlcMap.get(price.symbol);
            if(ohlc) {
                let data = ohlc.update(price);
                if(data) {
                    this.ohlcSubscribeMap.forEach(listener => {
                        if(listener && listener.subscribe) {
                            listener(data);
                        }
                    });
                }
            }else {
                ohlc = new OHLC(price);
                this.ohlcMap.set(price.symbol, ohlc);
            }

            
        });
        
        this.lastSubscribeMap = new Map();
        this.ohlcSubscribeMap = new Map();
        this.ohlcMap = new Map();
    }

    setListener(type, user, listener) {
        if(type === 'last') {
            this.lastSubscribeMap.set(user, listener);
        }else if(type === 'ohlc') {
            this.ohlcSubscribeMap.set(user, listener);
        }
    }

    deleteListener(type, user) {
        if(type === 'last') {
            this.lastSubscribeMap.delete(user);
        }else if(type === 'ohlc') {
            this.ohlcSubscribeMap.delete(user);
        }
    }

}

let iexConn = new IEXConnection(URL);

module.exports = {
    handleLastWS: (ws, req) => {
        let userId = req.query.user;
        if(userId === undefined) {
            ws.send('Missing user id.');
            ws.close();
            return;
        }else {
            ws.send(WELCOME);
            let listener = price => {
                ws.send(JSON.stringify(price));
            };
            iexConn.setListener('last', userId, listener);
            
            ws.on('message', cmd => {
                cmd = cmd.replace('\r', '');
                cmd = cmd.replace('\n', '');
                if(cmd == 'subscribe') {
                    listener.subscribe = true;
                }else if(cmd == 'unsubscribe'){
                    listener.subscribe = false;
                }
            });
        
            ws.on('close', function () {
                iexConn.deleteListener('last', userId);
                
            });
        }
    },

    handleOHLCWS: (ws, req) => {
        let userId = req.query.user;
        if(userId === undefined) {
            ws.send('Missing user id.');
            ws.close();
            return;
        }else {
            ws.send(WELCOME);
            let listener = ohlc => {
                ws.send(JSON.stringify(ohlc));
            };
            iexConn.setListener('ohlc', userId, listener);
            
            ws.on('message', cmd => {
                cmd = cmd.replace('\r', '');
                cmd = cmd.replace('\n', '');
                if(cmd == 'subscribe') {
                    listener.subscribe = true;
                }else if(cmd == 'unsubscribe'){
                    listener.subscribe = false;
                }
            });
        
            ws.on('close', function () {
                iexConn.deleteListener('ohlc', userId);
                
            });
        }
    }
};