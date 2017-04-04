/*!
 * (c) Copyright AO BDO 2015. All rights reserved
 */

//@todo реализовать начальную инициализацию значений
jQuery.sap.declare("zcust.controls.CommonHierInput");
jQuery.sap.require("sap.m.MultiInput");
jQuery.sap.require("sap.ui.table.TreeTable");
jQuery.sap.require('sap.ui.commons.Label');
jQuery.sap.require('sap.ui.commons.TextField');


sap.m.MultiInput.extend("zcust.controls.CommonHierInput", {
    metadata: {
        events: {
            "selectChanged": {},
            "beforeDialogOpen": {},
        },
        properties: {
          //источник данных для иерархии, в следующией структуре:
          //key, name, child (массив потомков), path (путь к элементу с разделителем '/')
          hierSource: {
            type: 'object'
          },
          //список все возможных полей иерархии (для сброса значений и пр.),
          //использовать при заданном hierMultiFields = true
          fields: {
            type: 'object'
          },
          //@todo на данный момент считывается только при инициализации
          //если задан true - не отображает коды
          hideHelpKeyField: {
            type: 'boolean',
            defaultValue: false,
          },
          //@todo на данный момент считывается только при инициализации
          //если задан true, не отображает кнопку "выбрать вложенные элементы"
          hideHelpIncludeBtn: {
            type: 'boolean',
            defaultValue: false,
          },
          //поле для фильтрации
          field: {
            type: 'string',
            defaultValue: 'field',
          },
          dialogTitle: {
            type: 'string',
            defaultValue: 'Выберите значения'
          },
          //иерархия органичивает несколько полей (поля должны быть определены в узлах 'fields')
          hierMultiFields: {
            type: 'boolean',
            defaultValue: false,
          },
        },

    },
    renderer: {}
});

// @TODO запретить изменение следующих полей и методов:
// valueHelpRequest:
// showSuggestion:
// suggestionItemSelected:
// tokenChange:
// suggestionRows:
// suggestionColumns:

zcust.controls.CommonHierInput.prototype.init = function(e){
    sap.m.MultiInput.prototype.init.apply(this, arguments);

    this.__createHelpDialog();

    //описание контрола
    var oRowTemplate = new sap.m.ColumnListItem({
        cells: [
            new sap.m.Label({
                text: "{__hierSourceFlat>key}",
                // visible: !this.getHideHelpKeyField()
            }),
            new sap.m.Label({
                text: "{__hierSourceFlat>name}"
            })
        ]
    });

    //указывает, что не нужно обновлять multiInput (при множественном выборе)
    this.__shouldntUpdateTokens = false;

    this.attachValueHelpRequest(this.onValueHelpHier.bind(this));
    this.setShowSuggestion(true);

    this.attachSuggestionItemSelected(this.selectSuggestItem.bind(this));
    this.attachTokenChange(this.handleTokenChange.bind(this));
    this.bindSuggestionRows("__hierSourceFlat>/", oRowTemplate);
    this.addSuggestionColumn(new sap.m.Column({
        hAlign: "Begin",
        popinDisplay: "Inline",
        demandPopin: true,
        header: new sap.m.Label({
            text: "Код",
            width: "100%",
            // visible: !this.getHideHelpKeyField()
        })
    }));
    this.addSuggestionColumn(new sap.m.Column({
        hAlign: "Begin",
        popinDisplay: "Inline",
        demandPopin: true,
        header: new sap.m.Label({
            text: "Наименование",
            width: "100%"
        })
    }));

    //TODO: переделать (использовать внутреннюю переменную) -
    // control.data("field", sField);

    this._oSuggestionTable.setGrowingThreshold(800);
    this._oSuggestionTable.setGrowing(true);
    this.setFilterFunction(function(sTerm, oItem) {
        //проверка - подходит ли данный элемент
        function matchIt(el) {
            return el.getText().match(new RegExp(sTerm, "i"));
            // return el.match(new RegExp(sTerm, "i"));
        }
        return oItem.getCells().some(matchIt);
        // return matchIt(oItem.getKey()) || matchIt(oItem.getText());
    });

    //создание внутренних моделей
    this.__hierSourceModel = new sap.ui.model.json.JSONModel();
    this.__hierSourceFlatModel = new sap.ui.model.json.JSONModel();

    this.__hierSourceModel.setSizeLimit(800);
    this.__hierSourceFlatModel.setSizeLimit(800);

    this.setModel(this.__hierSourceModel, '__hierSource');
    this.setModel(this.__hierSourceFlatModel, '__hierSourceFlat');
}

