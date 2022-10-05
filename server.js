
const port = 8000;
const express = require("express")
const app = express()
const fs = require("fs")
const cors = require("cors")
const bodyParser = require("body-parser")
const jsonParser = bodyParser.json()
const XLSX = require('xlsx')
app.use(cors())


function dateQrci(val){
  let date = new Date(Number(val))
  let str = date.getDate()+'.'+(date.getMonth()+1)+'.'+date.getFullYear()
  return str
}

// СОХРАНЕНИЕ ИЗОБРАЖЕНИЯ НА СЕРВЕРЕ
const multer = require('multer');
const { request } = require("http");
const { response } = require("express");
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // '/files' это директория в которую будут сохранятся файлы 
    cb(null, 'files/temporary/')
  },
  filename: (req, file, cb) => {
// Возьмем оригинальное название файла, и под этим же названием сохраним его на сервере
    const { originalname } = file
    cb(null, originalname)
  }
})
const upload = multer({ storage: storage })



app.post('/single-file', upload.single('file'), 
        (req, res) => {
    res.json({status: 'Saved'})
})


//JSON с данными
app.get('/Models', (request, response) => {
    fs.readFile("dataModels.json", "utf8", 
              function(error,data){
                  if(error) throw error; // если возникла ошибка
  
                  response.send(data);  // выводим считанные данные
              });
})
app.get('/Users', (request, response) => {
    fs.readFile("./data/users.json", "utf8", 
              function(error,data){
                  if(error) throw error; // если возникла ошибка
  
                  response.send(data);  // выводим считанные данные
              });
})

// ОТПРАВКА СПИСКА QRCI

app.get('/Quality/qrciList', (request, response) => {
  fs.readFile("./data/qrciList.json", "utf8", 
            function(error,data){
                if(error) throw error; // если возникла ошибка
                let arr = JSON.parse(data);
                dateNow = new Date()
                arr.forEach(element =>{
                    element.qrciList.forEach( item => {
                        item.qrciRows.forEach( action => {
                            let checkDate = new Date(action.date)
                            if (checkDate < dateNow){
                                console.log(action.date + " < " + dateNow)
                                action.status= {
                                    title: "Просрочен",
                                    index: 1
                                }
                                item.status = {
                                    title: "Просрочен",
                                    index: 1
                                }
                            }
                        })
                    })
                })

                response.send(arr);
            });
})

// ОТПРАВКА QRCI по департаменту и номеру
app.get("/Quality/Department/:depart/QRCI/:id", (request, responce) =>{
    fs.readFile("./data/qrciList.json", "utf8", function(error,data){
        if(error) throw error; // если возникла ошибка
        let arr = JSON.parse(data);
        arr[request.params['depart']].qrciList.forEach(elem =>{
            if (Number(request.params["id"]) === elem.number){
                elem.department = request.params['depart']
                responce.send(elem)
            }
        })
    })
})

// СОХРАНЕНИЕ РЕДАКТИРОВАНИЯ QRCI
app.post('/Quality/Department/:depart/QRCI/:id', jsonParser, function (request, response) {
    if(!request.body) return response.sendStatus(400);

    let obj = request.body
    let data = fs.readFileSync("./data/qrciList.json", "utf8")
    let dataStr = JSON.parse(data);
    const department = obj.department
    delete obj.department

    obj.qrciRows.forEach(row => {
        if(row.newPhotos.length != undefined){
            let counterPhoto = 0
            if (row.photos.length != undefined){
                counterPhoto =row.photos.length
            }
            
            row.newPhotos.forEach(photo => {
                fs.rename('./files/temporary/'+photo.title, './files/qrci/dep' + department + 'qrci' + obj.number + "r" + photo.row + 'n' + counterPhoto + ".jpg", err => {
                if(err) throw err; // не удалось переименовать файл
                console.log('Файл успешно переименован');
                });     
                photo.title = 'dep' + department + 'qrci' + obj.number + "r" + photo.row + 'n' + counterPhoto + ".jpg"
                row.photos.push(photo)
                counterPhoto++
            })
            row.newPhotos = []
        }
    })

    dataStr[department].qrciList.splice(obj.number-1, 1, obj) 
    data = JSON.stringify(dataStr)
    fs.writeFileSync("./data/qrciList.json", data, "utf8")
})


