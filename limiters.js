const rateLimit = require('express-rate-limit');
const _ = require('lodash');

const LIMITERS = [
    {
        name: 'ip',
        windowMs: 1 * 60 * 1000,
        limit: 10,
        keyGenerator: req => req.ip
    },
    {
        name: 'id',
        windowMs: 1 * 60 * 1000,
        limit: 5,
        keyGenerator: req => req.query.user
    }
];

module.exports = {
    apply: app => {
        _.forEach(LIMITERS, (item, i) => {
            let limiter = rateLimit({
                windowMs: item.windowMs,
                max: item.limit,
                keyGenerator: req => {
                    if(i > 0) {
                        req[`limit_${LIMITERS[i - 1].name}`] = req.rateLimit.current;
                    }
                    return item.keyGenerator(req);
                },
                handler: (req, res, next) => next() //do nothing, because we want to get current value for each limiter
            });
            app.use('/data', limiter);
        });
        app.use('/data', (req, res, next) => {
            let LimitReached = false;
            let result = {};
            _.forEach(LIMITERS, (item, i) => {
                if(i === LIMITERS.length - 1) {
                    result[item.name] = req.rateLimit.current;
                    if(req.rateLimit.current > item.limit) {
                        LimitReached = true;
                    }
                }else {
                    let current = req[`limit_${item.name}`];
                    result[item.name] = current;
                    if(current > item.limit) {
                        LimitReached = true;
                    }
                }       
            });
            if(LimitReached) {
                res.status(403).send(result);
            }else {
                next();
            }
        });
    }
};