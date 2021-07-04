import {StyleSheet,Dimensions} from 'react-native';
const { width: winWidth, height: winHeight } = Dimensions.get('window');
import {StatusBar} from 'react-native';
const statusBarHeight = StatusBar.currentHeight;
export const style = StyleSheet.create({
    root:{
        height: winHeight+statusBarHeight,
    },
    preview: {
        height: winWidth/1.1,
        width: winWidth,
        left: 0,
        top: 0,
    },
    layout: {
        height: winHeight - winWidth/1.1+statusBarHeight,
        width: winWidth,
        justifyContent: 'flex-end',
        alignItems: 'center'
    },
    texty: {
        bottom:0,
        fontSize: 25,
        fontWeight: 'bold',
        justifyContent: 'center',
        textAlign: 'center'
    },
    modeButton: {
        position: 'absolute',
        width: winWidth/2-10,
        marginLeft: 6,
        marginTop:1.5,
        marginRight: 4,
        height: winHeight/15,
        top: winWidth/1.1,
        left: 0,
        zIndex: 100,
    },
    modeButtonFeedback: {
        overflow: 'hidden',
        borderRadius: 7,
        height: '100%',
        justifyContent: 'center',
        elevation: 2,
        textAlign: 'center'
    },
    buttonText: {
        textAlign: 'center',
        fontWeight: '700'
    },
    helpButton: {
        position: 'absolute',
        width: winWidth/2-10,
        marginTop:1.5,
        marginLeft: 4,
        marginRight: 6,
        height: winHeight/15,
        top: winWidth/1.1,
        right: 0,
        zIndex: 100,
    },
    helpButtonFeedback: {
        backgroundColor: 'lightgreen',
        overflow: 'hidden',
        borderRadius: 7,
        height: '100%',
        justifyContent: 'center',
        textAlign: 'center',
        elevation: 2,
    },
    UIcover: {
        justifyContent: 'center',
        marginLeft: 5,
        marginRight: 5,
        marginBottom: 6,
        marginTop: winHeight/15+5,
        borderRadius: 20,
        width: winWidth-10,
        flex: 1,
        backgroundColor: 'rgb(225, 223, 223)',
        elevation: 3,
    }
});