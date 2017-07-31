'use strict'
let exec = require('child_process').exec
let path = require('path')

let app = require('electron').remote.app
const {ipcRenderer} = require('electron')
let {dialog} = require('electron').remote

let PreferenceFile  = require('electron').remote.require('./preferences/pref-store')

let preferences = new PreferenceFile('prefs.json')

let divLogSync = document.getElementById('divLogDskMob')
let divPassPG = document.getElementById('divPassPG')
let btnStartSync = document.getElementById('startSync')
let btnContSync = document.getElementById('contSync')
let btnShutSync = document.getElementById('shutSync')
let btnConBD = document.getElementById('conxPG')

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

let shutSyncAdb = (printMessage) => {

    exec(
        preferences.get('sync-Sync','adb-bin') + ' kill-server',
        (error, stdout, stderr) => {
            if(printMessage){
                addLog(divLogSync, 'info', 'Sincronização finalizada!')
            }
        }
    )
}

btnShutSync.onclick = () => {

    showConInst('none')

    shutSyncAdb(true)

    dialog.showMessageBox({
        type: 'info',
        buttons: [],
        title: 'Sincronização - Móvel para Desktop',
        message: '\nVocê será redirecionado em seguida a página ' +
                'principal.'
    })

    ipcRenderer.send('send-to-page', 'html/index.html')
}

btnStartSync.onclick = () => {

    while (divLogSync.hasChildNodes()) {
        divLogSync.removeChild(divLogSync.lastChild);
    }

    showConInst('none')

    if(preferences.get('prefStatus','frmValido')){

        addLog(divLogSync, 'info', 'Parâmetros de preferência - válidos')

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

    }else{

        addLog(divLogSync, 'aler', 'Parâmetros de preferência - inválidos')
        addLog(divLogSync, 'erro', 'Finalizando a sincronização por falha!')

        let redPref =dialog.showMessageBox({
            type: 'info',
            buttons: [
                'Sim, leve-me a página de Preferências.',
                'Não, mantenha-me nesta página.'
            ],
            title: 'Sincronização - Móvel para Desktop',
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

                    addLog(divLogSync, 'info', 'Recuperando arquivo...')

                    exec(
                        preferences.get('sync-Sync', 'adb-bin') +
                        ' pull /mnt/sdcard/Android/data/'+
                        preferences.get('sync-Sync', 'sync-mob') +
                        '/databases/sync.sqlite ' +
                        path.join(
                            app.getAppPath(),
                            '/sync_desktop/db/'
                        ),
                        (error, stdout, stderr) => {

                            addLog(divLogSync, 'aler', 'Sqlite recuperado!')

                            shutSyncAdb(false)

                            addLog(
                                divLogSync,
                                'info',
                                'Solicitando senha para conexao com banco...'
                            )

                            divPassPG.style.display = 'block'
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
                        title: 'Sincronização - Móvel para Desktop',
                        message: 'Prezado usuário,' +
                        '\nFavor confira as instruções de conexão do seu ' +
                        '\ndispositivo móvel, pois não foi possível ' +
                        '\nidentificá-lo durante a sincronização.'
                    })

                    shutSyncAdb(true)
                }
        }

    )

}


btnConBD.onclick = () => {

    divPassPG.style.display = 'none'

    let fs = require('fs')
    let sql = require('sql.js')

    let db = new sql.Database(
        fs.readFileSync(
            path.join(
                app.getAppPath(),
                '/sync_desktop/db/sync.sqlite'
            )
        )
    )

    // let sqlite3 = require('sqlite3').verbose()
    let res = db.exec(
        `SELECT
            coOpcaoVacina,
            dsOpcaoVacina,
            stRegistroAtivo
        FROM
            OpcaoVacina
        WHERE
            coOpcaoVacina < 6`
    )



    res[0].values.forEach(

        (elM, idX) => {

            if(idX == 0){
                addLog(
                    divLogSync,
                    'aler',
                    'Conectando sync SQLITE...'
                )
            }

            addLog(
                divLogSync,
                'info',
                'Registro '+ (idX+1)
            )

            addLog(
                divLogSync,
                'info',
                'coOpcaoVacina: '+ elM[0]
            )

            addLog(
                divLogSync,
                'info',
                'dsOpcaoVacina: '+ elM[1]
            )

            addLog(
                divLogSync,
                'info',
                'stRegistroAtivo: '+ elM[2]
            )

            addLog(
                divLogSync,
                'info',
                ''
            )
        }
    )


    let passPG = document.getElementById('passPG').value

    addLog(divLogSync, 'info', 'Conectando PostGRES...')

    const { Client } = require('pg')

    const client = new Client({
      user: preferences.get('sync-PG', 'pg-user'),
      host: preferences.get('sync-PG', 'pg-host'),
      database: 'postgres',
      password: passPG,
      port: preferences.get('sync-PG', 'pg-port'),
    })

    client.connect()

    client.query(
        'SELECT NOW()',
        (err, res) => {

            addLog(
                divLogSync,
                'aler',
                'Conexão POSTGRES efetuada: ' + res.rows[0].now
            )

            client.end()
        }
    )

}
