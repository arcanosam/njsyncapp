'use strict'
let {app} = require('electron')
let path = require('path')
const fs = require('fs')

class PreferenceFile {

    constructor(fileName){
        this.data = this.parseDataFile(
            path.normalize(
                path.join(
                    app.getAppPath(),
                    '/preferences/'+fileName
                )
            )
        )
    }

    get(group, key) {
        return this.data[group][key]
    }

    set(group, key, val) {
        this.data[group][key] = val;
    }

    parseDataFile(filePath) {
        // We'll try/catch it in case the file doesn't exist yet, which will be the case on the first application run.
        // `fs.readFileSync` will return a JSON string which we then parse into a Javascript object
        try {

            return JSON.parse(
                fs.readFileSync(filePath)
            )

        } catch(error) {
            // if there was some kind of error, return the passed in defaults instead.
            console.log(error)

            return {
                'sync-Sync':{
                    'sync-jsons':'',
                    'sync-mob':'',
                    'adb-bin':''
                },
                'sync-PG':{
                    'pg-port':5432,
                    'pg-host':'',
                    'pg-user':''
                },
                'prefStatus':{
                    'frmValido':false
                }
            }
        }
    }

    saveDataFile(fileName){
        try{

            fs.writeFileSync(
                path.normalize(
                    path.join(
                        app.getAppPath(),
                        '/preferences/'+fileName
                    )
                ),
                JSON.stringify(this.data)
            )

        } catch(error){

            console.log(error)
        }
    }
}

module.exports = PreferenceFile