/**
 * Задание значений (значения по умолчанию)
 * Требуется чтобы значения были инициализированы
 * @param {Array} values keys
 * @param {Boolean} shouldUpdate should fire update after change?
 */
zcust.controls.CommonHierInput.prototype.setValues = function (values, shouldUpdate) {
    //@todo проверка на наличие данных - если их нет... то не задавать значения :)
    if (typeof values !== 'object') {
        jQuery.sap.log.error('Values param is incorrect');
        return;
    }
    var source = this.__hierSourceFlatModel.getData();
    if (!source.length) {
        jQuery.sap.log.error('No data for select');
        return;
    }
    var selected = [];

    values.forEach(function(value){
        if (!source.some(function(el, index){
            if (el.key === value) {
                selected.push(el);
                return true;
            }
            return false;
        })) {
            jQuery.sap.log.error("Didn't find element with key " + value);
        }
    });

    if (!selected.length) {
        if (values.length) {
            jQuery.sap.log.error('does not match any key');
            return;
        } else {
            this._bSuppressEvents = true;
            // сбросить значения перед добавлением
            this.removeAllTokens();
            this.clearSelected();
            this._bSuppressEvents = false;

            // check shouldUpdate
            if (shouldUpdate) {
                this.fireSelectChanged({selected:selected, fields:this.getFields()});
            }

            return;
        }
    }

    // добавление значений
    var field = !this.getHierMultiFields() ? this.getField() : undefined;
    var tokens = [];

    //@todo: _bSuppressEvent вынести или продумать как корректнее не обновлять
    this._bSuppressEvents = true;
    // сбросить значения перед добавлением
    this.removeAllTokens();
    this.clearSelected();

    selected.forEach(function(elem){
        var token = new sap.m.Token({
            key: elem.key,
            text: elem.name
        }).data("field", field ? field : elem.field);
        tokens.push(token);

        this.addElementToDialog(elem);
    }.bind(this));

    this._dialogMultiInput.setTokens(tokens);
    // добавление значений, как после кнопки "применить"

    // применяем выбранные значения
    var dublicateTokens = this._dialogMultiInput.getTokens().map(function(token) {
        return new sap.m.Token({
            key: token.getKey(),
            text: token.getText()
        }).data("field", token.data("field"));
    });

    this.setTokens(dublicateTokens);
    this._bSuppressEvents = false;

    // check shouldUpdate
    if (shouldUpdate) {
        this.fireSelectChanged({selected:selected, fields:this.getFields()});
    }

}



zcust.controls.CommonHierInput.prototype.__getFlatDataFromHier = function (source, parent) {
    var result = [];

    for (var i = 0, ilen = source.length; i < ilen; i++) {
      var temp = source[i];
      //@todo откуда брать структуру узла?
      var element = {
        name: temp.name,
        key: temp.key,
        child: temp.child,  //@todo убрать в версиях позже 1.22 (после проверки работы получения контекста)
        field: temp.field,
        parent: parent,
      };
      result.push(element);
      if (temp.child) {
        Array.prototype.push.apply(
            result,
            this.__getFlatDataFromHier(temp.child, element)
        );
      }
    }
    return result;
  },


// @todo реализовать!
// @todo модель flatModel инкапсулировать, переопределить getData (или типа того)
zcust.controls.CommonHierInput.prototype.setHierSource = function(data){
    this.__hierSourceModel.setData(data);
    // автоматическое подтягивание значений для suggest
    this.__hierSourceFlatModel.setData(
        this.__getFlatDataFromHier(data));
}

