jQuery.sap.declare("zcust.controls.orgHierControl"),jQuery.sap.require("sap.m.MultiInput"),jQuery.sap.require("sap.ui.table.TreeTable"),jQuery.sap.require("sap.ui.commons.Label"),jQuery.sap.require("sap.ui.commons.TextField"),sap.m.MultiInput.extend("zcust.controls.orgHierControl",{metadata:{events:{selectChanged:{},beforeDialogOpen:{}}},renderer:{}}),zcust.controls.orgHierControl.prototype.init=function(a){sap.m.MultiInput.prototype.init.apply(this,arguments),this.createValueHelpDialog();var b=new sap.m.ColumnListItem({cells:[new sap.m.Label({text:"{orgUnitSourceFlat>key}"}),new sap.m.Label({text:"{orgUnitSourceFlat>name}"})]});this.attachValueHelpRequest(this.onValueHelpOrgHier.bind(this)),this.setShowSuggestion(!0),this.attachSuggestionItemSelected(this.selectOrgUnit.bind(this)),this.attachTokenChange(this.onChangeOrgUnit.bind(this)),this.bindSuggestionRows("orgUnitSourceFlat>/",b),this.addSuggestionColumn(new sap.m.Column({hAlign:"Begin",popinDisplay:"Inline",demandPopin:!0,header:new sap.m.Label({text:"Код",width:"100%"})})),this.addSuggestionColumn(new sap.m.Column({hAlign:"Begin",popinDisplay:"Inline",demandPopin:!0,header:new sap.m.Label({text:"Наименование",width:"100%"})})),this._oSuggestionTable.setGrowingThreshold(800),this._oSuggestionTable.setGrowing(!0),this.setFilterFunction(function(a,b){function c(b){return b.getText().match(new RegExp(a,"i"))}return b.getCells().some(c)})},zcust.controls.orgHierControl.prototype.createValueHelpDialog=function(){this._dialogMultiInput=new sap.m.MultiInput({width:"95%",tooltip:"Выбранные значения",showSuggestion:!0,suggestionRows:{path:"orgUnitSourceFlat>/",template:new sap.m.ColumnListItem({cells:[new sap.m.Label({text:"{orgUnitSourceFlat>key}"}),new sap.m.Label({text:"{orgUnitSourceFlat>name}"})]})},showValueHelp:!1,suggestionItemSelected:this.orgUnitTokenDialogSuggestionHandle.bind(this),tokenChange:this.orgUnitDialogTokenChange.bind(this),suggestionColumns:[new sap.m.Column({hAlign:"Begin",popinDisplay:"Inline",demandPopin:!0,header:new sap.m.Label({text:"Код"})}),new sap.m.Column({hAlign:"Begin",popinDisplay:"Inline",demandPopin:!0,header:new sap.m.Label({text:"Наименование"})})]}).addStyleClass("width74"),this._dialogMultiInput._oSuggestionTable.setGrowingThreshold(800),this._dialogMultiInput._oSuggestionTable.setGrowing(!0),this._dialogMultiInput.setFilterFunction(function(a,b){function c(b){return b.getText().match(new RegExp(a,"i"))}return b.getCells().some(c)}),this._dialogTreeTable=new sap.ui.table.TreeTable({expandFirstLevel:!0,selectionMode:"MultiToggle",selectionBehavior:"Row",rowSelectionChange:this.handleSelectOrgUnit.bind(this),rows:"{orgUnitSource>/}",columns:[new sap.ui.table.Column({width:"20%",label:new sap.ui.commons.Label({text:"Код"}),template:new sap.ui.commons.TextField({value:"{orgUnitSource>key}",editable:!1})}),new sap.ui.table.Column({width:"80%",label:new sap.ui.commons.Label({text:"Наименование"}),template:new sap.ui.commons.TextField({value:"{orgUnitSource>name}",editable:!1,width:"100%"})})],toolbar:new sap.m.Toolbar({content:[this._dialogMultiInput,new sap.m.Button({icon:"sap-icon://decline",tooltip:"Очистить выбранные значения",press:this.clearSelectedOrgHier.bind(this)})]}).addStyleClass("width80")}),this._orgHierDialog=new sap.m.Dialog({title:"Выбор орг. единицы",content:[this._dialogTreeTable],endButton:new sap.m.Button({text:"OK",press:this.orgUnitDialogClose.bind(this)})}).addStyleClass("sapUiPopupWithPadding width80"),this.addDependent(this._orgHierDialog)},zcust.controls.orgHierControl.prototype.orgUnitTokenDialogSuggestionHandle=function(a){var b=a.getParameter("selectedRow"),c=a.getSource();c.setValue();var d=b.getBindingContext("orgUnitSourceFlat"),e=d.oModel.getProperty(d.sPath);this.addOrgUnitTokenDialog(e)},zcust.controls.orgHierControl.prototype.orgUnitDialogTokenChange=function(a){var b=a.getParameters();if("removed"===b.type){var c=b.token.data("index");this._dialogTreeTable.removeSelectionInterval(c,c)}},zcust.controls.orgHierControl.prototype.handleSelectOrgUnit=function(a){for(var b=a.getSource(),c=b.getSelectedIndices(),d=[],e=[],f=0,g=c.length;g>f;f++){var h=b.getContextByIndex(c[f]),i=h.oModel.getProperty(h.sPath);e.push(i),d.push(new sap.m.Token({key:i.key,text:i.name}).data("index",c[f]).data("level",i.level))}model=a.getSource().getModel("orgUnitOptions"),model.setProperty("/tokens",e),this._dialogMultiInput.setTokens(d)},zcust.controls.orgHierControl.prototype.clearSelectedOrgHier=function(a){this._dialogTreeTable.clearSelection(),this._dialogMultiInput.removeAllTokens()},zcust.controls.orgHierControl.prototype.orgUnitDialogClose=function(a){var b=this._dialogMultiInput.getTokens().map(function(a){return new sap.m.Token({key:a.getKey(),text:a.getText()}).data("level",a.data("level"))});this._bSuppressEvents=!0,this.setTokens(b),this._bSuppressEvents=!1;var c=b.map(function(a){return{key:a.getKey(),level:a.data("level")}});this._orgHierDialog.close(),this.fireSelectChanged({selected:c})},zcust.controls.orgHierControl.prototype.onValueHelpOrgHier=function(){this.fireBeforeDialogOpen(),jQuery.sap.delayedCall(0,this,function(){this._orgHierDialog.open()})},zcust.controls.orgHierControl.prototype.selectOrgUnit=function(a){var b=a.getParameter("selectedRow"),c=a.getSource();c.setValue();var d=b.getBindingContext("orgUnitSourceFlat"),e=d.oModel.getProperty(d.sPath);if(!c.getTokens().some(function(a){return a.getKey()===e.key})){var f=new sap.m.Token({key:e.key,text:e.name}).data("level",e.level);c.addToken(f),this.addOrgUnitTokenDialog(e)}},zcust.controls.orgHierControl.prototype.onChangeOrgUnit=function(a){var b=a.getParameters(),c=this.getTokens().map(function(a){return{key:a.getKey(),level:a.data("level")}});this._bSuppressEvents||"removed"===b.type||this.fireSelectChanged({selected:c}),"removed"===b.type&&setTimeout(function(){var a={key:b.token.getKey()},c=this.getTableIndex(a,this._dialogTreeTable);-1!==c?this._dialogTreeTable.removeSelectionInterval(c,c):this.getLogger().warning("Didn't find table element for removing")}.bind(this))},zcust.controls.orgHierControl.prototype.addOrgUnitTokenDialog=function(a){for(var b=[],c=a.parent;c;)b.unshift(c),c=c.parent;for(var d=this._dialogTreeTable,e=0,f=b.length;f>e;e++){var g=this.getTableIndex(b[e],d);d.expand(g)}var e=this.getTableIndex(a);-1!==e?d.addSelectionInterval(e,e):this.getLogger().warning("Didn't find table element for choosing")},zcust.controls.orgHierControl.prototype.getTableIndex=function(a,b){"undefined"==typeof b&&(b=this._dialogTreeTable);var c=0;if(!a)return-1;for(;;){var d=b.getContextByIndex(c);if(!d)return-1;var e=d.oModel.getProperty(d.sPath);if(e&&e.key===a.key)return c;c++}};