app.post('/Quality/NewQrci', jsonParser, function (request, response) {
    if(!request.body) return response.sendStatus(400);

    let obj = request.body
    console.log(obj)
    let data = fs.readFileSync("./data/qrciList.json", "utf8")
    let dataStr = JSON.parse(data);
    const department = obj.department
    delete obj.department
    obj.number = dataStr[department].qrciList.length+1 
    
    obj.qrciRows.forEach(row => {
        if(row.photos.length > 0){
            let counterPhoto = 0
            row.photos.forEach(photo => {
                fs.rename('./files/temporary/'+photo.title, './files/qrci/dep' + department + 'qrci' + obj.number + "r" + photo.row + 'n' + counterPhoto + ".jpg", err => {
                if(err) throw err; // не удалось переименовать файл
                console.log('Файл успешно переименован');
                });     
                photo.title = 'dep' + department + 'qrci' + obj.number + "r" + photo.row + 'n' + counterPhoto + ".jpg"
                counterPhoto++
            })
        }
    })
    
    dataStr[department].qrciList.push(obj)
    data = JSON.stringify(dataStr)
    fs.writeFileSync("./data/qrciList.json", data, "utf8")
})

app.get("/getImage/:img", (req, res) =>{
    res.setHeader("Content-Type", "image/jpeg");
    fs.readFile('./files/qrci/'+ req.params['img'] + '.jpg', (err, image) => {
      res.end(image);
    });

})


// ПОЛУЧЕНИЕ ИЗОБРАЖЕНИЙ
app.post("/getImage/:imageTitle", function (request, responce) {
    let obj = request.params['imageTitle']
    console.log(obj)

    fs.readdir('./files/qrci/', {withFileTypes: true},
    (error, files) => {
        if (error) throw error;
        files.forEach(file =>{
            if (file.name === obj) {
                responce.send(file.name)
                console.log(file.name)
            }
        } )
    })
    
})

app.post("/", jsonParser, function (request, response) {
    if(!request.body) return response.sendStatus(400);

    let obj = request.body.body 
    let data = fs.readFileSync("./qrciList.json", "utf8")
    let dataStr = JSON.parse(data);
    let arrdate = obj.date.split(".")
    obj.date =  Date.UTC(arrdate[2], arrdate[1]-1, arrdate[0], 3, 0, 0, 0)

    for (let el = 0; el < obj.qrciRows.length; el++){
      let rowDate = obj.qrciRows[el].date.split('.')
      obj.qrciRows[el].date = Date.UTC(rowDate[2], rowDate[1]-1, rowDate[0], 0, 0, 0, 0)
    }

    if (obj.number === 0){
      if (dataStr[request.body.index].qrciList.length > 0){
        obj.id = dataStr[request.body.index].qrciList.length
        obj.number = dataStr[request.body.index].qrciList[dataStr[request.body.index].qrciList.length-1].number + 1
      } else {
        obj.id = 0
        obj.number = 1
      }
      
      dataStr[request.body.index].qrciList.push(obj)
    } else {
      dataStr[request.body.index].qrciList[obj.id] = obj
    }
    
    data = JSON.stringify(dataStr)
    fs.writeFileSync("./qrciList.json", data, "utf8")

});