/**
 * Create onValueHelp dialog
 */
zcust.controls.CommonHierInput.prototype.__createHelpDialog =
    function(){
        //контрол отображения выбранных значений на диалоговом окне
        this._dialogMultiInput = new sap.m.MultiInput({
            width:"95%",
            tooltip:"Выбранные значения",
            showSuggestion:true,
            suggestionRows: {
                path: "__hierSourceFlat>/",
                template: new sap.m.ColumnListItem({
                    cells: [
                        new sap.m.Label({text: "{__hierSourceFlat>key}"}), //, visible: !this.getHideHelpKeyField()}),
                        new sap.m.Label({text: "{__hierSourceFlat>name}"}),
                    ]
                })
            },
            showValueHelp:false,
            suggestionItemSelected: this.tokenDialogSuggestionHandle.bind(this),
            tokenChange: this.dialogTokenChange.bind(this),
            suggestionColumns: [
                new sap.m.Column({
                    hAlign:"Begin",
                    popinDisplay:"Inline",
                    demandPopin:true,
                    // visible: !this.getHideHelpKeyField(),
                    header: new sap.m.Label({text:"Код"})
                }),
                new sap.m.Column({
                    hAlign:"Begin",
                    popinDisplay:"Inline",
                    demandPopin:true,
                    header: new sap.m.Label({text:"Наименование"})
                }),
            ]
        }).addStyleClass('width74');

        this._dialogMultiInput.attachBrowserEvent("click", function(oEvent) {
            this._dialogMultiInput.focus();
        }.bind(this));

        //подключение фильтра к suggestTable
        this._dialogMultiInput._oSuggestionTable.setGrowingThreshold(800);
        this._dialogMultiInput._oSuggestionTable.setGrowing(true);

        //проверка - подходит ли данный элемент
        //возможно несколько толстая функция, на тестовых данных норм
        this._dialogMultiInput.setFilterFunction(function(sTerm, oItem) {
            function matchIt(el) {
                return el.getText().match(new RegExp(sTerm, "i"));
            }
            return oItem.getCells().some(matchIt);
        });


        //древовидная таблица внутри диалогового окна
        this._dialogTreeTable = new sap.ui.table.TreeTable({
            expandFirstLevel:true,
            selectionMode:"MultiToggle",
            selectionBehavior:"Row",
            rowSelectionChange:this._handleSelectRow.bind(this),
            rows:"{__hierSource>/}",
            columns: [
                new sap.ui.table.Column({
                    width: "5%",
                    label: new sap.ui.commons.Label({text: ""}),
                    // visible: !this.getHideHelpKeyField(),
                    template: new sap.ui.core.Icon({src:"sap-icon://down",
                        tooltip:"выбор вложенных элементов", press: this.handleNodeIconPress.bind(this)})
                }),
                new sap.ui.table.Column({
                    width: "20%",
                    label: new sap.ui.commons.Label({text: "Код"}),
                    // visible: !this.getHideHelpKeyField(),
                    template: new sap.ui.commons.TextField({value:"{__hierSource>key}",
                        tooltip:" ", editable:false})
                }),
                new sap.ui.table.Column({
                    width: "75%",
                    label: new sap.ui.commons.Label({text: "Наименование"}),
                    template: new sap.ui.commons.TextField({value:"{__hierSource>name}",
                        tooltip:" ", editable:false, width: "100%"})
                }),
            ],
            toolbar: new sap.m.Toolbar({
                content: [
                    this._dialogMultiInput,
                    new sap.m.Button({
                        icon:"sap-icon://delete",
                        tooltip:"Очистить выбранные значения",
                        press: this.clearSelected.bind(this)
                    }),

                ]
            //@todo сделать отдельный класс для контрола
            }).addStyleClass('width80'),
        }).addStyleClass('commonHierTree');

        this._orgHierDialog = new sap.m.Dialog({
            class: 'hierDialog',
            title: this.getDialogTitle(),
            content: [ this._dialogTreeTable],
            beginButton: new sap.m.Button({ text: "Применить", press: this.handleDialogClose.bind(this)}),
            endButton: new sap.m.Button({ text: "Выход", press: function () { this._orgHierDialog.close(); }.bind(this)}),

        }).addStyleClass('sapUiPopupWithPadding width80');

        this._orgHierDialog.attachBrowserEvent('keyup', function (oEvent) {
            if (oEvent.key==='Enter') {
                this.handleDialogClose();
            }
        }.bind(this));

        this.addDependent(this._orgHierDialog);
    }

