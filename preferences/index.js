'use strict'
const {ipcRenderer} = require('electron')
let {dialog} = require('electron').remote
let PreferenceFile  = require('electron').remote.require('./preferences/pref-store')
let frmValidator = require('validate-js')

let frmPrefs = document.getElementById('frmPrefs')
let lnkOpenJson = document.getElementById('openJson')
let lnkOpenAdb = document.getElementById('openAdb')
let saveBtn = document.getElementById('prefSave')
let restBtn = document.getElementById('prefRest')

let preferences = new PreferenceFile('prefs.json')

frmPrefs['sync-jsons'].value = preferences.get('sync-Sync', 'sync-jsons')
frmPrefs['adb-bin'].value = preferences.get('sync-Sync', 'adb-bin')
frmPrefs['sync-mob'].value = preferences.get('sync-Sync', 'sync-mob')
frmPrefs['pg-host'].value = preferences.get('sync-PG', 'pg-host')
frmPrefs['pg-user'].value = preferences.get('sync-PG', 'pg-user')
frmPrefs['pg-port'].value = preferences.get('sync-PG', 'pg-port')

lnkOpenJson.onclick = () => {

    let pathJson = dialog.showOpenDialog({
        filters: [{
            name: 'Arquivo JSON',
            extensions: ['json']
        }],
        properties: [
            'openFile'
        ]
    })

    if(typeof pathJson === 'undefined'){
        frmPrefs['sync-jsons'].value = ''
    }else{
        frmPrefs['sync-jsons'].value = pathJson
    }

}

lnkOpenAdb.onclick = () => {

    let pathAdb = dialog.showOpenDialog({
        filters: [{
            name: 'Arquivo EXE(binário)',
            extensions: ['exe']
        }],
        properties: [
            'openFile'
        ]
    })

    if(typeof pathAdb === 'undefined'){
        frmPrefs['adb-bin'].value = ''
    }
    else{
        frmPrefs['adb-bin'].value = pathAdb
    }
}

saveBtn.onclick = () => {

    Array.from(frmPrefs.elements).forEach(
        (element) => {
            element.classList.remove('error-shadow')
        }
    )

    let prefValidation = new frmValidator(
        'frmPrefs',[{
            'name': 'sync-jsons',
            'display': 'Entidades(arquvio JSON)',
            'rules': 'required|is_file_type[json]',
        },{
            'name': 'adb-bin',
            'display': 'Path para ADB',
            'rules': 'required|is_file_type[exe]'
        },{
            'name': 'sync-mob',
            'display': 'Path sync Móvel',
            'rules': 'required'
        },{
            'name': 'pg-host',
            'display': 'Host PostGRES',
            'rules': 'required'
        },{
            'name': 'pg-user',
            'display': 'Usuário PostGRES',
            'rules': 'required'
        },{
            'name': 'pg-port',
            'display': 'Porta PostGRES',
            'rules': 'required'
        }],
        (errors, event) => {}
    )

    prefValidation._validateForm(undefined)

    if(prefValidation.errors.length < 1){

        let optRes = dialog.showMessageBox({
            type: 'question',
            buttons: [
                'Sim, grave.',
                'Não, cancele.'
            ],
            title: 'Preferências - Gravação',
            message: 'Confirma a gravação destes valores?'
        })

        if(optRes==0){

            let newPreferences = new PreferenceFile('prefs.json')

            newPreferences.set(
                'sync-Sync',
                'sync-jsons',
                frmPrefs['sync-jsons'].value
            )

            newPreferences.set(
                'sync-Sync',
                'adb-bin',
                frmPrefs['adb-bin'].value
            )

            newPreferences.set(
                'sync-Sync',
                'sync-mob',
                frmPrefs['sync-mob'].value
            )

            newPreferences.set(
                'sync-PG',
                'pg-host',
                frmPrefs['pg-host'].value
            )

            newPreferences.set(
                'sync-PG',
                'pg-user',
                frmPrefs['pg-user'].value
            )

            newPreferences.set(
                'sync-PG',
                'pg-port',
                frmPrefs['pg-port'].value
            )

            newPreferences.set(
                'prefStatus',
                'frmValido',
                true
            )

            newPreferences.saveDataFile('prefs.json')

            preferences = newPreferences

            dialog.showMessageBox({
                type: 'info',
                buttons: [],
                title: 'Preferências - Gravação',
                message: 'A gravação destes valores foi efetuada com sucesso' +
                        '\nVocê será redirecionado em seguida a página ' +
                        'principal.'
            })

            ipcRenderer.send('send-to-page', 'html/index.html')

        }else{

            dialog.showMessageBox({
                type: 'info',
                buttons: [],
                title: 'Preferências - Gravação',
                message: 'A gravação foi cancelada'
            })

        }
    }else{

        let errorValidationMsg = ''

        prefValidation.errors.forEach(
            (objError,idxError) => {
                idxError += 1
                errorValidationMsg += idxError + ') '+ objError.message + '\n'
                frmPrefs[objError.id].classList.add('error-shadow')
            }
        )

        dialog.showMessageBox({
            type: 'error',
            buttons: [],
            title: 'Preferências - Formulário',
            message: 'O formulário não está preenchido devidamente.\n' +
                    'Favor conferir os campos destacados.\nMensagens de ' +
                    'sistema:\n' + errorValidationMsg
        })

    }

}

restBtn.onclick = () => {

    let optRes = dialog.showMessageBox({
        type: 'question',
        buttons: [
            'Sim, confirmo.',
            'Não, cancele.'
        ],
        title: 'Preferências - Restaura padrão',
        message: 'Confirma a restauração para os valores de padrão?'
    })

    if(optRes == 0){

        let defaultPreferences = new PreferenceFile('prefs.json')

        defaultPreferences.set('sync-Sync', 'sync-jsons', '')
        defaultPreferences.set('sync-Sync', 'adb-bin', '')
        defaultPreferences.set('sync-Sync', 'sync-mob', '')
        defaultPreferences.set('sync-PG', 'pg-host', '')
        defaultPreferences.set('sync-PG', 'pg-user', '')
        defaultPreferences.set('sync-PG', 'pg-port', '5432')
        defaultPreferences.set('prefStatus', 'frmValido', false)

        defaultPreferences.saveDataFile('prefs.json')

        preferences = defaultPreferences

        frmPrefs['sync-jsons'].value = preferences.get('sync-Sync','sync-jsons')
        frmPrefs['adb-bin'].value = preferences.get('sync-Sync','adb-bin')
        frmPrefs['sync-mob'].value = preferences.get('sync-Sync','sync-mob')
        frmPrefs['pg-host'].value = preferences.get('sync-PG','pg-host')
        frmPrefs['pg-user'].value = preferences.get('sync-PG','pg-user')
        frmPrefs['pg-port'].value = preferences.get('sync-PG','pg-port')


        dialog.showMessageBox({
            type: 'info',
            buttons: [],
            title: 'Preferências - Configurações restauradas',
            message: 'A restauração para os valores de padrão foi efetuada ' +
                    'com sucesso.\nPara o devido funcionamento da ' +
                    'sincronização lembre-se de acessar esta tela e ' +
                    'configurar novamente estes parâmetros.\nVocê será ' +
                    'redirecionado em seguida para a página principal.'
        })

        ipcRenderer.send('send-to-page', 'html/index.html')
    }else{

        dialog.showMessageBox({
            type: 'info',
            buttons: [],
            title: 'Preferências - Restaura padrão',
            message: 'A restauração para os valores de padrão foi cancelada'
        })
    }

}