// ПЛАНИРОВАНИЕ РАБОТ AVO
app.post("/AVOPlaning", jsonParser, function (request, response) {
  if(!request.body) return response.sendStatus(400);

  let obj = request.body
    console.log("sadfsdf")
  let data = fs.readFileSync("./data/planingAVO.json", "utf8")
  let dataStr = JSON.parse(data);
  let checked = true 
  
  dataStr.forEach(elem =>{
    if (elem.date === obj.date){
      checked = false
      let item = {}
      
      item.model = obj.modelId
      item.article  = obj.article
      item.quantityK = obj.quantityK
      item.quantityG = obj.quantityG
      item.productionTime = obj.productionTime
      item.nextStep = obj.nextStep
      if (elem.productionPlan[obj.productionArea].flows[obj.productionFlow][elem.productionPlan[obj.productionArea].flows[obj.productionFlow].length-1].model === '---'){
        elem.productionPlan[obj.productionArea].flows[obj.productionFlow][elem.productionPlan[obj.productionArea].flows[obj.productionFlow].length-1] = item
      } else {
        elem.productionPlan[obj.productionArea].flows[obj.productionFlow].push(item)
      }
      
    } 
  })
  
  if (checked === true){
    let item = {}
      item.date = obj.date
      item.productionPlan = [
          {
              productionArea: "Опции",
              flows: [
                  [{
                      model: "---",
                      productionTime: "---"
                  }],
                  [{
                      model: "---",
                      productionTime: "---"
                  }],
                  [{
                      model: "---",
                      productionTime: "---"
                  }],
                  [{
                      model: "---",
                      productionTime: "---"
                  }],
              ]
          },
          {
              productionArea: "Линза",
              flows: [
                  [{
                      model: "---",
                      productionTime: "---"
                  }],
                  [{
                      model: "---",
                      productionTime: "---"
                  }],
                  [{
                      model: "---",
                      productionTime: "---"
                  }],
              ]
          },
          {
              productionArea: "Экструзия",
              flows: [
                  [{
                      model: "---",
                      productionTime: "---"
                  }],
                  [{
                      model: "---",
                      productionTime: "---"
                  }]
              ]
          },
          {
              productionArea: "Пайка",
              flows: [
                  [{
                      model: "---",
                      productionTime: "---"
                  }],
                  [{
                      model: "---",
                      productionTime: "---"
                  }],
                  [{
                      model: "---",
                      productionTime: "---"
                  }],
                  [{
                      model: "---",
                      productionTime: "---"
                  }],
                  [{
                      model: "---",
                      productionTime: "---"
                  }],
                  [{
                      model: "---",
                      productionTime: "---"
                  }],
              ]
          },
          {
              productionArea: "Manual",
              flows: [
                  [{
                      model: "---",
                      productionTime: "---"
                  }],
                  [{
                      model: "---",
                      productionTime: "---"
                  }],
                  [{
                      model: "---",
                      productionTime: "---"
                  }],
              ]
          },
          {
              productionArea: "Кировец",
              flows: [
                  [{
                      model: "---",
                      productionTime: "---"
                  }],
                  [{
                      model: "---",
                      productionTime: "---"
                  }],
                  [{
                      model: "---",
                      productionTime: "---"
                  }],
              ]
          },
          {
              productionArea: "Kostal",
              flows: [
                  [{
                      model: "---",
                      productionTime: "---"
                  }],
                  [{
                      model: "---",
                      productionTime: "---"
                  }],
                  [{
                      model: "---",
                      productionTime: "---"
                  }],
              ]
          }
      ]

      let i = {
        model: obj.modelId,
        article: obj.article,
        quantityK: obj.quantityK,
        quantityG: obj.quantityG,
        productionTime: obj.productionTime,
        nextStep: obj.nextStep
      }
      item.productionPlan[obj.productionArea].flows[obj.productionFlow][item.productionPlan[obj.productionArea].flows[obj.productionFlow].length-1] = i
      
      dataStr.push(item)
  }
  
  let dateToday  = new Date(obj.date)
    dateToday.setHours(3, 0, 0, 0)
    console.log(obj.date + "---" + dateToday)
    dataStr.forEach(elem =>{
    let newDate = new Date(elem.date)
    let count  = newDate - dateToday
        if(count === 0){
            response.send(elem.productionPlan);
        }                 
    })

  data = JSON.stringify(dataStr)
  fs.writeFileSync("./data/planingAVO.json", data, "utf8")

});



app.get('/AVOPlaning', (request, response) => {
  fs.readFile("./data/planingAVO.json", "utf8", 
            function(error,data){
                if(error) throw error; 

                let arr = JSON.parse(data)
                let dateToday  = new Date()
                dateToday.setHours(3, 0, 0, 0)
                arr.forEach(elem =>{
                    let newDate = new Date(elem.date)
                    let count  = newDate - dateToday
                    if(count === 0){
                        response.send(elem.productionPlan);
                    } 
                    
                })
            });
})

app.post("/AVOPlaningDate", jsonParser, function (request, response){
    if(!request.body) return response.sendStatus(400);

    let newDate = request.body.date
    dateToday = new Date(newDate)
    dateToday.setHours(3, 0, 0, 0)
    let data = fs.readFileSync("./data/planingAVO.json", "utf8")
    let dataStr = JSON.parse(data);
    let checked = true
    dataStr.forEach(elem =>{
        let newDate = new Date(elem.date)
        let count  = newDate - dateToday
        if(count === 0){
            checked = false
            console.log(elem.productionPlan)
            response.send(elem.productionPlan);
        } 
    })
    if (checked === true){
        let arr = [
            {
                productionArea: "Опции",
                flows: [
                    [{
                        model: "---",
                        productionTime: "---"
                    }],
                    [{
                        model: "---",
                        productionTime: "---"
                    }],
                    [{
                        model: "---",
                        productionTime: "---"
                    }],
                    [{
                        model: "---",
                        productionTime: "---"
                    }],
                ]
            },
            {
                productionArea: "Линза",
                flows: [
                    [{
                        model: "---",
                        productionTime: "---"
                    }],
                    [{
                        model: "---",
                        productionTime: "---"
                    }],
                    [{
                        model: "---",
                        productionTime: "---"
                    }],
                ]
            },
            {
                productionArea: "Экструзия",
                flows: [
                    [{
                        model: "---",
                        productionTime: "---"
                    }],
                    [{
                        model: "---",
                        productionTime: "---"
                    }]
                ]
            },
            {
                productionArea: "Пайка",
                flows: [
                    [{
                        model: "---",
                        productionTime: "---"
                    }],
                    [{
                        model: "---",
                        productionTime: "---"
                    }],
                    [{
                        model: "---",
                        productionTime: "---"
                    }],
                    [{
                        model: "---",
                        productionTime: "---"
                    }],
                    [{
                        model: "---",
                        productionTime: "---"
                    }],
                    [{
                        model: "---",
                        productionTime: "---"
                    }],
                ]
            },
            {
                productionArea: "Manual",
                flows: [
                    [{
                        model: "---",
                        productionTime: "---"
                    }],
                    [{
                        model: "---",
                        productionTime: "---"
                    }],
                    [{
                        model: "---",
                        productionTime: "---"
                    }],
                ]
            },
            {
                productionArea: "Кировец",
                flows: [
                    [{
                        model: "---",
                        productionTime: "---"
                    }],
                    [{
                        model: "---",
                        productionTime: "---"
                    }],
                    [{
                        model: "---",
                        productionTime: "---"
                    }],
                ]
            },
            {
                productionArea: "Kostal",
                flows: [
                    [{
                        model: "---",
                        productionTime: "---"
                    }],
                    [{
                        model: "---",
                        productionTime: "---"
                    }],
                    [{
                        model: "---",
                        productionTime: "---"
                    }],
                ]
            }
        ]
        response.send(arr)
    }
})

