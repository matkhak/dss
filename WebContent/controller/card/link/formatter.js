/* форматтер */



sap.ui.define(function () {
    "use strict";
    return {
        getVisibleAddButton: function(aArray)
        {

            // почему не получилось сделать это через форматтер: тут this ссылается на контроллер, а не на текущий объект
            // Пробовал разными способами, но пока не вышло
            return;
            // узнаем индекс этой кнопки
            let iButtonIndex = parseInt(this.getBindingContext("attrs").sPath.split("/")[3]);
            // Узнаем размер массива
            //let iIndexInSelRestrict = parseInt(this.getBindingContext("attrs").sPath.split("/")[1]);
            let iArraySize = aArray.length;

            // Есл эта кнопка последняя в массиве - только тогда ее показываем
            return ((iButtonIndex + 1) === iArraySize);
        }
    };
});
