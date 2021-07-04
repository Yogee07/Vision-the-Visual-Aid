import React from 'react';
import { Camera} from 'expo-camera';
import { Audio } from 'expo-av';
import * as ImageManipulator from "expo-image-manipulator";
import {View,Text,Image,PanResponder} from 'react-native';
import {style} from './styles';
import * as Speech from 'expo-speech';
import * as FileSystem from 'expo-file-system';
import {credentialsAzure} from '../shared/credentials'
import {faceStringify} from './faceAPI';
import {currencyAPI} from './currencyAPI';
import {translateAPI} from './translateAPI';
import axios from 'axios';
const subscription_key = credentialsAzure[0].subscription_key;
const subscription_key_face = credentialsAzure[1].subscription_key;
const endpoint_desc = credentialsAzure[0].endpoint+'describe';
const endpoint_ocr = credentialsAzure[0].endpoint+'read/analyze'
const endpoint_face = credentialsAzure[1].endpoint+'face/v1.0/detect?returnFaceAttributes=age,gender,emotion,headPose'
const subscription_key_currency = credentialsAzure[2].subscription_key;
const endpoint_currency = credentialsAzure[2].endpoint;
const subscription_key_translate = credentialsAzure[3].subscription_key;
const endpoint_translate = credentialsAzure[3].endpoint;
const endpoint_maps = credentialsAzure[5].endpoint;
const endpoint_weather = credentialsAzure[6].endpoint;

LogBox.ignoreAllLogs(true)
import * as Location from 'expo-location';
import { TouchableNativeFeedback } from 'react-native-gesture-handler';
import { LogBox } from 'react-native';
const leftSwipe = ({ moveX, moveY, dx, dy}) => {
    if ( dx < -100 )
        return true;
    else
        return false;
}

const rightSwipe = ({ moveX, moveY, dx, dy }) => {
    if ( dx > 100 )
        return true;
    else
        return false;
}
const justTouch = ({moveX, moveY, dx, dy}) =>{
    if(dx<20 && dx>-20 && dy<20 && dy>-20 )
        return true;
    else
        return false;
}

const upSwipe = ({moveX, moveY, dx, dy}) =>{
    if(dy<-100)
        return true;
    else
        return false;
}

export default class CameraPage extends React.Component {
    
