import React from 'react';
import * as Speech from 'expo-speech';
import { ScrollView,RefreshControl,StyleSheet,ToastAndroid,Vibration } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import axios from 'axios';
import * as Updates from 'expo-updates';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';
import * as Permissions from 'expo-permissions';
import * as Network from 'expo-network';
import {Audio} from 'expo-av';
import Camera from './components/camera'
import {credentialsAzure} from './shared/credentials'
import * as SplashScreen from 'expo-splash-screen';
import {langdict} from './shared/sounddict.js'
import {translateAPI} from './components/translateAPI';
import * as Location from 'expo-location';
import { activateKeepAwake,deactivateKeepAwake  } from 'expo-keep-awake';
subscription_key_translate = credentialsAzure[3].subscription_key;
endpoint_translate = credentialsAzure[3].endpoint;
endpoint_stt = credentialsAzure[4].endpoint;
const style = StyleSheet.create({
  container:{
    flex:1,
    justifyContent:'center',
    alignItems:'center',
    backgroundColor: 'plum'
  },
  textt:{
    color:'white',
    fontSize: 30,
    fontWeight:'bold'
  }
})
const recordingOptions = {
  android: {
    extension: '.m4a',
    outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
    audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 128000,
  },
  ios: {
    extension: '.wav',
    audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 128000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
}
export default class App extends React.Component {
  constructor(){
    super();
    this.refreshing = false;
    this.recording = null;
    this.ProcessingAudio = null;
    this.state = {
      isFetching: false,
      isRecording: false,
      hasRecordingPermission: false,
      hasCameraPermission: false,
      hasLocationPermission: false,
      lang: 'english',
      langcode: 'en',
      langconfig: {pitch: 1, rate:1}
    }
  }
  playProcessAudio = (action) =>{
    if(action==="play"){
        this.ProcessingAudio.playAsync();
    }else{
        this.ProcessingAudio.pauseAsync();
    }
  }
  getTranscription = async () => {
    this.playProcessAudio("play")
    const files = await FileSystem.readAsStringAsync(this.recording.getURI(),{encoding: FileSystem.EncodingType.Base64})
    const formData = new FormData();
    formData.append('data',files)
    var configs = {
      method: 'post',
      url: endpoint_stt,
      data: formData
    };
    var self = this;
    axios(configs)
    .then(async function (response) {
      if(response.data.lang=="default"){
        self.playProcessAudio("pause")
        Speech.speak("Sorry, im unable to hear what you said, language changed to english",{pitch: 1, rate:1})
        ToastAndroid.show("Language changed to English", ToastAndroid.SHORT);
        self.setState({
          lang: "english",
          langcode: "en",
          langconfig: langdict["english"]
        })
      }else{
        self.setState({
          lang: response.data.lang,
          langcode: response.data.code,
          langconfig: langdict[response.data.lang]
        })
        translateAPI(`Okay, language changed to ${self.state.lang}`,
        self.state.langcode, endpoint_translate, subscription_key_translate)
        .then(val =>{
            self.playProcessAudio("pause")
            Speech.speak(val,self.state.langconfig);
            ToastAndroid.show(`Language changed to ${self.state.lang}`, ToastAndroid.SHORT);
        })
      }
      if(self.state.langconfig==undefined){
        self.setState({
          langconfig: {pitch: 1, rate:1}
        })
      }else{
        self.setState({
          langconfig: self.state.langconfig.config
        })
      }
      SecureStore.setItemAsync('language',self.state.lang);
      SecureStore.setItemAsync('langcode',self.state.langcode);
      SecureStore.setItemAsync('langconfig',JSON.stringify(self.state.langconfig));
    })
    .catch(function (error) {
      this.playProcessAudio("pause")
      Speech.speak("Sorry, im unable to hear what you said!",{pitch: 1, rate:1})
    });
  }
  setRefreshing = (val)=>{
    this.refreshing = val;
  }
  startRecording = async () => {
    if (!this.state.hasRecordingPermission) return
    this.setState({ isRecording: true })
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
      playsInSilentModeIOS: false,
      interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
      playThroughEarpieceAndroid: false,
    })
    const recording = new Audio.Recording();
    try {
      await recording.prepareToRecordAsync(recordingOptions)
      await recording.startAsync()
    } catch (error) {
      this.stopRecording()
    }
    this.recording = recording
  }
  stopRecording = async () => {
    this.setState({ isRecording: false })
    try {
      await this.recording.stopAndUnloadAsync()
    } catch (error) {
    }
  }

  resetRecording = () => {
    this.deleteRecordingFile()
    this.recording = null
  }
  onRefresh =async () =>{
    if(this.refreshing==false && this.state.hasRecordingPermission===true){
      try{
        this.setRefreshing(true);
        Speech.stop()
        Speech.speak("To what language you want to change?",{pitch: 1, rate:1.1,onDone:async ()=>{
          await this.startRecording();
          Vibration.vibrate(3000);
          setTimeout(async () =>{
            await this.stopRecording();
            this.getTranscription()
            this.setRefreshing(false);
          },3000)
        }})
      }catch(err){
        translateAPI("Unable to change language right now, try again later.",
        this.state.langcode, endpoint_translate, subscription_key_translate)
        .then(val =>{
            Speech.speak(val,this.state.langconfig);
        })
      }
    }else{
      Speech.stop()
      Speech.speak("allow Audio Permission or restart the app to use this feature.",{pitch: 1, rate:1.1})
    }
  }
  async componentWillUnmount() {
    deactivateKeepAwake();
  }
  async componentDidMount() {
    const networkConnection = await Network.getNetworkStateAsync();
    if(networkConnection.isInternetReachable===true){
      await SplashScreen.hideAsync();
      const audio = await Permissions.askAsync(Permissions.AUDIO_RECORDING);
      this.setState({hasRecordingPermission: (audio.status === "granted")});
      const camera = await Permissions.askAsync(Permissions.CAMERA);
      const hasCameraPermission = (camera.status === 'granted');
      this.setState({ hasCameraPermission: hasCameraPermission })
      const { status } = await Location.requestPermissionsAsync()
      const hasLocationPermission = (status === 'granted');
      this.setState({ hasLocationPermission: hasLocationPermission });
      if(camera.status!=='granted')
      Speech.speak("Allow Camera permission or restart the app.",{pitch: 1, rate:1.1})
      else
      SecureStore.getItemAsync('language')
      .then(val =>{
        if(val!=null){
          SecureStore.getItemAsync('langcode')
          .then(code =>{
            SecureStore.getItemAsync('langconfig')
            .then(conf =>{
              this.setState({
                lang : val,
                langcode : code,
                langconfig: JSON.parse(conf)
              })
              translateAPI("Swipe for actions or tap screen with two fingers for help.",
              this.state.langcode, endpoint_translate, subscription_key_translate)
              .then(val =>{
                  Speech.speak(val,this.state.langconfig);
              })
            })
          })
        }else{
          this.setState({
            lang : 'english',
            langcode : 'en',
            langconfig:{pitch: 1,rate: 1}
          })
          translateAPI("Swipe for actions or tap screen with two fingers for help.",
          this.state.langcode, endpoint_translate, subscription_key_translate)
          .then(val =>{
              Speech.speak(val,this.state.langconfig);
          })
        }
      })
      const { sound } = await Audio.Sound.createAsync(
        require('./assets/process.mp3'),
        {
          isLooping: true,
          volume: 0.25,
        }
      );
      this.ProcessingAudio = sound;
      activateKeepAwake();
    }else{
      Speech.speak("You need to be connected to the internet to use this app.",{pitch: 1, rate:1.1})
    }
    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        await Updates.fetchUpdateAsync();
        ToastAndroid.show("Updating app in the background", ToastAndroid.LONG);
        await Updates.reloadAsync();
      }else{
        ToastAndroid.show("Yaay, Vision is upto date.", ToastAndroid.LONG);
      }
    } catch (e) {
    }
    SecureStore.getItemAsync('deviceKey')
    .then(val =>{
      if(val==null){
        SecureStore.setItemAsync('deviceKey',JSON.stringify({valid: true}));
        axios({
          method: 'get',
          url: 'https://visioncounter.azurewebsites.net/counter',
        })
        .then()
        .catch()
      }
    })
    .catch()
  }
  
  render() {
    return (
      <ScrollView 
      style = {{flex: 1}}
      refreshControl={<RefreshControl refreshing={this.refreshing} onRefresh={this.onRefresh} enabled={this.state.refreshEnable}/>}>
        <StatusBar style="auto" />
        <Camera hasLocationPermission={this.state.hasLocationPermission} hasCameraPermission={this.state.hasCameraPermission} langcode={this.state.langcode} config={this.state.langconfig}/>
      </ScrollView>
    );
  }
}