app.get('/Maitanence/workList', (request, response) => {
    fs.readFile("./data/maitanenceWorkList.json", "utf8", 
              function(error,data){
                  if(error) throw error; // если возникла ошибка
                  let arr = JSON.parse(data);
                      response.send(arr)
              });
  })

app.post("/Maitanence/workList", jsonParser, function (request, response) {
    if(!request.body) return response.sendStatus(400);
  
    let obj = request.body
      console.log(obj)
    let data = fs.readFileSync("./data/maitanenceWorkList.json", "utf8")
    let dataStr = JSON.parse(data);
    let dateReq = new Date(request.body.date)
    dateReq.setHours(3, 0, 0, 0)
    let checked = true
    dataStr.forEach(elem => {
        let newDate = new Date(elem.date)
        let count = newDate - dateReq
        if (count === 0){
            checked = false
            let item = {
                productionShift: request.body.productionShift,
                production: request.body.production,
                line: request.body.line,
                equipment: request.body.equipment,
                time: request.body.time,
                place: request.body.place,
                rootCause: request.body.rootCause,
                comment: request.body.comment,
                timeSave: request.body.timeSave
            }
            elem.work.push(item)
        }
    })
    if (checked === true){
        dataStr.push({
            date: request.body.date,
            work: [
                {
                    productionShift: request.body.productionShift,
                    production: request.body.production,
                    line: request.body.line,
                    equipment: request.body.equipment,
                    time: request.body.time,
                    place: request.body.place,
                    rootCause: request.body.rootCause,
                    comment: request.body.comment,
                    timeSave: request.body.timeSave
                }
            ]
        })
    }
    response.send(dataStr)
    
    data = JSON.stringify(dataStr)
    fs.writeFileSync("./data/maitanenceWorkList.json", data, "utf8")
  
  });

  app.post("/Maitanence/workListPeriod", jsonParser, function (request, response) {
    if(!request.body) return response.sendStatus(400);
  
    let obj = request.body
    let data = fs.readFileSync("./data/maitanenceWorkList.json", "utf8")
    let dataStr = JSON.parse(data);
    
    let periodWorkList= []
    dataStr.forEach(elem =>{
        if (elem.date >= obj[0] && elem.date<= obj[1]){
            periodWorkList.push(elem)
        }
    })
    console.log(periodWorkList)
    response.send(periodWorkList)    
  });

  app.post("/Maitanence/workListPeriodReport", jsonParser, function (request, response) {
    if(!request.body) return response.sendStatus(400);
  
    let obj = request.body
    let data = fs.readFileSync("./data/maitanenceWorkList.json", "utf8")
    let dataStr = JSON.parse(data);
    
    let periodWorkList= []
    dataStr.forEach(elem =>{
        if (elem.date >= obj[0] && elem.date<= obj[1]){
            periodWorkList.push(elem)
        }
    })

    let report = []
    periodWorkList.forEach(item => {
        item.work.forEach(element =>{
            let reportObj = {
               "производство": element.production,
               "линия": element.line,
               "зона": element.equipment,
               "смена": element.productionShift,
               "прим": '',
               "дата": item.date,
               "время 2": "",
               "время простоя": "",
               "Время ремонта": "",
               "выходные": "",
               "ночь": "", 
               "время 1": "",
               "узел": element.place,
               "проблема": "",
               "причина": element.rootCause,
               "действие": element.comment
            }
            report.push(reportObj)
        })
    })

    const ws = XLSX.utils.json_to_sheet(report)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Исходные данные')
    XLSX.writeFile(wb, 'sampleData.export.xlsx')

    response.send(periodWorkList)    
  });


app.listen(port, (err) => {
  if (err) {
      return console.log('something bad happened', err)
  }
  console.log(`server is listening on ${port}`)
}) 