/**
 * Workaround, удалить когда наступят лучшие времена
 * В IE контекст заполняется не корректно для объекта TableTree-row! (в версии 1.22)
 * Поэтому получаем значение ключа узла из соседней ячейки (хардкод!); находим в плоском списке узлов необходимый
 */
zcust.controls.CommonHierInput.prototype.getElemFromRow = function(row) {
    var indid;
    var cells = row.getCells();
    //для suggest в filter-bar
    if (cells[0].getText) {
        indid = cells[0].getText();
    } else if (cells.length > 1 ) {
        indid = cells[1].getValue();
    }

    var elem;
    row.getModel('__hierSourceFlat').getData().some(function(el) { if (el.key === indid) {elem = el; return true;} else {return false;}});
    return elem;
};

//отображение кнопки "выбраться все вложенные"
zcust.controls.CommonHierInput.prototype.handleNodeIconPress = function(evt) {
    var row = evt.getSource().getParent();

    // var context = row.getBindingContext('__hierSource');
    // var elem = context.oModel.getProperty(context.sPath);
    var elem = this.getElemFromRow(row);

    this.__shouldntUpdateTokens = true;
    //проверка - выбран ли элемент
    var i = this.getTableIndex(elem, this._dialogTreeTable);
    if (this._dialogTreeTable.getSelectedIndices().indexOf(i) === -1) {
        //если нет - рекурсивно выбрать его и все нижестоящие значения
        this.expandAndSelectElements(elem, true);
    } else {
        //если да - сделать uncheck его и других нижестоящих значений
        this.unselectElements(elem, true);
    }
    this.__shouldntUpdateTokens = false;
    // после выполнения данной функции выполняется выбор текущего поля
    // (нажатие на иконку) и выбранные записи таблицы добавляются в виде токенов
};

//рекурсивно выбирает записи в таблице; раскрыть все элементы, которые имеют child
zcust.controls.CommonHierInput.prototype.expandAndSelectElements = function(elem, ignoreSelectionEl) {
    var ind = this.getTableIndex(elem, this._dialogTreeTable);
    if (!ignoreSelectionEl) {
        this._dialogTreeTable.addSelectionInterval(ind, ind);
    }
    if (elem.child && elem.child.length) {
        this._dialogTreeTable.expand(ind);
        for (var i=0, ilen=elem.child.length; i<ilen; i++) {
            this.expandAndSelectElements(elem.child[i]);
        }
    }
}

//рекурсивно делает unselect записей в таблице; раскрыть все элементы, которые имеют child
zcust.controls.CommonHierInput.prototype.unselectElements = function(elem, ignoreSelectionEl) {
    var ind = this.getTableIndex(elem, this._dialogTreeTable);
    if (ind === -1) {
        return; //узел не раскрыт
    }
    if (!ignoreSelectionEl) {
        this._dialogTreeTable.removeSelectionInterval(ind, ind);
    }
    if (elem.child && elem.child.length) {
        this._dialogTreeTable.expand(ind);
        for (var i=0, ilen=elem.child.length; i<ilen; i++) {
            this.unselectElements(elem.child[i]);
        }
    }
}

//отображение колонки "код"
zcust.controls.CommonHierInput.prototype.setHideHelpKeyField = function(value) {
    this._dialogTreeTable.getColumns()[1].setVisible(!value);
    this.setProperty('hideHelpKeyField', value);
};

