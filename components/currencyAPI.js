export const currencyAPI = (img, endpoint, key) =>{
    const request_currency = new Request(endpoint,{
        method: 'POST',
        headers :{
            'Prediction-Key': key,
            'Content-Type': 'application/octet-stream'
        },
        body:{
            uri: img
        }
    });
    return fetch(request_currency)
    .then(response =>response.json())
    .then((json) =>{
        var prob = json.predictions[0].probability;
        var amt = json.predictions[0].tagName;
        //console.log(json)
        if(prob>0.75){
            if(amt!='no'){
                return ["i could see currency note of "+amt+ " rupees.",1];
            }else{
                return ["",0];
            }
        }
        else
        return ["",0];
    })
    .catch(err =>{
        return ["",0];
    })
    
}