'use strict'
let fs = require('fs')
let path = require('path')
let exec = require('child_process').exec

let app = require('electron').remote.app
const {ipcRenderer} = require('electron')
let {dialog} = require('electron').remote

let JSONStream = require('JSONStream')

let PreferenceFile  = require('electron').remote.require('./preferences/pref-store')

let preferences = new PreferenceFile('prefs.json')

let divLogSync = document.getElementById('divLogDskMob')
let btnStartSync = document.getElementById('startSync')
let btnContSync = document.getElementById('contSync')
let btnShutSync = document.getElementById('shutSync')

let addLog = (logWidget, levelLog, messageLog) => {

    let colorLog = {
        'erro': {
            'fg': '#ff0000',
            'bg': '#ffffff'
        },
        'info': {
            'fg': '#0000ff',
            'bg': '#ffffff'
        },
        'aler': {
            'fg': '#ffff00',
            'bg': '#000000'
        }
    }

    let pElm = document.createElement(
        'span'
    )

    pElm.style = 'background-color:'+colorLog[levelLog]['bg']+';color:'+colorLog[levelLog]['fg']

    pElm.appendChild(
        document.createTextNode(messageLog)
    )

    logWidget.appendChild(pElm)

    logWidget.appendChild(
        document.createElement('br')
    )

    logWidget.scrollTop = 200
}

let showConInst = (toogle) => {

    let divInstCnx = document.getElementById('instCnx')
    divInstCnx.style.display = toogle

    let divAndVrs = document.getElementById('andVrs')
    divAndVrs.style.display = toogle

    let divDbgCnx = document.getElementById('dbgCnx')
    divDbgCnx.style.display = toogle
}

let saveJSONFile = (fileName,jData) => {

    let nmPathF = path.normalize(
        path.join(
            app.getAppPath(),
            '/sync_mobile/outros/'+fileName
        )
    )

    if(fs.existsSync(nmPathF)){
        fs.unlinkSync(nmPathF)
    }

    try{

        fs.writeFileSync(
            nmPathF,
            JSON.stringify(jData)
        )

    } catch(error){

        addLog(
            divLogSync,
            'erro',
            'Erro de sistema - Não foi possível criar arquivo: ' + fileName
        )
    }
}

let shutSyncAdb = () => {

    exec(
        preferences.get('sync-Sync','adb-bin') + ' kill-server',
        (error, stdout, stderr) => {
            addLog(divLogSync, 'info', 'Sincronização finalizada!')
        }
    )
}

btnShutSync.onclick = () => {

    showConInst('none')

    shutSyncAdb()

    dialog.showMessageBox({
        type: 'info',
        buttons: [],
        title: 'Sincronização - Desktop para Móvel',
        message: '\nVocê será redirecionado em seguida a página ' +
                'principal.'
    })

    ipcRenderer.send('send-to-page', 'html/index.html')
}

let genJSONs = (parser) => {

    return new Promise(
        function (resolve, reject) {
            parser.on(
                'data',
                (objTb) => {
                    objTb.forEach(
                        (elM,idx) => {
                            // console.log(idx,JSON.parse(elM))
                            // console.log(idx, keyJSON, JSON.stringify(elM[keyJSON]))
                            let tbNameJSON = Object.keys(elM)[0]

                            saveJSONFile(tbNameJSON+'.json', elM[tbNameJSON])
                            addLog(
                                divLogSync,
                                'info',
                                'Gerando JSON da tabela: ' + tbNameJSON
                            )
                        }
                    )

                    resolve(true)
                }
            )
        }
    )
}