//отображение кнопки "выбраться все вложенные"
zcust.controls.CommonHierInput.prototype.setHideHelpIncludeBtn = function(value) {
    this._dialogTreeTable.getColumns()[0].setVisible(!value);
    this.setProperty('hideHelpIncludeBtn', value);
};

/**
 * Handle select suggestion item id org unit dialog select
 */
zcust.controls.CommonHierInput.prototype.tokenDialogSuggestionHandle =
    function(evt) {
        var row = evt.getParameter('selectedRow');
        var input = evt.getSource();

        //стираем выбранное значение
        input.setValue();

        var context = row.getBindingContext('__hierSourceFlat');
        var elem = context.oModel.getProperty(context.sPath);
        // var elem = this.getElemFromRow(row);

        this.addElementToDialog(elem);
    };

/**
 * Unselect row in the table associated with deleted token
 */
zcust.controls.CommonHierInput.prototype.dialogTokenChange =
    function(evt) {
        var params = evt.getParameters();
        //удаляем конкретно значение из выбранных (по индексу)
        if (params.type === "removed") {
            var index = params.token.data("index");
            // в новой версии sapui5 - сначала частично удаляется token (отсутствует 'data')
            if (index === null) {
            	index = this.getTableIndexByKey(params.token.getKey(), this._dialogTreeTable);
            }
            this._dialogTreeTable.removeSelectionInterval(index, index);
        }
    }

/**
 * Select org hier element in dialog
 */
zcust.controls.CommonHierInput.prototype._handleSelectRow =
    function(evt) {
        if (this.__shouldntUpdateTokens) {
            return;
        }
        var table = evt.getSource();

        var arr = table.getSelectedIndices();
        var tokens = [];
        var selectedSource = [];

        var field = !this.getHierMultiFields() ? this.getField() : undefined;

        for (var i = 0, ilen = arr.length; i < ilen; i++) {
            var context = table.getContextByIndex(arr[i]);
            var elem = context.oModel.getProperty(context.sPath);
            selectedSource.push(elem);
            tokens.push(new sap.m.Token({
                key: elem.key,
                text: elem.name
            }).data("index", arr[i]).data("field", field ? field : elem.field));
        }

        //@todo: вынести!
        // записываем выбранные значения
        // model = evt.getSource().getModel('orgUnitOptions');
        // model.setProperty('/tokens', selectedSource);

        this._dialogMultiInput.setTokens(tokens);
    };

/**
 * Clear selection in org hier table
 */
zcust.controls.CommonHierInput.prototype.clearSelected =
    function(evt) {
        this._dialogTreeTable.clearSelection();
        //очистка токенов
        this._dialogMultiInput.removeAllTokens();
    }

/**
 * Close org hier select dialog
 */
zcust.controls.CommonHierInput.prototype.handleDialogClose =
    function(evt) {
        // применяем выбранные значения
        var tokens = this._dialogMultiInput.getTokens().map(function(token) {
            return new sap.m.Token({
                key: token.getKey(),
                text: token.getText()
            }).data("field", token.data("field"));
        });
        //@todo: _bSuppressEvent вынести или продумать как корректнее не обновлять
        this._bSuppressEvents = true;
        this.setTokens(tokens);
        this._bSuppressEvents = false;

        var selected = tokens.map(function(token) {
            return {
                key: token.getKey(),
                field: token.data("field")
            };
        });
        this._orgHierDialog.close();

        // обновление глобальной модели
        this.fireSelectChanged({selected:selected, fields:this.getFields()});
    };


/**
 * Open OrgUnit Hier Dialog
 */
zcust.controls.CommonHierInput.prototype.onValueHelpHier =
    function() {
        this.fireBeforeDialogOpen();

        jQuery.sap.delayedCall(0, this, function() {
            this._orgHierDialog.open();
            this._dialogMultiInput.focus();
        });
    };


/**
 * Select orgunit-element in hint
 */
