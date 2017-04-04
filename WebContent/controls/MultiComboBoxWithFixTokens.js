/*!
 * (c) Copyright AO BDO 2015-2016. All rights reserved
 */
/**
 * @require sap.m.MultiComboBox
 * @require sap.m.MultiComboBoxRenderer
 * @require sap.m.ComboBoxBaseRenderer
 * @require sap.m.Token
 */

sap.ui.define([
  'sap/m/MultiComboBox',
  'sap/m/MultiComboBoxRenderer',
  'sap/m/ComboBoxBaseRenderer',
  'sap/m/Token'
  ],  function(MultiComboBox, MultiComboBoxRenderer, ComboBoxBaseRenderer, Token) {
    "use strict";

  /**
   * combobox that able to suggest items by key
   *
   * @class zcust.controls.MultiComboBoxWithFixTokens
   * @extends sap.m.MultiComboBox
   *
   * @author Voronin Sergey <s.voroonin@bdo.ru>
   */

  return MultiComboBox.extend('tepaup.controls.MultiComboBoxWithFixTokens', {

    _fillList: function (aItems) {
      if (!aItems) {
        return null;
      }

      if (!this._oListItemEnterEventDelegate) {
        this._oListItemEnterEventDelegate = {
          onsapenter: function(oEvent) {
            // If ListItem is already selected,
            // prevent its de-selection, according to Keyboard Handling Specification.
            if (oEvent.srcControl.isSelected()) {
              oEvent.setMarked();
            }
          }
        };
      }

      /* @zend добавляем токены */
      var oSelBinding = this.getBinding('selectedKeys');
      var oModel = oSelBinding.getModel();
      var aSelectedKeys = oModel.getProperty(oSelBinding.getPath());
      var oKeys = {};

      if (aSelectedKeys.length) {
        for (var j = 0; j < aSelectedKeys.length; j++) {
          var sKey = aSelectedKeys[j];
          if (sKey) {
            var oLItem = this.getItemByKey(sKey);
            if (oLItem) {
              var oToken = new sap.m.Token({
                key : oLItem.getKey(),
                text : oLItem.getText(),
                tooltip : oLItem.getText()
              });
              oLItem.data(ComboBoxBaseRenderer.CSS_CLASS_COMBOBOXBASE + "Token", oToken);
              this._oTokenizer.addToken(oToken);
            }
          }
        }
      }
      /* @z */

      for ( var i = 0, oListItem, aItemsLength = aItems.length; i < aItemsLength; i++) {
        // add a private property to the added item containing a reference
        // to the corresponding mapped item
        oListItem = this._mapItemToListItem(aItems[i]);

        // remove the previous event delegate
        oListItem.removeEventDelegate(this._oListItemEnterEventDelegate);

        // add the sap enter event delegate
        oListItem.addDelegate(this._oListItemEnterEventDelegate, true, this, true);

        // add the mapped item type of sap.m.StandardListItem to the list
        this.getList().addAggregation("items", oListItem, true);

        // add active state to the selected item
        if (this.isItemSelected(aItems[i])) {
          this.getList().setSelectedItem(oListItem, true);
        }
      }
    },

    _mapItemToListItem: function (oItem) {
      if (!oItem) {
        return null;
      }

      var sListItem = MultiComboBoxRenderer.CSS_CLASS_MULTICOMBOBOX + "Item";
      var sListItemSelected = (this.isItemSelected(oItem)) ? sListItem + "Selected" : "";
      var oListItem = new sap.m.StandardListItem({
        title : oItem.getText(),
        type : sap.m.ListType.Active,
        visible : oItem.getEnabled()
      }).addStyleClass(sListItem + " " + sListItemSelected);
      oListItem.setTooltip(oItem.getTooltip());
      oItem.data(ComboBoxBaseRenderer.CSS_CLASS_COMBOBOXBASE + "ListItem", oListItem);

      /* @zend так токены ставятся не в том порядке */
      /*if (sListItemSelected) {
        var oToken = new sap.m.Token({
          key : oItem.getKey(),
          text : oItem.getText(),
          tooltip : oItem.getText()
        });
        oItem.data(ComboBoxBaseRenderer.CSS_CLASS_COMBOBOXBASE + "Token", oToken);
        this._oTokenizer.addToken(oToken);
      }*/
      /* @z */

      this.setSelectable(oItem, oItem.getEnabled());
      this._decorateListItem(oListItem);
      return oListItem;
    },

    renderer: {},

  });

});
