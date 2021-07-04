const findEmotion = (emotion) =>{
    var smile = emotion.happiness;
    var anger = emotion.anger;
    var neut =  emotion.neutral;
    if(smile>anger && smile>neut){
        return "h";
    }else if(anger>smile && anger>neut){
        return "a";
    }else{
        return "n";
    }
}
const totalEmotion = (json) =>{
    var smile = 0,anger=0,neut=0;
    json.forEach(function(obj){
        smile+=obj.faceAttributes.emotion.happiness;
        anger+=obj.faceAttributes.emotion.anger;
        neut+=obj.faceAttributes.emotion.neutral;
    });
    if(smile>anger && smile>neut){
        return "h";
    }else if(anger>smile && anger>neut){
        return "a";
    }else{
        return "n";
    }
}
export const faceStringify = (json) => {
    var retText=""

    if(json.length==1){
        let roll = json[0].faceAttributes.headPose.roll;
        let yaw = json[0].faceAttributes.headPose.yaw;
        let pitch = json[0].faceAttributes.headPose.pitch;
        var emot = findEmotion(json[0].faceAttributes.emotion);
        if(roll>-10 && roll<10 && yaw>-10 && yaw<10 && pitch>-10 && pitch<10){
            var genders = "He";
            if(json[0].faceAttributes.gender==="female") genders="She";
            if(emot==="h"){
                retText = genders +" is smiling at you.";
            }else if(emot==="a"){
                retText = genders +" is looking at you with anger.";
            }else{
                retText = genders +" is looking at you.";
            }   
        }else{
            if(emot==="h"){
                retText = "There is a person in front of you, who seems to be happy.";
            }else if(emot==="a"){
                retText = "There is a person in front of you, who seems to be angry.";
            }else{
                retText = "There is a person in front of you.";
            } 
        }  
    }
    else{
        var emot = totalEmotion(json);
        if(emot==="h"){
            retText = "They seem to be happy."
        }else if(emot==="a"){
            retText = "They seem to be angry.";
        }else{
            retText = "";
        }
    }
    return retText;
    // json.forEach(function(objectface){
    //     faces+=objectface.faceAttributes.age+" "+objectface.faceAttributes.gender;
    // })
}