zcust.controls.CommonHierInput.prototype.selectSuggestItem =
    function(evt) {
        var row = evt.getParameter('selectedRow');
        var input = evt.getSource();

        //стираем выбранное значение
        input.setValue();

        // var context = row.getBindingContext('__hierSourceFlat');
        // var elem = context.oModel.getProperty(context.sPath);
        var elem = this.getElemFromRow(row);

        //проверка на дубликат!
        if (input.getTokens().some(function(token) {
                return token.getKey() === elem.key
            }))
            return;

        var field = !this.getHierMultiFields() ? this.getField() : undefined;

        var token = new sap.m.Token({
            key: elem.key,
            text: elem.name
        }).data("field", field ? field : elem.field);
        input.addToken(token);

        this.addElementToDialog(elem);
    }


/**
 * Select orgunit-element in hint
 */
zcust.controls.CommonHierInput.prototype.handleTokenChange =
    function(evt) {
        var params = evt.getParameters();

        var selected = this.getTokens().map(function(token) {
            return {
                key: token.getKey(),
                field: token.data("field")
            };
        });

        // обновление глобальной модели
        if (!this._bSuppressEvents && params.type !== "removed") {
            this.fireSelectChanged({selected:selected, fields:this.getFields()});
        }

        if (params.type === "removed") {
            setTimeout(function() {
                var elem = {
                    key: params.token.getKey()
                };
                var index = this.getTableIndex(elem, this._dialogTreeTable);
                if (index !== -1)
                    this._dialogTreeTable.removeSelectionInterval(index, index);
                else
                    this.getLogger().warning("Didn't find table element for removing");

            }.bind(this));

        }
    }

/**
 * Add orgUnit element to tokenizer, table (dialog)
 */
zcust.controls.CommonHierInput.prototype.addElementToDialog =
    function(elem) {
        //получаем список родителей
        var parents = [];
        var parent = elem.parent;
        while (parent) {
            parents.unshift(parent);
            parent = parent.parent;
        }

        var table = this._dialogTreeTable;
        //раскрываем все родительские узлы
        for (var i = 0, ilen = parents.length; i < ilen; i++) {
            var ind = this.getTableIndex(parents[i], table);
            table.expand(ind);
        }

        //выбираем в таблице (и записываем индекс)
        var i = this.getTableIndex(elem);
        if (i !== -1) {
            table.addSelectionInterval(i, i);
            this.dialogTableScroll2Index(i);
        } else {
            this.getLogger().warning("Didn't find table element for choosing");
        }

    };

/**
 * Scroll to index
 * @params {Integer} index table index
 */
zcust.controls.CommonHierInput.prototype.dialogTableScroll2Index = function(index) {
    if (typeof index !== 'number') {
        return;
    }
    var t = this._dialogTreeTable;
    // try {

    // } catch(){};
    var source = t._getScrollTop();
    if (source < index) {
        var count = index - source;
        for (;count>0;count--){
            t._scrollNext();
        }

    } else if (source > index) {
        var count = source - index;
        for (;count>0;count--){
            t._scrollPrevious();
        }
    }
};

/**
 * Get table index by object (for select Dialog treetable)
 */
zcust.controls.CommonHierInput.prototype.getTableIndex =
    function(data, table) {
        if (typeof table === 'undefined') {
            table = this._dialogTreeTable;
        }

        var i = 0;
        if (!data) {
            return -1;
        }

        while (true) {
            var context = table.getContextByIndex(i);
            if (!context) {
                return -1;
            }
            var targetData = context.oModel.getProperty(context.sPath);
            if (targetData && targetData.key === data.key) {
                return i;
            }
            i++;
        }
    }

/**
 * Get table index by key (for select Dialog treetable)
 */
zcust.controls.CommonHierInput.prototype.getTableIndexByKey =
    function(key, table) {
        if (typeof table === 'undefined')
            table = this._dialogTreeTable;

        var i = 0;
        if (!key) return -1;

        while (true) {
            var context = table.getContextByIndex(i);
            if (!context) return -1;
            var targetData = context.oModel.getProperty(context.sPath);
            if (targetData && targetData.key === key)
                return i;
            i++;
        }
    }
