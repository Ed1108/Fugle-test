const _ = require('lodash');
const request = require('request');

const HOST = 'cloud-sse.iexapis.com';
const TEST_HOST = 'sandbox-sse.iexapis.com';
const TEST_TOKEN = 'Tsk_8a6f2bf5495d47f28df6bde9b7f42730';
const SYMBOLS = [
    'FB',
    'AAPL',
    'AMZN',
    'MSFT',
    'IBM',
    'COKE',
    'TSLA',
    'MCD',
    'TSM',
    'INTC'
];

let symbols = SYMBOLS[0];
_.forEach(SYMBOLS, (symbol, i) => {
    if(i > 0) {
        symbols = symbols + ',' + symbol;
    }
});

let lastUrl;
let quoteUrl;
if(process.env.TOKEN !== undefined) {
    lastUrl = `https://${HOST}/stable/last?symbols=${symbols}&token=${process.env.TOKEN}`;
    quoteUrl = `https://${HOST}/stable/stocksUSNoUTP1Minute?symbols=${symbols}&token=${process.env.TOKEN}`;
}else {
    //Use sandbox
    console.log('TOKEN does not set. Use sandbox.');
    lastUrl = `https://${TEST_HOST}/stable/last?symbols=${symbols}&token=${TEST_TOKEN}`;
    quoteUrl = `https://${TEST_HOST}/stable/stocksUSNoUTP1Minute?symbols=${symbols}&token=${TEST_TOKEN}`;
}

console.log(lastUrl);
console.log(quoteUrl);

class SSEHandler {
    constructor(url) {
        this.url = url;
        this.partialMessage = null;
        this.subscribers = [];
    }

    subscribe(userId, cb) {
        this.subscribers[userId] = cb;
        console.log(this.subscribers);
    }

    unsubscribe(userId) {
        this.subscribers[userId] = undefined;
        console.log(this.subscribers);
    }

    connect(){
        this.stream = request({
            url: this.url,
            headers: {
                'Content-Type': 'text/event-stream'
            }
        });
        this.stream.on('socket', () => {
            console.log('Connected to ' + this.url);
        });
        
        this.stream.on('end', () => {
            console.log('Reconnecting');
            this.connect();
        });
        
        this.stream.on('complete', () => {
            console.log('Reconnecting');
            this.connect();
        });
        
        this.stream.on('error', err => {
            console.log('Error', err);
            this.connect();
        });

        this.stream.on('data', data => {
            this.processData(data);
        });
    }

    processData(data) {
        let chunk = data.toString();
        let cleanedChunk = chunk.replace(/data: /g, '');
        if(this.partialMessage) {
            cleanedChunk = this.partialMessage + cleanedChunk;
            this.partialMessage = null;
        }
        let messageArr = cleanedChunk.split('\r\n\r\n');
        _.forEach(messageArr, message => {
            
            if (message) {
                
                try {
                    console.log(message);
                    let obj = JSON.parse(message)[0];
                    if(obj !== undefined) {
                        console.log(obj);
                        _.forEach(this.subscribers, subscriber => {
                            if(subscriber) {
                                subscriber(obj);
                            }
                        });
                    }
                    
                    
                } catch (err) {
                    this.partialMessage = message;
                }
            }
        });
    }
}



let lastHandler = new SSEHandler(lastUrl);
let quoteHandler = new SSEHandler(quoteUrl);
lastHandler.connect();
quoteHandler.connect();



module.exports = {
    handleLastWS: (ws, req) => {
        let userId = req.query.user;
        if(userId === undefined) {
            ws.send('Missing user id.');
            ws.close();
            return;
        }else {
            ws.send('Welcome! You can use the following command:');
            ws.send('(1) CMD_SUBSCRIBE: subscribe the real time price.');
            ws.send('(2) CMD_UNSUBSCRIBE: unsubscribe the real time price.');
        }
        ws.on('message', cmd => {
            cmd = cmd.replace('\r', '');
            cmd = cmd.replace('\n', '');
            if(cmd == 'CMD_SUBSCRIBE') {
                lastHandler.subscribe(userId, msg => ws.send(JSON.stringify(msg)));
            }else if(cmd == 'CMD_UNSUBSCRIBE'){
                lastHandler.unsubscribe(userId);
            }
        });
    
        ws.on('close', function () {
            console.log(`User ${userId} closed on real time price.`);
            lastHandler.unsubscribe(userId);
            
        });
    },

    handleQuoteWS: (ws, req) => {
        let userId = req.query.user;
        if(userId === undefined) {
            ws.send('Missing user id.');
            ws.close();
            return;
        }else {
            ws.send('Welcome! You can use the following command:');
            ws.send('(1) CMD_SUBSCRIBE: subscribe the quote of 1 minute.');
            ws.send('(2) CMD_UNSUBSCRIBE: unsubscribe the quote of 1 minute.');
        }
        ws.on('message', cmd => {
            cmd = cmd.replace('\r', '');
            cmd = cmd.replace('\n', '');
            if(cmd == 'CMD_SUBSCRIBE') {
                quoteHandler.subscribe(userId, msg => {
                    let obj = {
                        symbol: msg.symbol,
                        companyName: msg.companyName,
                        open: msg.open,
                        close: msg.close,
                        high: msg.high,
                        low: msg.low,
                        latestPrice: msg.latestPrice
                    };
                    console.log(obj);
                    ws.send(JSON.stringify(obj));
                });
            }else if(cmd == 'CMD_UNSUBSCRIBE'){
                quoteHandler.unsubscribe(userId);
            }
        });
    
        ws.on('close', function () {
            console.log(`User ${userId} closed on quote of 1 minute.`);
            quoteHandler.unsubscribe(userId);
            
        });
    }
};