btnStartSync.onclick = () => {

    showConInst('none')

    let parser = JSONStream.parse()

    while (divLogSync.hasChildNodes()) {
        divLogSync.removeChild(divLogSync.lastChild);
    }

    if(preferences.get('prefStatus','frmValido')){

        addLog(divLogSync, 'info', 'Parâmetros de preferência - válidos')

        let stream = fs.createReadStream(
            path.normalize(preferences.get('sync-Sync','sync-jsons')),
            {encoding: 'utf8'}
        )

        stream.pipe(parser)

        genJSONs(
            parser
        ).then(
                (jsonGerado) => {

                    if(jsonGerado){
                        addLog(divLogSync, 'info', 'Inicializando serviço ADB!')

                        exec(
                            preferences.get('sync-Sync','adb-bin') + ' devices -l',
                            (error, stdout, stderr) => {
                                addLog(divLogSync, 'info', 'Retorno do serviço ADB: "' + stdout + '"')

                                if(!/List of devices attached/.test(stdout)){
                                    addLog(divLogSync, 'erro', 'Não foi possível inicializar serviço ADB' )

                                }else{
                                    addLog(divLogSync, 'info', 'Carregando instruções para conexão do dispositivo...')

                                    showConInst('block')
                                }
                            }
                        )
                    }
                },
                (error) => {
                    console.error(error)
                }
        )

    }else{

        addLog(divLogSync, 'aler', 'Parâmetros de preferência - inválidos')
        addLog(divLogSync, 'erro', 'Finalizando a sincronização por falha!')

        let redPref =dialog.showMessageBox({
            type: 'info',
            buttons: [
                'Sim, leve-me a página de Preferências.',
                'Não, mantenha-me nesta página.'
            ],
            title: 'Sincronização - Desktop para Móvel',
            message: 'Prezado usuário,' +
            '\nFavor confira os parâmetros desta tela, pois são' +
            '\nnecessários para o devido funcionamento da sincronização.' +
            '\nDeseja ser redirecionado em seguida a página de ' +
            'preferências.'
        })

        if(redPref == 0){
            ipcRenderer.send('send-to-page', 'html/preferences.html')
        }
    }

}

btnContSync.onclick = () => {

    showConInst('none')

    addLog(divLogSync, 'info', 'Verificando se há dispositivo conectado...')

    exec(
        preferences.get('sync-Sync','adb-bin') + ' devices -l',
        (error, stdout, stderr) => {

                let outMessage = stdout.replace(/List of devices attached(?:\r\n|\r|\n)+/,'')

                if(outMessage.match(/device/)){
                    addLog(divLogSync, 'info', 'Dispositivo encontrado!')

                    addLog(divLogSync, 'info', 'Sincronizando arquivos...')

                    exec(
                        preferences.get('sync-Sync','adb-bin') +
                        ' push '+
                        path.join(
                            app.getAppPath(),
                            '/sync_mobile/outros/'
                        ) +
                        ' /mnt/sdcard/',
                        (error, stdout, stderr) => {

                            console.log(error)

                            addLog(divLogSync, 'aler', 'Arquivos enviados!')

                            addLog(
                                divLogSync,
                                'aler',
                                'Sincronização finalizada.'
                            )

                            dialog.showMessageBox({
                                type: 'info',
                                buttons: [],
                                title: 'Sincronização - Desktop para Móvel',
                                message: 'Prezado usuário,' +
                                '\nOs arquivos foram sincronizados em seu' +
                                '\ndispositivo móvel com sucesso. ' +
                                '\nAcesse agora a versão mobile para visuali'+
                                'zação\ndos referidos dados.'+
                                '\nVocê será redirecionado em seguida a página ' +
                                'principal.'
                            })

                            ipcRenderer.send('send-to-page', 'html/index.html')
                        }
                    )

                }else{

                    addLog(divLogSync, 'erro', 'Dispositivo não encontrado!')
                    addLog(divLogSync, 'aler', 'Cancelando sincronização!')
                    addLog(
                        divLogSync,
                        'aler',
                        'Reveja as instruções de conexão do dispositivo móvel!'
                    )

                    dialog.showMessageBox({
                        type: 'error',
                        buttons: [],
                        title: 'Sincronização - Desktop para Móvel',
                        message: 'Prezado usuário,' +
                        '\nFavor confira as instruções de conexão do seu ' +
                        '\ndispositivo móvel, pois não foi possível ' +
                        '\nidentificá-lo durante a sincronização.'
                    })

                    shutSyncAdb()
                }
        }

    )
}