    camera = null;
    toggleLock = false;
    panResponderLock = false;
    bufferCounter = 0;
    state = {
        type: Camera.Constants.Type.back,
        imageUri : null,
        dispCam: true,
        dispText: "Swipe for Actions ",
        reqTimer: true,
        mode:0,
        modeColor: 'lightblue',
        isTfReady: false,
        isModelReady: false,
        predictions: null,
    }
    playProcessAudio = (action) =>{
        if(action==="play"){
            this.ProcessAudio.playAsync();
        }else{
            this.ProcessAudio.pauseAsync();
        }
    }
    detectObjects = async (datas,ratio) => {
        try {
            const manipResult = await ImageManipulator.manipulateAsync(
                datas,
                [{ resize: {
                    width: parseInt(1500/ratio),
                    height: 1500
                }}],
                { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
            );
            const request_obj = new Request(endpoint_desc,{
                method: 'POST',
                headers :{
                    'Ocp-Apim-Subscription-Key': subscription_key,
                    'Content-Type': 'application/octet-stream'
                },
                body:{
                    uri: manipResult.uri
                }
            })
            if(this.bufferCounter<=1)
            fetch(request_obj)
            .then(response =>response.json())
            .then((json) =>{
                this.bufferCounter = this.bufferCounter+1;
                FileSystem.deleteAsync(manipResult.uri,{idempotent:true})
                if(this.state.mode===1)
                Speech.speak(json.description.captions[0].text,{onDone:()=>{this.bufferCounter = this.bufferCounter-1}});
            })
            .catch(err =>{
                this.setState({
                    mode: 0,
                    modeColor: 'lightblue',
                },()=>{
                    Speech.stop();
                    translateAPI("Cannot focus right now, changing to normal mode",this.props.langcode, endpoint_translate, subscription_key_translate)
                    .then(val =>{
                        Speech.speak(val,this.props.config);
                    })
                })
            })
        } catch (error) {
            this.setState({
                mode: 0,
                modeColor: 'lightblue',
            },()=>{
                Speech.stop();
                translateAPI("Cannot focus right now, changing to normal mode",this.props.langcode, endpoint_translate, subscription_key_translate)
                .then(val =>{
                    Speech.speak(val,this.props.config);
                })
            })
        }
    }
    async componentDidMount(){
        const { sound } = await Audio.Sound.createAsync(
            require('../assets/process.mp3'),
            {
              isLooping: true,
              volume: 0.25,
            }
          );
        this.ProcessAudio = sound;
    }
    async getCaptFromImg(datas){
        if(datas!==null){
            this.playProcessAudio('play')
            const request = new Request(endpoint_desc,{
                method: 'POST',
                headers :{
                    'Ocp-Apim-Subscription-Key': subscription_key,
                    'Content-Type': 'application/octet-stream'
                },
                body:{
                    uri: datas
                }
            })
            const request_face = new Request(endpoint_face,{
                method: 'POST',
                headers :{
                    'Ocp-Apim-Subscription-Key': subscription_key_face,
                    'Content-Type': 'application/octet-stream'
                },
                body:{
                    uri: datas
                }
            })
            var currency=""
            currency = await currencyAPI(datas, endpoint_currency, subscription_key_currency)
            var faces=""
            if(currency[1]!==1)
            fetch(request_face)
            .then(response =>response.json())
            .then((json) =>{
                faces = faceStringify(json);
            })
            .catch(err =>{
                faces=""
            })
            var text = "";
            return fetch(request)
            .then((response) => response.json())
            .then((json) => {
                text = json.description.captions[0].text+".";
                if(currency[1]===1){
                    translateAPI(currency[0]+text,this.props.langcode, endpoint_translate, subscription_key_translate)
                    .then(val =>{
                        this.playProcessAudio('pause')
                        Speech.speak(val,this.props.config);
                    })
                }else{
                    translateAPI(text+faces,this.props.langcode, endpoint_translate, subscription_key_translate)
                    .then(val =>{
                        this.playProcessAudio('pause')
                        Speech.speak(val,this.props.config);
                    })
                }
            })
            .catch((error) => {
                translateAPI("Unable to connect right now, try again later.",this.props.langcode, endpoint_translate, subscription_key_translate)
                .then(val =>{
                    this.playProcessAudio('pause')
                    Speech.speak(val,this.props.config);
                })
            });
        }else{
            translateAPI("Click an image, before swiping.",this.props.langcode, endpoint_translate, subscription_key_translate)
            .then(val =>{
                Speech.speak(val,this.props.config);
            })
        }
    };
    async fetchNow(config){
        axios(config)
        .then(response => {
            var temp="";
            if(response.data.status==="succeeded"){
                response.data.analyzeResult.readResults.forEach(ob1 =>{
                    ob1.lines.forEach(ob2 =>{
                        temp+=" "+ob2.text
                    })
                })
                if(temp.length<4000){
                    this.playProcessAudio('pause')
                    Speech.speak(temp,{rate : 0.9})
                }else{
                    this.playProcessAudio('pause')
                    Speech.speak(temp.slice(0,3999),{rate : 0.9})
                }
            }else if(response.data.status==="running"){
                setTimeout(()=>{
                    this.fetchNow(config)
                },1000)
            }else{
                translateAPI("Sorry im currently having trouble reading text",this.props.langcode, endpoint_translate, subscription_key_translate)
                .then(val =>{
                    this.playProcessAudio('pause')
                    Speech.speak(val,this.props.config);
                })
            } 
        })
        .catch(function (error) {
            translateAPI("Sorry im currently having trouble reading text",this.props.langcode, endpoint_translate, subscription_key_translate)
            .then(val =>{
                this.playProcessAudio('pause')
                Speech.speak(val,this.props.config);
            })
        });
    }
    async getTextFromImg(datas){
        if(datas!==null){
            this.playProcessAudio('play')
            const request = new Request(endpoint_ocr,{
                method: 'POST',
                headers :{
                    'Ocp-Apim-Subscription-Key': subscription_key,
                    'Content-Type': 'application/octet-stream'
                },
                body:{
                    uri: datas
                }
            })
            fetch(request)
            .then(async (response) => {
                var config = {
                    method: 'get',
                    url: response.headers.get('Operation-Location'),
                    headers: { 
                    'Ocp-Apim-Subscription-Key': subscription_key
                    }
                };
                try{
                    this.fetchNow(config)
                }catch(err){
                    translateAPI("Sorry im currently having trouble reading text",this.props.langcode, endpoint_translate, subscription_key_translate)
                    .then(val =>{
                        this.playProcessAudio('pause')
                        Speech.speak(val,this.props.config);
                    })
                }
                
            })
            .catch((error) => {
                translateAPI("Sorry im currently having trouble reading text",this.props.langcode, endpoint_translate, subscription_key_translate)
                .then(val =>{
                    this.playProcessAudio('pause')
                    Speech.speak(val,this.props.config);
                })
            });
        }else{
            translateAPI("Click an image, before swiping.",this.props.langcode, endpoint_translate, subscription_key_translate)
            .then(val =>{
                Speech.speak(val,this.props.config);
            })
        }
    };
    helpReader = ()=>{
        this.playProcessAudio('pause');
        Speech.stop();
        translateAPI("Tap screen to click a picture, swipe left to describe the image, swipe right to narrate text, swipe upwards for location assistance, swipe downwards to change the language. use toggle mode for continuous assistance.",this.props.langcode, endpoint_translate, subscription_key_translate)
        .then(val =>{
            Speech.speak(val,{pitch: this.props.config.pitch,rate: 0.8});
        })
    }
    panResponder = PanResponder.create({
        onStartShouldSetPanResponder: (e, gestureState) => {
            if(this.state.mode===0){
                this.playProcessAudio('pause');
                Speech.stop();
                this.panResponderLock = true;
                return true;
            }
        },
        onPanResponderEnd: async (e, gestureState) => {
            if(this.panResponderLock===true && gestureState.numberActiveTouches===1){
                this.helpReader();
                this.panResponderLock=false;
            }
            else if (this.panResponderLock===true && justTouch(gestureState)){
                Speech.stop()
                this.takePicture();
                this.panResponderLock=false;
            }
            else if (this.panResponderLock===true && leftSwipe(gestureState)){
                Speech.stop()
                this.getCaptFromImg(this.state.imageUri);
                this.panResponderLock=false;
            }
            else if (this.panResponderLock===true && rightSwipe(gestureState)){
                Speech.stop()
                this.getTextFromImg(this.state.imageUri);
                this.panResponderLock=false;
            }
            else if (this.panResponderLock===true && upSwipe(gestureState)){
                Speech.stop()
                if(this.props.hasLocationPermission==true){
                    this.playProcessAudio('play')
                    try{
                        let location = await Location.getCurrentPositionAsync({});
                        var latitude = location.coords.latitude;
                        var longitude = location.coords.longitude;
                        var config = {
                            method: 'get',
                            url: endpoint_maps+"&lat="+latitude+"&lon="+longitude+"&limit=3&radius=200"
                        };
                        axios(config)
                        .then(async (response) =>{
                            if(response.data.results.length>0)
                            {
                                axios({method:'get', url:endpoint_weather+'&query='+latitude+','+longitude})
                                .then((weather)=>{
                                    var unit = "";
                                    if(weather.data.results[0].realFeelTemperature.unit=='C')
                                    unit = "Celcius";
                                    else if(weather.data.results[0].realFeelTemperature.unit=='F')
                                    unit = "Fahrenheit"
                                    const weatherPhrase = "The temperature around you is "+weather.data.results[0].realFeelTemperature.value+" degree "+unit+" and the weather is "+weather.data.results[0].phrase+".";
                                    this.playProcessAudio('pause')
                                    var temp = ""
                                    if(response.data.results[0].address.municipalitySubdivision)
                                    temp = " in "+response.data.results[0].address.municipalitySubdivision+". "
                                    translateAPI("You are near to "+response.data.results[0].poi.name+" at a distance of "+Math.round(response.data.results[0].dist)+" metres"+temp+weatherPhrase,
                                    this.props.langcode, endpoint_translate, subscription_key_translate)
                                    .then(val =>{
                                        Speech.speak(val,this.props.config);
                                    })
                                })
                                .catch(err=>{
                                    this.playProcessAudio('pause')
                                    var temp = ""
                                    if(response.data.results[0].address.municipalitySubdivision)
                                    temp = " in "+response.data.results[0].address.municipalitySubdivision+". "
                                    translateAPI("You are near to "+response.data.results[0].poi.name+" at a distance of "+Math.round(response.data.results[0].dist)+" metres"+temp,
                                    this.props.langcode, endpoint_translate, subscription_key_translate)
                                    .then(val =>{
                                        Speech.speak(val,this.props.config);
                                    })
                                })
                            }else{
                                this.playProcessAudio('pause')
                                translateAPI("There are no landmarks near you right now",
                                this.props.langcode, endpoint_translate, subscription_key_translate)
                                .then(val =>{
                                    Speech.speak(val,this.props.config);
                                })
                            } 
                        })
                        .catch(()=>{
                            this.playProcessAudio('pause')
                            translateAPI("Unable to fetch location right now, try again later.",
                            this.props.langcode, endpoint_translate, subscription_key_translate)
                            .then(val =>{
                                Speech.speak(val,this.props.config);
                            })
                        })
                    }catch{
                        this.playProcessAudio('pause')
                        translateAPI("Unable to fetch location right now, try again later.",
                        this.props.langcode, endpoint_translate, subscription_key_translate)
                        .then(val =>{
                            Speech.speak(val,this.props.config);
                        })
                    }
                    
                }
                else{
                    translateAPI("Location permission should be turned on, to use this feature!",
                    this.props.langcode, endpoint_translate, subscription_key_translate)
                    .then(val =>{
                        Speech.speak(val,this.props.config);
                    })
                }
                this.panResponderLock=false;
            }
            return true;
        }
    });

    takePicture = async () => {
        if(this.state.dispCam===true){
            this.toggleLock = true;
            if (this.camera) {
                this.camera.takePictureAsync({ onPictureSaved: this.onPictureSaved });
                translateAPI("Picture clicked",this.props.langcode, endpoint_translate, subscription_key_translate)
                .then(val =>{
                    Speech.speak(val,this.props.config);
                })
            }
        }else{
            this.toggleLock = false;
            const tempUri = this.state.imageUri;
            FileSystem.deleteAsync(tempUri,{idempotent:true})
            this.setState({
                dispCam : true,
                imageUri: null,
            })
            translateAPI("Opening camera",this.props.langcode, endpoint_translate, subscription_key_translate)
            .then(val =>{
                Speech.speak(val,this.props.config);
            })
        }
     };
    onPictureSaved = async (photo) => {
        var aspectRatio = photo.height/photo.width;
        const manipResult = await ImageManipulator.manipulateAsync(
            photo.uri,
            [{ resize: {
                width: parseInt(1000/aspectRatio),
                height: 1000
            }}],
            { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
          );
        FileSystem.deleteAsync(photo.uri,{idempotent:true})
        this.setState({
            dispCam : false,
            imageUri : manipResult.uri
        });
    }
    callFeedback = async ()=>{
        this.camera.takePictureAsync({ onPictureSaved: async (photo)=>{
            const aspectRatio = photo.height/photo.width;
            await this.detectObjects(photo.uri,aspectRatio);
            FileSystem.deleteAsync(photo.uri,{idempotent:true})
            if(this.state.mode===1){
                this.callFeedback()
            }
        } });
    }
    toggleMode = async ()=>{
        if(!this.toggleLock && this.state.mode===0){
            this.bufferCounter=0;
            this.setState({
                mode: 1,
                modeColor: 'red',
            },()=>{
                Speech.stop();
                translateAPI("Changing to focus mode",this.props.langcode, endpoint_translate, subscription_key_translate)
                .then(val =>{
                    Speech.speak(val,this.props.config);
                }) 
                this.callFeedback();
            })
        }else if(!this.toggleLock){
            this.bufferCounter=0;
            this.setState({
                mode: 0,
                modeColor: 'lightblue',
            },()=>{
                Speech.stop();
                translateAPI("Changing to normal mode",this.props.langcode, endpoint_translate, subscription_key_translate)
                .then(val =>{
                    Speech.speak(val,this.props.config);
                })
            })
        }
    }
    render() {
        const { hasCameraPermission } = this.props;
        if (hasCameraPermission === null) {
            return <View />;
        } else if (hasCameraPermission === false) {
            return <View><Text style={{margin: '50%'}}>Access to camera has been denied.</Text></View>;
        }
        else{
            if(this.state.dispCam === true){
                return(
                    <View style={style.root}>
                        <Camera
                        style={style.preview}
                        ref={camera => this.camera = camera}
                        type = {this.state.type}
                        useCamera2Api = {true}
                        />
                        <View 
                        style = {style.layout} collapsable={false} {...this.panResponder.panHandlers}>
                            <View style={style.UIcover}>
                                <Text style = {style.texty}>
                                    {this.state.dispText}
                                </Text>
                            </View>
                        </View>
                        <View
                            style={style.modeButton}>
                            <TouchableNativeFeedback
                                disabled={!this.state.dispCam}
                                onPress = {()=>{this.toggleMode()}}
                                style={{...style.modeButtonFeedback,backgroundColor: this.state.modeColor}}>
                                <View>
                                    <Text style={style.buttonText}>Toggle Mode</Text>
                                </View>
                            </TouchableNativeFeedback>
                        </View>
                        <View
                            style={style.helpButton}>
                            <TouchableNativeFeedback
                                disabled={this.state.mode===1}
                                onPress = {()=>{this.helpReader()}}
                                style={{...style.helpButtonFeedback}}>
                                <View>
                                    <Text style={style.buttonText}>Help</Text>
                                </View>
                            </TouchableNativeFeedback>
                        </View>
                    </View>
                )
            }else{
                return(
                    <View style={style.root}>
                        <Image
                        style = {style.preview}
                        source={{
                            uri: this.state.imageUri,
                        }}
                        />
                        <View style = {style.layout} collapsable={false} {...this.panResponder.panHandlers}>
                            <View style={style.UIcover}>
                                <Text style = {style.texty}>
                                    {this.state.dispText}
                                </Text>
                            </View>
                        </View>
                        <View
                            style={style.modeButton}>
                            <TouchableNativeFeedback
                                disabled={!this.state.dispCam}
                                onPress = {()=>{this.toggleMode()}}
                                style={{...style.modeButtonFeedback,backgroundColor: this.state.modeColor}}>
                                <View>
                                    <Text style={style.buttonText}>Toggle Mode</Text>
                                </View>
                            </TouchableNativeFeedback>
                        </View>
                        <View
                            style={style.helpButton}>
                            <TouchableNativeFeedback
                                disabled={this.state.mode===1}
                                onPress = {()=>{this.helpReader()}}
                                style={{...style.helpButtonFeedback}}>
                                <View>
                                    <Text style={style.buttonText}>Help</Text>
                                </View>
                            </TouchableNativeFeedback>
                        </View>
                    </View>
                )
            }
        }
    };
};