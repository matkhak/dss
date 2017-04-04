/*!
 * (c) Copyright AO BDO 2015. All rights reserved
 */
sap.ui.define([
  'sap/ui/comp/filterbar/FilterBar',
  'sap/ui/layout/HorizontalLayout',
  'sap/m/Button',
  'sap/m/ButtonType',
], function (FilterBar, HorizontalLayout, Button, ButtonType) {
  'use strict';

  var zFilterBar = FilterBar.extend('tepaup.modules.top.controls.FilterBar', {
    metadata: {},

    /**
     * Basic init, call super
     */
    init: function () {
      // call super.init()
      FilterBar.prototype.init.apply(this, arguments);

      this.removeAllContent();

      this._oBasicAreaLayout.addStyleClass('filterBar__BasicArea');
      this.addContent(this._oBasicAreaLayout);

      this._oToolbar
        .setWidth('auto')
        .addStyleClass('filterBar__Toolbar');
      this.addContent(this._oToolbar);

      this._oHideShowButton.setVisible(false);

      this.addStyleClass('filterBar');
    },

    _createButtons: function () {
      var that = this;

      var oButtonsLayout = new HorizontalLayout();

      this._oSearchButton = new Button({
        visible: true,
        icon: 'sap-icon://accept',
        text: 'Применить',
        tooltip: 'Применить фильтры',
        type: ButtonType.Default
      }).addStyleClass('filterBar__searchButton');
      
      this._oSearchButton.attachPress(function () {
        that.search();
      });
      oButtonsLayout.addContent(this._oSearchButton);

      // Reset
      this._oRestoreButtonOnFB = new Button({
        visible: true,
        icon: 'sap-icon://delete',
        tooltip: 'Очистить фильтры',
        type: ButtonType.Reject
      });
      this._oRestoreButtonOnFB.attachPress(function () {
        that.reset();
      });

      oButtonsLayout.addContent(this._oRestoreButtonOnFB);

      // some bTn from new version of sapui5
      this._oHideShowButton = new Button();
      this._oClearButtonOnFB = new Button();
      this._oFiltersButton = new Button();

      return oButtonsLayout;
    },

    /* @stub */
    setFilterBarExpanded: function (bShowExpanded) {
      var bExpanded = this._isPhone() ? false : bShowExpanded;

      this.setProperty('filterBarExpanded', bExpanded);

      if (this._isPhone()) {
        this._oHideShowButton.setVisible(false);
        this._oSearchButton.setVisible(this.getShowGoOnFB());

        if (this.getAdvancedMode()) {
          this._oBasicAreaLayout.setVisible(true); // contains the basic search field
        } else {
          this._oBasicAreaLayout.setVisible(false);
        }
      } else {
        if (bExpanded) {
          this._oHideShowButton.setTooltip(this._oRb.getText('FILTER_BAR_HIDE'));
          this._oHideShowButton.setIcon('sap-icon://arrow-top');
        } else {
          this._oHideShowButton.setTooltip(this._oRb.getText('FILTER_BAR_SHOW'));
          this._oHideShowButton.setIcon('sap-icon://arrow-bottom');
        }
        this._oHideShowButton.setVisible(true);
        this._oSearchButton.setVisible(this.getShowGoOnFB());
        this._oBasicAreaLayout.setVisible(bExpanded);
      }

      this._updateToolbarText();
    },

    /**
     * updates the filters-button text with the count of filters with values
     *
     * @private
     */
    _updateToolbarText: function () {
      /* @z */
      /* @zend */
    },

    renderer: {},
  });

  return zFilterBar;

});
