
const fs = require("fs")
const bodyParser = require("body-parser")
const jsonParser = bodyParser.json()

let arr = []
fs.readFile("./data/qrciList.json", "utf8",function(error,data){
                  if(error) throw error; // если возникла ошибка
  
                  arr = JSON.parse(data);  // выводим считанные данные
              });

console.log(arr)