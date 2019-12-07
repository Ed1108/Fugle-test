const axios = require('axios');

const url = 'https://hacker-news.firebaseio.com/v0/topstories.json?print=pretty';

module.exports = {

    getData: async (req, res) => {
        if(req.query.user === undefined) {
            return res.status(400).send('Missing user id'); 
        }
        try {

            let response = await axios.get(url);
            res.status(200).send({
                result: response.data
            }); 
        }catch(err) {
            console.log(err);
            res.status(500).send({
                error: err
            });
        }
        

    }


};