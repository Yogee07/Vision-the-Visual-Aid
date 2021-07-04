import axios from 'axios';
export const translateAPI = async (textbody,to, endpoint, key) =>{
    var conf = {
    method: 'post',
    url: endpoint+to,
    headers: { 
        'Ocp-Apim-Subscription-Key': key, 
        'Content-Type': 'application/json'
    },
    data : [{
        "Text": textbody
    }]
    };
    try{
        const response = await axios(conf)
        return response.data[0].translations[0].text.toString()
    }catch{
        return textbody
    }
}